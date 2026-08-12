import { Middleware, AnyAction, Dispatch } from '@reduxjs/toolkit';
import { 
  pushSnapshot, 
  setRestoring,
  HistorySnapshot 
} from './historySlice';
import { loadSavedState } from './dependencySlice';
import { loadRecipeSelections } from './recipeSelectionsSlice';
import { logger } from '../../../utils/logger';

interface ActiveTransaction {
  description: string;
  snapshot: HistorySnapshot | null;
  startTime: number;
}

interface PendingTransaction {
  description: string;
  snapshot: HistorySnapshot;
  startTime: number;
}

interface RootState {
  dependencies: unknown;
  recipeSelections: { selections: Record<string, string> };
  comparison: {
    activeSnapshot: unknown | null;
    showComparison: boolean;
  };
  history: {
    isRestoring: boolean;
    undoStack: HistorySnapshot[];
    redoStack: HistorySnapshot[];
    pendingTransaction: PendingTransaction | null;
  };
}

const TRACKED_ACTIONS: Record<string, string | ((action: AnyAction) => string)> = {
  'dependencies/setDependencies': 'Update dependency tree',
  'dependencies/deleteTree': 'Delete production tree',
  'dependencies/updateNodeProperties': 'Update node properties',
  'dependencies/toggleNodeSelected': 'Toggle node selection',
  'dependencies/toggleNodeCompleted': 'Toggle node completion',
  'dependencies/toggleNodeHidden': 'Toggle node visibility',
  'dependencies/setNodeMachineCount': 'Set machine count',
  'dependencies/setNodeMachineMultiplier': 'Set machine multiplier',
  'dependencies/setNodeExcess': 'Set node excess',
  'dependencies/updateExcessProduction': 'Update excess production',
  'dependencies/updateForcedProduction': 'Update forced production',
  'dependencies/updateImportedProduction': 'Update imported production',
  'dependency/importNode': 'Import node',
  'dependency/removeNode': 'Remove node',
  'dependency/setExcess': 'Set excess',
  'recipeSelections/setRecipeSelection': 'Change recipe selection',
  'recipeSelections/clearRecipeSelections': 'Clear all recipe selections',
  'comparison/storeSnapshot': 'Store comparison snapshot',
  'comparison/clearSnapshot': 'Clear comparison snapshot',
  'comparison/updateSnapshotTree': 'Update snapshot tree',
  'comparison/removeSnapshotTree': 'Remove snapshot tree',
};

const IGNORED_ACTIONS: string[] = [
  'history/pushSnapshot',
  'history/popUndo',
  'history/popRedo',
  'history/setRestoring',
  'history/clearHistory',
  'history/setMaxStackSize',
  'history/beginTransaction',
  'history/commitTransaction',
  'history/cancelTransaction',
  'treeUi/setExpandedNodes',
  'comparison/toggleComparisonDisplay',
  'comparison/setComparisonDisplay',
  'dependencies/setHighlightedNode',
  'dependencies/setManualTreeOrder',
  'data/setDataLoaded',
  'data/setInitialLoadComplete',
  'dependencies/loadSavedState',
  'recipeSelections/loadRecipeSelections',
];

function getActionDescription(action: AnyAction): string {
  const mapper = TRACKED_ACTIONS[action.type];
  if (typeof mapper === 'function') {
    return mapper(action);
  }
  return mapper || action.type;
}

function shouldTrackAction(action: AnyAction): boolean {
  if (IGNORED_ACTIONS.includes(action.type)) {
    return false;
  }
  return action.type in TRACKED_ACTIONS;
}

function createSnapshot(
  state: RootState, 
  actionDescription: string
): HistorySnapshot {
  return {
    timestamp: Date.now(),
    actionDescription,
    dependencies: JSON.parse(JSON.stringify(state.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(state.comparison)),
  };
}

export interface HistoryMiddlewareAPI {
  middleware: Middleware<object, RootState, Dispatch<AnyAction>>;
  isInTransaction: () => boolean;
  undoAction: () => (dispatch: Dispatch, getState: () => RootState) => boolean;
  redoAction: () => (dispatch: Dispatch, getState: () => RootState) => boolean;
  beginHistoryTransaction: (description: string) => (dispatch: Dispatch, getState: () => RootState) => boolean;
  commitHistoryTransaction: () => (dispatch: Dispatch, getState: () => RootState) => boolean;
  cancelHistoryTransaction: () => (dispatch: Dispatch, getState: () => RootState) => boolean;
  withHistoryTransaction: <T>(description: string, fn: () => Promise<T> | T) => (dispatch: Dispatch, getState: () => RootState) => Promise<T>;
}

export function createHistoryMiddleware(): HistoryMiddlewareAPI {
  let activeTransaction: ActiveTransaction | null = null;

  function isInTransaction(): boolean {
    return activeTransaction !== null;
  }

  const historyMiddleware: Middleware<object, RootState, Dispatch<AnyAction>> = 
    (store) => (next) => (action: unknown) => {
      const typedAction = action as AnyAction;
      
      if (!shouldTrackAction(typedAction)) {
        return next(typedAction);
      }
      
      const currentState = store.getState();
      if (currentState.history?.isRestoring) {
        return next(typedAction);
      }
      
      if (activeTransaction !== null) {
        console.log(`[History] ⏸️ Skipping (in transaction "${activeTransaction.description}"): ${typedAction.type}`);
        return next(typedAction);
      }
      
      const preActionState = currentState;
      const description = getActionDescription(typedAction);
      const snapshot = createSnapshot(preActionState, description);
      
      const result = next(typedAction);
      
      store.dispatch(pushSnapshot(snapshot));
      console.log(`[History] 📸 Recorded action: ${typedAction.type} as "${description}"`);
      console.log(`[History] 📚 Undo stack size: ${store.getState().history.undoStack.length}`);
      
      logger.debug(`[HistoryMiddleware] Recorded: ${description}`);
      
      return result;
    };

  const undoAction = () => (dispatch: Dispatch, getState: () => RootState): boolean => {
    const state = getState();
    const { undoStack } = state.history;
    
    if (undoStack.length === 0) {
      logger.warn('[Undo] Nothing to undo');
      return false;
    }
    
    const snapshotToRestore = undoStack[undoStack.length - 1];
    
    const currentSnapshot: HistorySnapshot = {
      timestamp: Date.now(),
      actionDescription: snapshotToRestore.actionDescription,
      dependencies: JSON.parse(JSON.stringify(state.dependencies)),
      recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
      comparison: JSON.parse(JSON.stringify(state.comparison)),
    };
    
    dispatch(setRestoring(true));
    
    try {
      dispatch({ 
        type: 'history/undoStackPop',
        payload: { currentSnapshot }
      });
      
      if (snapshotToRestore.dependencies) {
        dispatch(loadSavedState(snapshotToRestore.dependencies as Parameters<typeof loadSavedState>[0]));
      }
      if (snapshotToRestore.recipeSelections) {
        dispatch(loadRecipeSelections(snapshotToRestore.recipeSelections.selections));
      }
      
      logger.info(`[Undo] Restored: ${snapshotToRestore.actionDescription}`);
      return true;
    } finally {
      dispatch(setRestoring(false));
    }
  };

  const redoAction = () => (dispatch: Dispatch, getState: () => RootState): boolean => {
    const state = getState();
    const { redoStack } = state.history;
    
    if (redoStack.length === 0) {
      logger.warn('[Redo] Nothing to redo');
      return false;
    }
    
    const snapshotToRestore = redoStack[redoStack.length - 1];
    
    const currentSnapshot: HistorySnapshot = {
      timestamp: Date.now(),
      actionDescription: snapshotToRestore.actionDescription,
      dependencies: JSON.parse(JSON.stringify(state.dependencies)),
      recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
      comparison: JSON.parse(JSON.stringify(state.comparison)),
    };
    
    dispatch(setRestoring(true));
    
    try {
      dispatch({ 
        type: 'history/redoStackPop',
        payload: { currentSnapshot }
      });
      
      if (snapshotToRestore.dependencies) {
        dispatch(loadSavedState(snapshotToRestore.dependencies as Parameters<typeof loadSavedState>[0]));
      }
      if (snapshotToRestore.recipeSelections) {
        dispatch(loadRecipeSelections(snapshotToRestore.recipeSelections.selections));
      }
      
      logger.info(`[Redo] Restored: ${snapshotToRestore.actionDescription}`);
      return true;
    } finally {
      dispatch(setRestoring(false));
    }
  };

  const beginHistoryTransaction = (description: string) => 
    (_dispatch: Dispatch, getState: () => RootState): boolean => {
      const state = getState();
      
      if (state.history.isRestoring) {
        console.log(`[History] ⚠️ Cannot start transaction "${description}" - currently restoring`);
        return false;
      }
      
      if (activeTransaction !== null) {
        console.log(`[History] ⚠️ Already in transaction "${activeTransaction.description}", skipping nested "${description}"`);
        return false;
      }
      
      const snapshot = createSnapshot(state, description);
      
      activeTransaction = {
        description,
        snapshot,
        startTime: Date.now(),
      };
      
      console.log(`[History] 🔓 Transaction STARTED: "${description}"`);
      return true;
    };

  const commitHistoryTransaction = () => 
    (dispatch: Dispatch, _getState: () => RootState): boolean => {
      if (activeTransaction === null) {
        console.warn('[History] ⚠️ No active transaction to commit');
        return false;
      }
      
      const { description, snapshot, startTime } = activeTransaction;
      const duration = Date.now() - startTime;
      
      if (snapshot) {
        dispatch(pushSnapshot(snapshot));
      }
      
      activeTransaction = null;
      
      console.log(`[History] 🔒 Transaction COMMITTED: "${description}" (${duration}ms)`);
      console.log(`[History] 📚 Undo stack size: ${_getState().history.undoStack.length}`);
      return true;
    };

  const cancelHistoryTransaction = () => 
    (_dispatch: Dispatch, _getState: () => RootState): boolean => {
      if (activeTransaction === null) {
        return false;
      }
      
      const { description } = activeTransaction;
      
      activeTransaction = null;
      
      console.log(`[History] ❌ Transaction CANCELLED: "${description}"`);
      return true;
    };

  const withHistoryTransaction = <T>(
    description: string,
    fn: () => Promise<T> | T
  ) => async (dispatch: Dispatch, getState: () => RootState): Promise<T> => {
    if (activeTransaction !== null) {
      return await fn();
    }
    
    const thunkDispatch = dispatch as Dispatch & ((thunk: (dispatch: Dispatch, getState: () => RootState) => unknown) => unknown);
    const transactionStarted = thunkDispatch(beginHistoryTransaction(description));
    
    if (!transactionStarted) {
      return await fn();
    }
    
    try {
      const result = await fn();
      thunkDispatch(commitHistoryTransaction());
      return result;
    } catch (error) {
      thunkDispatch(cancelHistoryTransaction());
      throw error;
    }
  };

  return {
    middleware: historyMiddleware,
    isInTransaction,
    undoAction,
    redoAction,
    beginHistoryTransaction,
    commitHistoryTransaction,
    cancelHistoryTransaction,
    withHistoryTransaction,
  };
}

const defaultInstance = createHistoryMiddleware();
export const historyMiddleware = defaultInstance.middleware;
export const isInTransaction = defaultInstance.isInTransaction;
export const undoAction = defaultInstance.undoAction;
export const redoAction = defaultInstance.redoAction;
export const beginHistoryTransaction = defaultInstance.beginHistoryTransaction;
export const commitHistoryTransaction = defaultInstance.commitHistoryTransaction;
export const cancelHistoryTransaction = defaultInstance.cancelHistoryTransaction;
export const withHistoryTransaction = defaultInstance.withHistoryTransaction;

export default historyMiddleware;
