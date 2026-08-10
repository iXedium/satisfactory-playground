import { Middleware, AnyAction, Dispatch } from '@reduxjs/toolkit';
import { 
  pushSnapshot as pushRootSnapshot, 
  setRestoring as setRootRestoring,
  HistorySnapshot 
} from './historySlice';
import { loadSavedState } from './dependencySlice';
import { loadRecipeSelections } from './recipeSelectionsSlice';
import { logger } from '../../../utils/logger';

// --- Per-tab transaction state ---

interface ActiveTransaction {
  description: string;
  snapshot: HistorySnapshot | null;
  startTime: number;
}

const transactions = new Map<string, ActiveTransaction>();

function getActiveTransaction(tabId: string): ActiveTransaction | null {
  return transactions.get(tabId) || null;
}

function setActiveTransaction(tabId: string, tx: ActiveTransaction): void {
  transactions.set(tabId, tx);
}

function clearActiveTransaction(tabId: string): void {
  transactions.delete(tabId);
}

// --- Legacy module-level transaction (for non-tab actions) ---

let activeTransaction: ActiveTransaction | null = null;

export function isInTransaction(): boolean {
  return activeTransaction !== null || transactions.size > 0;
}

// --- Types ---

// --- Action Type Mappings ---

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
  'history/pushSnapshot', 'history/popUndo', 'history/popRedo',
  'history/setRestoring', 'history/clearHistory', 'history/setMaxStackSize',
  'history/beginTransaction', 'history/commitTransaction', 'history/cancelTransaction',
  'treeUi/setExpandedNodes',
  'comparison/toggleComparisonDisplay', 'comparison/setComparisonDisplay',
  'dependencies/setHighlightedNode', 'dependencies/setManualTreeOrder',
  'data/setDataLoaded', 'data/setInitialLoadComplete',
  'recipeSelections/loadRecipeSelections',
  '_planner/beginOperation', '_planner/endOperation',
];

function shouldTrackAction(action: AnyAction): boolean {
  if (IGNORED_ACTIONS.includes(action.type)) return false;
  return action.type in TRACKED_ACTIONS;
}

function getActionDescription(action: AnyAction): string {
  const entry = TRACKED_ACTIONS[action.type];
  if (!entry) return action.type;
  return typeof entry === 'function' ? entry(action) : entry;
}

function getTabId(action: AnyAction): string | null {
  return (action as any)?.meta?.tabId || null;
}

function createSnapshot(state: any, description: string, tabId?: string): HistorySnapshot | null {
  if (tabId) {
    const planner = state.planners?.[tabId];
    if (!planner) return null;
    return {
      timestamp: Date.now(),
      actionDescription: description,
      dependencies: JSON.parse(JSON.stringify(planner.dependencies)),
      recipeSelections: JSON.parse(JSON.stringify(planner.recipeSelections)),
      comparison: JSON.parse(JSON.stringify(planner.comparison)),
    };
  }
  return {
    timestamp: Date.now(),
    actionDescription: description,
    dependencies: JSON.parse(JSON.stringify(state.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(state.comparison)),
  };
}

// --- Middleware ---

export const historyMiddleware: Middleware<object, any, Dispatch<AnyAction>> = 
  (store) => (next) => (action: unknown) => {
    const typedAction = action as AnyAction;
    
    if (!shouldTrackAction(typedAction)) {
      return next(typedAction);
    }

    const currentState = store.getState();
    const tabId = getTabId(typedAction);

    if (tabId) {
      // Per-tab routing
      const planner = currentState.planners?.[tabId];
      if (!planner) return next(typedAction);

      if (planner.history?.isRestoring) {
        return next(typedAction);
      }

      if (getActiveTransaction(tabId)) {
        console.log(`[History:${tabId}] ⏸️ Skipping (in transaction): ${typedAction.type}`);
        return next(typedAction);
      }

      const preActionState = currentState;
      const description = getActionDescription(typedAction);
      const snapshot = createSnapshot(preActionState, description, tabId);

      const result = next(typedAction);

      if (snapshot) {
        store.dispatch({ 
          type: '_planner/pushSnapshot', 
          payload: { snapshot },
          meta: { tabId },
        } as AnyAction);
      }
      return result;
    }

    // Legacy root-level routing (unchanged)
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

    if (snapshot) {
      store.dispatch(pushRootSnapshot(snapshot));
    }
    logger.debug(`[HistoryMiddleware] Recorded: ${description}`);

    return result;
  };

// --- Thunks (dual-mode: legacy without tabId, per-tab with tabId) ---

export const beginHistoryTransaction = (description: string, tabId?: string) => 
  (_dispatch: Dispatch, getState: () => any) => {
    const state = getState();

    if (tabId) {
      // Per-tab routing
      const planner = state.planners?.[tabId];
      if (!planner) return false;
      if (planner.history?.isRestoring) return false;
      if (getActiveTransaction(tabId)) {
        console.log(`[History:${tabId}] ⚠️ Already in transaction, skipping nested "${description}"`);
        return false;
      }
      const snapshot = createSnapshot(state, description, tabId);
      setActiveTransaction(tabId, { description, snapshot, startTime: Date.now() });
      console.log(`[History:${tabId}] 🔓 Transaction STARTED: "${description}"`);
      return true;
    }

    // Legacy routing
    if (state.history.isRestoring) {
      console.log(`[History] ⚠️ Cannot start transaction "${description}" - currently restoring`);
      return false;
    }
    if (activeTransaction !== null) {
      console.log(`[History] ⚠️ Already in transaction "${activeTransaction.description}", skipping nested "${description}"`);
      return false;
    }
    const snapshot = createSnapshot(state, description);
    activeTransaction = { description, snapshot, startTime: Date.now() };
    console.log(`[History] 🔓 Transaction STARTED: "${description}"`);
    return true;
  };

export const commitHistoryTransaction = (tabId?: string) => 
  (dispatch: Dispatch, getState: () => any) => {
    if (tabId) {
      const tx = getActiveTransaction(tabId);
      if (!tx) { console.warn(`[History:${tabId}] ⚠️ No active transaction to commit`); return false; }
      const { description, snapshot, startTime } = tx;
      const duration = Date.now() - startTime;
      if (snapshot) {
        dispatch({ type: '_planner/pushSnapshot', payload: { snapshot }, meta: { tabId } } as AnyAction);
      }
      clearActiveTransaction(tabId);
      console.log(`[History:${tabId}] 🔒 Transaction COMMITTED: "${description}" (${duration}ms)`);
      return true;
    }

    const tx = activeTransaction;
    if (!tx) { console.warn('[History] ⚠️ No active transaction to commit'); return false; }
    const { description, snapshot, startTime } = tx;
    const duration = Date.now() - startTime;
    if (snapshot) {
      dispatch(pushRootSnapshot(snapshot));
    }
    activeTransaction = null;
    console.log(`[History] 🔒 Transaction COMMITTED: "${description}" (${duration}ms)`);
    console.log(`[History] 📚 Undo stack size: ${getState().history.undoStack.length}`);
    return true;
  };

export const cancelHistoryTransaction = (tabId?: string) => 
  (_dispatch: Dispatch, _getState: () => any) => {
    if (tabId) {
      clearActiveTransaction(tabId);
      return true;
    }
    activeTransaction = null;
    return true;
  };

// --- Undo/Redo thunks (accept tabId for per-tab, raw for legacy) ---

export const undoAction = (tabId: string) => (dispatch: Dispatch, getState: () => any) => {
  const state = getState();
  const planner = state.planners?.[tabId];
  if (!planner) return false;

  const { undoStack } = planner.history;
  if (undoStack.length === 0) return false;

  const snapshotToRestore = undoStack[undoStack.length - 1];

  const currentSnapshot: HistorySnapshot = {
    timestamp: Date.now(),
    actionDescription: snapshotToRestore.actionDescription,
    dependencies: JSON.parse(JSON.stringify(planner.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(planner.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(planner.comparison)),
  };

  dispatch({ type: '_planner/setRestoring', payload: { value: true }, meta: { tabId } } as AnyAction);

  try {
    dispatch({ 
      type: '_planner/undoStackPop',
      payload: { currentSnapshot },
      meta: { tabId },
    } as AnyAction);

    if (snapshotToRestore.dependencies) {
      dispatch({ 
        type: 'dependencies/loadSavedState', 
        payload: snapshotToRestore.dependencies,
        meta: { tabId }
      } as AnyAction);
    }
    if (snapshotToRestore.recipeSelections) {
      dispatch({ 
        type: 'recipeSelections/loadRecipeSelections', 
        payload: snapshotToRestore.recipeSelections,
        meta: { tabId }
      } as AnyAction);
    }

    return true;
  } finally {
    dispatch({ type: '_planner/setRestoring', payload: { value: false }, meta: { tabId } } as AnyAction);
  }
};

export const redoAction = (tabId: string) => (dispatch: Dispatch, getState: () => any) => {
  const state = getState();
  const planner = state.planners?.[tabId];
  if (!planner) return false;

  const { redoStack } = planner.history;
  if (redoStack.length === 0) return false;

  const snapshotToRestore = redoStack[redoStack.length - 1];

  const currentSnapshot: HistorySnapshot = {
    timestamp: Date.now(),
    actionDescription: snapshotToRestore.actionDescription,
    dependencies: JSON.parse(JSON.stringify(planner.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(planner.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(planner.comparison)),
  };

  dispatch({ type: '_planner/setRestoring', payload: { value: true }, meta: { tabId } } as AnyAction);

  try {
    dispatch({ 
      type: '_planner/redoStackPop',
      payload: { currentSnapshot },
      meta: { tabId },
    } as AnyAction);

    if (snapshotToRestore.dependencies) {
      dispatch({ 
        type: 'dependencies/loadSavedState', 
        payload: snapshotToRestore.dependencies,
        meta: { tabId }
      } as AnyAction);
    }
    if (snapshotToRestore.recipeSelections) {
      dispatch({ 
        type: 'recipeSelections/loadRecipeSelections', 
        payload: snapshotToRestore.recipeSelections,
        meta: { tabId }
      } as AnyAction);
    }

    return true;
  } finally {
    dispatch({ type: '_planner/setRestoring', payload: { value: false }, meta: { tabId } } as AnyAction);
  }
};

export const withHistoryTransaction = <T>(
  description: string,
  fn: () => Promise<T> | T,
  tabId?: string
) => async (dispatch: Dispatch, getState: () => any): Promise<T> => {
  if (tabId && getActiveTransaction(tabId)) return await fn();
  if (!tabId && activeTransaction) return await fn();

  const s = getState();
  const shouldStart = tabId ? !(s.planners?.[tabId]?.history?.isRestoring) : !s.history?.isRestoring;
  if (!shouldStart) return await fn();

  (dispatch as any)(beginHistoryTransaction(description, tabId));
  try {
    const result = await fn();
    (dispatch as any)(commitHistoryTransaction(tabId));
    return result;
  } catch (error) {
    (dispatch as any)(cancelHistoryTransaction(tabId));
    throw error;
  }
};

// --- Legacy undo/redo (no tabId — reads root-level history) ---
// These are kept for backward compatibility during Phase 2/3 migration.
// They will be removed once all hooks/components pass tabId to undoAction/redoAction.

export const legacyUndoAction = () => (dispatch: Dispatch, getState: () => any) => {
  const state = getState();
  const { undoStack } = state.history;
  if (undoStack.length === 0) return false;

  const snapshotToRestore = undoStack[undoStack.length - 1];

  const currentSnapshot: HistorySnapshot = {
    timestamp: Date.now(),
    actionDescription: snapshotToRestore.actionDescription,
    dependencies: JSON.parse(JSON.stringify(state.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(state.comparison)),
  };

  dispatch(setRootRestoring(true));

  try {
    dispatch({ 
      type: 'history/undoStackPop',
      payload: { currentSnapshot }
    } as AnyAction);

    if (snapshotToRestore.dependencies) {
      dispatch(loadSavedState(snapshotToRestore.dependencies as any) as AnyAction);
    }
    if (snapshotToRestore.recipeSelections) {
      dispatch(loadRecipeSelections(snapshotToRestore.recipeSelections as any) as AnyAction);
    }

    return true;
  } finally {
    dispatch(setRootRestoring(false));
  }
};

export const legacyRedoAction = () => (dispatch: Dispatch, getState: () => any) => {
  const state = getState();
  const { redoStack } = state.history;
  if (redoStack.length === 0) return false;

  const snapshotToRestore = redoStack[redoStack.length - 1];

  const currentSnapshot: HistorySnapshot = {
    timestamp: Date.now(),
    actionDescription: snapshotToRestore.actionDescription,
    dependencies: JSON.parse(JSON.stringify(state.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(state.comparison)),
  };

  dispatch(setRootRestoring(true));

  try {
    dispatch({ 
      type: 'history/redoStackPop',
      payload: { currentSnapshot }
    } as AnyAction);

    if (snapshotToRestore.dependencies) {
      dispatch(loadSavedState(snapshotToRestore.dependencies as any) as AnyAction);
    }
    if (snapshotToRestore.recipeSelections) {
      dispatch(loadRecipeSelections(snapshotToRestore.recipeSelections as any) as AnyAction);
    }

    return true;
  } finally {
    dispatch(setRootRestoring(false));
  }
};
