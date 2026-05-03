import { Middleware, AnyAction, Dispatch } from '@reduxjs/toolkit';
import { 
  pushSnapshot, 
  setRestoring,
  HistorySnapshot 
} from './historySlice';
import { loadSavedState } from './dependencySlice';
import { loadRecipeSelections } from './recipeSelectionsSlice';
import { logger } from '../../../utils/logger';

// --- Module-Level Transaction State ---
// We use module-level state instead of Redux state because Redux state updates
// are asynchronous/batched, which causes race conditions where subsequent actions
// are dispatched before the transaction state is updated.

interface ActiveTransaction {
  description: string;
  snapshot: HistorySnapshot | null;
  startTime: number;
}

let activeTransaction: ActiveTransaction | null = null;

/**
 * Check if we're currently inside a transaction.
 * Uses module-level state for synchronous, reliable checking.
 */
export function isInTransaction(): boolean {
  return activeTransaction !== null;
}

// --- Types ---

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

// --- Action Type Mappings ---

/**
 * Map of action types to human-readable descriptions.
 * These are the actions that modify data and should be tracked in history.
 */
const TRACKED_ACTIONS: Record<string, string | ((action: AnyAction) => string)> = {
  // Dependency slice actions
  'dependencies/setDependencies': 'Update dependency tree',
  'dependencies/deleteTree': 'Delete production tree',
  'dependencies/updateNodeProperties': 'Update node properties',
  'dependencies/toggleNodeSelected': 'Toggle node selection',
  'dependencies/toggleNodeCompleted': 'Toggle node completion',
  'dependencies/toggleNodeHidden': 'Toggle node visibility',
  'dependencies/setNodeMachineCount': 'Set machine count',
  'dependencies/setNodeMachineMultiplier': 'Set machine multiplier',
  'dependencies/setNodeExcess': 'Set node excess',
  
  // Production update actions
  'dependencies/updateExcessProduction': 'Update excess production',
  'dependencies/updateForcedProduction': 'Update forced production',
  'dependencies/updateImportedProduction': 'Update imported production',
  
  // Import/export actions
  'dependency/importNode': 'Import node',
  'dependency/removeNode': 'Remove node',
  'dependency/setExcess': 'Set excess',
  
  // Recipe selection actions
  'recipeSelections/setRecipeSelection': 'Change recipe selection',
  'recipeSelections/clearRecipeSelections': 'Clear all recipe selections',
  
  // Comparison actions (only data-changing ones)
  'comparison/storeSnapshot': 'Store comparison snapshot',
  'comparison/clearSnapshot': 'Clear comparison snapshot',
  'comparison/updateSnapshotTree': 'Update snapshot tree',
  'comparison/removeSnapshotTree': 'Remove snapshot tree',
};

/**
 * Actions that should NOT trigger history recording.
 * These are typically UI-only or internal actions.
 */
const IGNORED_ACTIONS: string[] = [
  // History slice actions (prevent recursion)
  'history/pushSnapshot',
  'history/popUndo',
  'history/popRedo',
  'history/setRestoring',
  'history/clearHistory',
  'history/setMaxStackSize',
  'history/beginTransaction',
  'history/commitTransaction',
  'history/cancelTransaction',
  
  // Tree UI actions (visual only)
  'treeUi/setExpandedNodes',
  
  // Comparison display toggle (UI only)
  'comparison/toggleComparisonDisplay',
  'comparison/setComparisonDisplay',
  
  // Dependency highlighting (UI only)
  'dependencies/setHighlightedNode',
  'dependencies/setManualTreeOrder',
  
  // Data loading (not user actions)
  'data/setDataLoaded',
  'data/setInitialLoadComplete',
  
  // State restoration (system actions, not user-initiated)
  'dependencies/loadSavedState',
  'recipeSelections/loadRecipeSelections',
];

// --- Helper Functions ---

/**
 * Get the human-readable description for an action.
 */
function getActionDescription(action: AnyAction): string {
  const mapper = TRACKED_ACTIONS[action.type];
  if (typeof mapper === 'function') {
    return mapper(action);
  }
  return mapper || action.type;
}

/**
 * Check if an action should be tracked in history.
 */
function shouldTrackAction(action: AnyAction): boolean {
  // Ignore explicitly listed actions
  if (IGNORED_ACTIONS.includes(action.type)) {
    return false;
  }
  
  // Track if it's in our tracked actions map
  return action.type in TRACKED_ACTIONS;
}

/**
 * Create a snapshot of the current state.
 */
function createSnapshot(
  state: RootState, 
  actionDescription: string
): HistorySnapshot {
  return {
    timestamp: Date.now(),
    actionDescription,
    // Deep clone the relevant parts of state
    dependencies: JSON.parse(JSON.stringify(state.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(state.comparison)),
  };
}

// --- Middleware ---

/**
 * Redux middleware that records state snapshots for undo/redo functionality.
 * 
 * Workflow (without transaction):
 * 1. Before tracked action executes, capture current state
 * 2. Let action execute
 * 3. Push the pre-action snapshot to undo stack
 * 
 * Workflow (with transaction):
 * 1. Transaction started with beginTransaction - snapshot already captured
 * 2. All tracked actions during transaction are ignored (just passed through)
 * 3. commitTransaction pushes the pre-captured snapshot as ONE undo checkpoint
 */
export const historyMiddleware: Middleware<object, RootState, Dispatch<AnyAction>> = 
  (store) => (next) => (action: unknown) => {
    const typedAction = action as AnyAction;
    
    // Skip if not tracking this action
    if (!shouldTrackAction(typedAction)) {
      return next(typedAction);
    }
    
    // Skip if we're in the middle of restoring (undo/redo in progress)
    const currentState = store.getState();
    if (currentState.history?.isRestoring) {
      return next(typedAction);
    }
    
    // Skip recording if we're inside a transaction
    // Uses module-level state (not Redux state) for synchronous, reliable checking
    if (activeTransaction !== null) {
      console.log(`[History] ⏸️ Skipping (in transaction "${activeTransaction.description}"): ${typedAction.type}`);
      return next(typedAction);
    }
    
    // No transaction active - use legacy per-action recording
    // Capture state BEFORE the action executes
    const preActionState = currentState;
    const description = getActionDescription(typedAction);
    const snapshot = createSnapshot(preActionState, description);
    
    // Execute the action
    const result = next(typedAction);
    
    // Push snapshot to history
    store.dispatch(pushSnapshot(snapshot));
    console.log(`[History] 📸 Recorded action: ${typedAction.type} as "${description}"`);
    console.log(`[History] 📚 Undo stack size: ${store.getState().history.undoStack.length}`);
    
    logger.debug(`[HistoryMiddleware] Recorded: ${description}`);
    
    return result;
  };

// --- Undo/Redo Thunks ---

/**
 * Thunk to perform an undo operation.
 * Restores the previous state from the undo stack.
 * 
 * Flow:
 * 1. Get the pre-action snapshot from undo stack (state BEFORE the action)
 * 2. Save CURRENT state (post-action) to redo stack so we can redo later
 * 3. Restore the pre-action snapshot
 */
export const undoAction = () => (dispatch: Dispatch, getState: () => RootState) => {
  const state = getState();
  const { undoStack } = state.history;
  
  if (undoStack.length === 0) {
    logger.warn('[Undo] Nothing to undo');
    return false;
  }
  
  // Get the snapshot to restore (the pre-action state)
  const snapshotToRestore = undoStack[undoStack.length - 1];
  
  // IMPORTANT: Save CURRENT state (post-action) to redo stack
  // This is what we'll restore when user clicks "redo"
  const currentSnapshot: HistorySnapshot = {
    timestamp: Date.now(),
    actionDescription: snapshotToRestore.actionDescription,
    dependencies: JSON.parse(JSON.stringify(state.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(state.comparison)),
  };
  
  // Set restoring flag to prevent recording this restoration
  dispatch(setRestoring(true));
  
  try {
    // Remove the snapshot from undo stack and push current state to redo
    // Using a custom action instead of popUndo to properly manage the stacks
    dispatch({ 
      type: 'history/undoStackPop',
      payload: { currentSnapshot }
    });
    
    // Restore the state from the pre-action snapshot
    if (snapshotToRestore.dependencies) {
      dispatch(loadSavedState(snapshotToRestore.dependencies as Parameters<typeof loadSavedState>[0]));
    }
    if (snapshotToRestore.recipeSelections) {
      dispatch(loadRecipeSelections(snapshotToRestore.recipeSelections.selections));
    }
    
    logger.info(`[Undo] Restored: ${snapshotToRestore.actionDescription}`);
    return true;
  } finally {
    // Always clear restoring flag
    dispatch(setRestoring(false));
  }
};

/**
 * Thunk to perform a redo operation.
 * Restores the next state from the redo stack.
 * 
 * Flow:
 * 1. Get the post-action snapshot from redo stack (state AFTER the action)
 * 2. Save CURRENT state (pre-action) to undo stack so we can undo again
 * 3. Restore the post-action snapshot
 */
export const redoAction = () => (dispatch: Dispatch, getState: () => RootState) => {
  const state = getState();
  const { redoStack } = state.history;
  
  if (redoStack.length === 0) {
    logger.warn('[Redo] Nothing to redo');
    return false;
  }
  
  // Get the snapshot to restore (the post-action state)
  const snapshotToRestore = redoStack[redoStack.length - 1];
  
  // IMPORTANT: Save CURRENT state (pre-action) to undo stack
  // This is what we'll restore when user clicks "undo" again
  const currentSnapshot: HistorySnapshot = {
    timestamp: Date.now(),
    actionDescription: snapshotToRestore.actionDescription,
    dependencies: JSON.parse(JSON.stringify(state.dependencies)),
    recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections)),
    comparison: JSON.parse(JSON.stringify(state.comparison)),
  };
  
  // Set restoring flag to prevent recording
  dispatch(setRestoring(true));
  
  try {
    // Remove the snapshot from redo stack and push current state to undo
    dispatch({ 
      type: 'history/redoStackPop',
      payload: { currentSnapshot }
    });
    
    // Restore the state from the post-action snapshot
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

// --- Transaction Helper Thunks ---

/**
 * Start a history transaction. Call this BEFORE performing a user action.
 * All Redux actions dispatched until commitHistoryTransaction() will be 
 * grouped into a single undo checkpoint.
 * 
 * Uses module-level state (not Redux state) for synchronous, reliable tracking.
 * 
 * @param description - Human-readable description of the user action (e.g., "Add Reinforced Iron Plate")
 */
export const beginHistoryTransaction = (description: string) => 
  (_dispatch: Dispatch, getState: () => RootState) => {
    const state = getState();
    
    // Don't start if restoring
    if (state.history.isRestoring) {
      console.log(`[History] ⚠️ Cannot start transaction "${description}" - currently restoring`);
      return false;
    }
    
    // Don't nest transactions - if already in one, just continue
    if (activeTransaction !== null) {
      console.log(`[History] ⚠️ Already in transaction "${activeTransaction.description}", skipping nested "${description}"`);
      return false;
    }
    
    // Capture current state as the pre-action snapshot SYNCHRONOUSLY
    const snapshot = createSnapshot(state, description);
    
    // Set module-level state SYNCHRONOUSLY (this is the key fix!)
    activeTransaction = {
      description,
      snapshot,
      startTime: Date.now(),
    };
    
    console.log(`[History] 🔓 Transaction STARTED: "${description}"`);
    return true;
  };

/**
 * Commit the current history transaction, creating ONE undo checkpoint
 * for all the Redux actions that occurred since beginHistoryTransaction().
 */
export const commitHistoryTransaction = () => 
  (dispatch: Dispatch, _getState: () => RootState) => {
    if (activeTransaction === null) {
      console.warn('[History] ⚠️ No active transaction to commit');
      return false;
    }
    
    const { description, snapshot, startTime } = activeTransaction;
    const duration = Date.now() - startTime;
    
    // Push the pre-action snapshot (captured at transaction start)
    if (snapshot) {
      dispatch(pushSnapshot(snapshot));
    }
    
    // Clear the module-level transaction state
    activeTransaction = null;
    
    console.log(`[History] 🔒 Transaction COMMITTED: "${description}" (${duration}ms)`);
    console.log(`[History] 📚 Undo stack size: ${_getState().history.undoStack.length}`);
    return true;
  };

/**
 * Cancel the current history transaction without creating an undo checkpoint.
 * Use this if the user action was cancelled or failed.
 */
export const cancelHistoryTransaction = () => 
  (_dispatch: Dispatch, _getState: () => RootState) => {
    if (activeTransaction === null) {
      return false;
    }
    
    const { description } = activeTransaction;
    
    // Clear the module-level transaction state without pushing snapshot
    activeTransaction = null;
    
    console.log(`[History] ❌ Transaction CANCELLED: "${description}"`);
    return true;
  };

/**
 * Helper to wrap an async function in a history transaction.
 * Automatically begins transaction before, commits after success, cancels on error.
 * 
 * @param description - Description for the undo action
 * @param fn - Async function to execute within the transaction
 */
export const withHistoryTransaction = <T>(
  description: string,
  fn: () => Promise<T> | T
) => async (dispatch: Dispatch, getState: () => RootState): Promise<T> => {
  // If already in a transaction, just run the function without nesting
  if (activeTransaction !== null) {
    return await fn();
  }
  
  // Start transaction
  const transactionStarted = (dispatch as AppDispatch)(beginHistoryTransaction(description));
  
  if (!transactionStarted) {
    // Couldn't start transaction (restoring or other issue), just run the function
    return await fn();
  }
  
  try {
    const result = await fn();
    (dispatch as AppDispatch)(commitHistoryTransaction());
    return result;
  } catch (error) {
    (dispatch as AppDispatch)(cancelHistoryTransaction());
    throw error;
  }
};

// Type for dispatch that can handle thunks
type AppDispatch = Dispatch & ((thunk: (dispatch: Dispatch, getState: () => RootState) => unknown) => unknown);

export default historyMiddleware;
