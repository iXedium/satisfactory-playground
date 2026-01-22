import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ComparisonSnapshot, TreeSnapshot, NodeSnapshot } from "../../../types";
import { logger } from "../../../utils/logger";

// --- Local Storage Key ---
const COMPARISON_STORAGE_KEY = 'plannerComparisonSnapshot';

// --- State Interface ---
interface ComparisonState {
  /** The currently stored snapshot for comparison (null if none) */
  activeSnapshot: ComparisonSnapshot | null;
  /** Whether comparison display is enabled */
  showComparison: boolean;
}

// --- Load from localStorage ---
const loadFromStorage = (): ComparisonState => {
  try {
    const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        activeSnapshot: parsed.activeSnapshot || null,
        showComparison: parsed.showComparison ?? false,
      };
    }
  } catch (error) {
    logger.warn('[comparisonSlice] Failed to load from localStorage:', error);
  }
  return {
    activeSnapshot: null,
    showComparison: false,
  };
};

// --- Save to localStorage ---
const saveToStorage = (state: ComparisonState): void => {
  try {
    localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify({
      activeSnapshot: state.activeSnapshot,
      showComparison: state.showComparison,
    }));
  } catch (error) {
    logger.warn('[comparisonSlice] Failed to save to localStorage:', error);
  }
};

// --- Initial State ---
const initialState: ComparisonState = loadFromStorage();

// --- Slice Definition ---
const comparisonSlice = createSlice({
  name: "comparison",
  initialState,
  reducers: {
    /** Store a new snapshot as the comparison baseline */
    storeSnapshot: (state, action: PayloadAction<ComparisonSnapshot>) => {
      state.activeSnapshot = action.payload;
      // Auto-enable comparison when storing
      state.showComparison = true;
      saveToStorage(state);
      logger.info('[comparisonSlice] Snapshot stored:', action.payload.name);
    },

    /** Clear the active snapshot */
    clearSnapshot: (state) => {
      state.activeSnapshot = null;
      state.showComparison = false;
      saveToStorage(state);
      logger.info('[comparisonSlice] Snapshot cleared');
    },

    /** Toggle comparison display on/off */
    toggleComparisonDisplay: (state) => {
      state.showComparison = !state.showComparison;
      saveToStorage(state);
      logger.debug('[comparisonSlice] Comparison display:', state.showComparison);
    },

    /** Set comparison display explicitly */
    setComparisonDisplay: (state, action: PayloadAction<boolean>) => {
      state.showComparison = action.payload;
      saveToStorage(state);
    },

    /** Update a single tree in the snapshot (for partial updates) */
    updateSnapshotTree: (state, action: PayloadAction<TreeSnapshot>) => {
      if (state.activeSnapshot) {
        state.activeSnapshot.trees[action.payload.treeId] = action.payload;
        saveToStorage(state);
      }
    },

    /** Remove a tree from the snapshot (when tree is deleted) */
    removeSnapshotTree: (state, action: PayloadAction<string>) => {
      if (state.activeSnapshot) {
        delete state.activeSnapshot.trees[action.payload];
        // If no trees left, clear the snapshot
        if (Object.keys(state.activeSnapshot.trees).length === 0) {
          state.activeSnapshot = null;
          state.showComparison = false;
        }
        saveToStorage(state);
      }
    },
  },
});

// --- Exports ---
export const {
  storeSnapshot,
  clearSnapshot,
  toggleComparisonDisplay,
  setComparisonDisplay,
  updateSnapshotTree,
  removeSnapshotTree,
} = comparisonSlice.actions;

export default comparisonSlice.reducer;

// --- Selectors ---
export const selectActiveSnapshot = (state: { comparison: ComparisonState }) => 
  state.comparison.activeSnapshot;

export const selectShowComparison = (state: { comparison: ComparisonState }) => 
  state.comparison.showComparison;

export const selectNodeSnapshot = (
  state: { comparison: ComparisonState },
  treeId: string,
  nodeId: string
): NodeSnapshot | null => {
  const snapshot = state.comparison.activeSnapshot;
  if (!snapshot) return null;
  const tree = snapshot.trees[treeId];
  if (!tree) return null;
  return tree.nodes[nodeId] || null;
};
