import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DependencyState } from './dependencySlice';
import { logger } from '../../../utils/logger';

// --- Types ---

/** 
 * A snapshot captures the state of data-changing slices at a point in time.
 * We only store the slices that were changed by an action (Option B approach).
 */
export interface HistorySnapshot {
  /** Timestamp when this snapshot was created */
  timestamp: number;
  /** Human-readable description of the action that caused this snapshot */
  actionDescription: string;
  /** Partial state - only includes slices that were present/changed */
  dependencies?: DependencyState;
  recipeSelections?: { selections: Record<string, string> };
  comparison?: {
    activeSnapshot: unknown | null;
    showComparison: boolean;
  };
}

/**
 * Pending transaction info - tracks an in-progress user action
 */
interface PendingTransaction {
  /** Description of the user action */
  description: string;
  /** Snapshot captured at the start of the transaction */
  snapshot: HistorySnapshot;
  /** Timestamp when transaction started (for timeout detection) */
  startTime: number;
}

/** History state structure */
export interface HistoryState {
  /** Stack of past states (most recent at end) */
  undoStack: HistorySnapshot[];
  /** Stack of future states for redo (most recent at end) */
  redoStack: HistorySnapshot[];
  /** Maximum number of snapshots to keep in each stack */
  maxStackSize: number;
  /** Flag to prevent recording when we're restoring state */
  isRestoring: boolean;
  /** Flag indicating if undo/redo is available */
  canUndo: boolean;
  canRedo: boolean;
  /** 
   * Active transaction - when set, all tracked actions are ignored 
   * and only the transaction's pre-captured snapshot will be used 
   */
  pendingTransaction: PendingTransaction | null;
}

// --- Initial State ---

const initialState: HistoryState = {
  undoStack: [],
  redoStack: [],
  maxStackSize: 50, // Keep last 50 states
  isRestoring: false,
  canUndo: false,
  canRedo: false,
  pendingTransaction: null,
};

// --- Slice Definition ---

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    /**
     * Push a new snapshot onto the undo stack.
     * Clears the redo stack since we're creating a new branch.
     */
    pushSnapshot: (state, action: PayloadAction<HistorySnapshot>) => {
      // Don't record if we're in the middle of restoring
      if (state.isRestoring) {
        return;
      }

      state.undoStack.push(action.payload);
      
      // Enforce max stack size
      if (state.undoStack.length > state.maxStackSize) {
        state.undoStack.shift(); // Remove oldest
      }
      
      // Clear redo stack when new action is performed
      state.redoStack = [];
      
      // Update flags
      state.canUndo = state.undoStack.length > 0;
      state.canRedo = false;
      
      logger.debug(`[History] Pushed snapshot: ${action.payload.actionDescription}`);
    },

    /**
     * Pop the most recent snapshot from undo stack for restoration.
     * The current state should be pushed to redo stack before calling this.
     * @deprecated Use undoStackPop instead for correct undo/redo behavior
     */
    popUndo: (state) => {
      if (state.undoStack.length === 0) {
        logger.warn('[History] Cannot undo: undo stack is empty');
        return;
      }
      
      // Remove and return the last snapshot
      const snapshot = state.undoStack.pop();
      if (snapshot) {
        state.redoStack.push(snapshot);
      }
      
      // Update flags
      state.canUndo = state.undoStack.length > 0;
      state.canRedo = state.redoStack.length > 0;
      
      logger.debug(`[History] Popped undo, stacks: undo=${state.undoStack.length}, redo=${state.redoStack.length}`);
    },

    /**
     * Pop the most recent snapshot from redo stack for restoration.
     * @deprecated Use redoStackPop instead for correct undo/redo behavior
     */
    popRedo: (state) => {
      if (state.redoStack.length === 0) {
        logger.warn('[History] Cannot redo: redo stack is empty');
        return;
      }
      
      // Remove and return the last snapshot
      const snapshot = state.redoStack.pop();
      if (snapshot) {
        state.undoStack.push(snapshot);
      }
      
      // Update flags
      state.canUndo = state.undoStack.length > 0;
      state.canRedo = state.redoStack.length > 0;
      
      logger.debug(`[History] Popped redo, stacks: undo=${state.undoStack.length}, redo=${state.redoStack.length}`);
    },

    /**
     * Pop from undo stack and push CURRENT state to redo stack.
     * This is the correct way to handle undo - saves current state for redo.
     */
    undoStackPop: (state, action: PayloadAction<{ currentSnapshot: HistorySnapshot }>) => {
      if (state.undoStack.length === 0) {
        logger.warn('[History] Cannot undo: undo stack is empty');
        return;
      }
      
      // Remove from undo stack (we're restoring this state)
      state.undoStack.pop();
      
      // Push CURRENT state to redo stack (so redo can restore it)
      state.redoStack.push(action.payload.currentSnapshot);
      
      // Update flags
      state.canUndo = state.undoStack.length > 0;
      state.canRedo = state.redoStack.length > 0;
      
      logger.debug(`[History] Undo: undo=${state.undoStack.length}, redo=${state.redoStack.length}`);
    },

    /**
     * Pop from redo stack and push CURRENT state to undo stack.
     * This is the correct way to handle redo - saves current state for undo.
     */
    redoStackPop: (state, action: PayloadAction<{ currentSnapshot: HistorySnapshot }>) => {
      if (state.redoStack.length === 0) {
        logger.warn('[History] Cannot redo: redo stack is empty');
        return;
      }
      
      // Remove from redo stack (we're restoring this state)
      state.redoStack.pop();
      
      // Push CURRENT state to undo stack (so undo can restore it)
      state.undoStack.push(action.payload.currentSnapshot);
      
      // Update flags
      state.canUndo = state.undoStack.length > 0;
      state.canRedo = state.redoStack.length > 0;
      
      logger.debug(`[History] Redo: undo=${state.undoStack.length}, redo=${state.redoStack.length}`);
    },

    /**
     * Set the restoring flag to prevent recording during state restoration.
     */
    setRestoring: (state, action: PayloadAction<boolean>) => {
      state.isRestoring = action.payload;
    },

    /**
     * Clear all history (both undo and redo stacks).
     */
    clearHistory: (state) => {
      state.undoStack = [];
      state.redoStack = [];
      state.canUndo = false;
      state.canRedo = false;
      logger.debug('[History] History cleared');
    },

    /**
     * Set the maximum stack size.
     */
    setMaxStackSize: (state, action: PayloadAction<number>) => {
      state.maxStackSize = action.payload;
      // Trim stacks if they exceed new max
      while (state.undoStack.length > state.maxStackSize) {
        state.undoStack.shift();
      }
      while (state.redoStack.length > state.maxStackSize) {
        state.redoStack.shift();
      }
      state.canUndo = state.undoStack.length > 0;
      state.canRedo = state.redoStack.length > 0;
    },

    /**
     * Begin a history transaction. 
     * All subsequent tracked actions will be ignored until commitTransaction is called.
     * The snapshot passed here captures state BEFORE the user action starts.
     */
    beginTransaction: (state, action: PayloadAction<{ description: string; snapshot: HistorySnapshot }>) => {
      // Don't start a transaction if we're restoring or already in one
      if (state.isRestoring) {
        logger.debug('[History] Ignoring beginTransaction during restore');
        return;
      }
      
      if (state.pendingTransaction) {
        // Already in a transaction - could be a nested call or a bug
        // Log warning but allow it to continue with the original transaction
        logger.warn('[History] beginTransaction called while transaction already active. Ignoring new transaction.');
        return;
      }
      
      state.pendingTransaction = {
        description: action.payload.description,
        snapshot: action.payload.snapshot,
        startTime: Date.now(),
      };
      
      logger.debug(`[History] Transaction started: ${action.payload.description}`);
    },

    /**
     * Commit the current transaction, pushing the pre-captured snapshot to the undo stack.
     * This creates ONE undo checkpoint for all the actions that happened during the transaction.
     */
    commitTransaction: (state) => {
      if (!state.pendingTransaction) {
        logger.warn('[History] commitTransaction called with no active transaction');
        return;
      }
      
      const { snapshot, description } = state.pendingTransaction;
      
      // Push the pre-action snapshot to undo stack
      state.undoStack.push(snapshot);
      
      // Enforce max stack size
      if (state.undoStack.length > state.maxStackSize) {
        state.undoStack.shift();
      }
      
      // Clear redo stack (new action branch)
      state.redoStack = [];
      
      // Update flags
      state.canUndo = state.undoStack.length > 0;
      state.canRedo = false;
      
      // Clear the transaction
      state.pendingTransaction = null;
      
      logger.debug(`[History] Transaction committed: ${description}`);
    },

    /**
     * Cancel/rollback a transaction without creating an undo checkpoint.
     * Use this if the user action was cancelled or failed.
     */
    cancelTransaction: (state) => {
      if (!state.pendingTransaction) {
        logger.debug('[History] cancelTransaction called with no active transaction');
        return;
      }
      
      const description = state.pendingTransaction.description;
      state.pendingTransaction = null;
      
      logger.debug(`[History] Transaction cancelled: ${description}`);
    },
  },
});

// --- Exports ---

export const {
  pushSnapshot,
  popUndo,
  popRedo,
  undoStackPop,
  redoStackPop,
  setRestoring,
  clearHistory,
  setMaxStackSize,
  beginTransaction,
  commitTransaction,
  cancelTransaction,
} = historySlice.actions;

export default historySlice.reducer;

// --- Selectors ---

export const selectCanUndo = (state: { history: HistoryState }) => 
  state.history.canUndo;

export const selectCanRedo = (state: { history: HistoryState }) => 
  state.history.canRedo;

export const selectIsRestoring = (state: { history: HistoryState }) => 
  state.history.isRestoring;

export const selectIsInTransaction = (state: { history: HistoryState }) =>
  state.history.pendingTransaction !== null;

export const selectUndoStackSize = (state: { history: HistoryState }) => 
  state.history.undoStack.length;

export const selectRedoStackSize = (state: { history: HistoryState }) => 
  state.history.redoStack.length;

/** Get the description of the action that would be undone */
export const selectLastUndoAction = (state: { history: HistoryState }): string | null => {
  const stack = state.history.undoStack;
  return stack.length > 0 ? stack[stack.length - 1].actionDescription : null;
};

/** Get the description of the action that would be redone */
export const selectLastRedoAction = (state: { history: HistoryState }): string | null => {
  const stack = state.history.redoStack;
  return stack.length > 0 ? stack[stack.length - 1].actionDescription : null;
};
