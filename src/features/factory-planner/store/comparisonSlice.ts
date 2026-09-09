import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ComparisonSnapshot, TreeSnapshot, NodeSnapshot } from "../../../types";
import { logger } from "../../../utils/logger";

// --- State Interface ---
export interface ComparisonState {
  /** The currently stored snapshot for comparison (null if none) */
  activeSnapshot: ComparisonSnapshot | null;
  /** Whether comparison display is enabled */
  showComparison: boolean;
}

// --- Initial State ---
const initialState: ComparisonState = {
  activeSnapshot: null,
  showComparison: false,
};

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
      logger.info('[comparisonSlice] Snapshot stored:', action.payload.name);
    },

    /** Clear the active snapshot */
    clearSnapshot: (state) => {
      state.activeSnapshot = null;
      state.showComparison = false;
      logger.info('[comparisonSlice] Snapshot cleared');
    },

    /** Toggle comparison display on/off */
    toggleComparisonDisplay: (state) => {
      state.showComparison = !state.showComparison;
      logger.debug('[comparisonSlice] Comparison display:', state.showComparison);
    },

    /** Set comparison display explicitly */
    setComparisonDisplay: (state, action: PayloadAction<boolean>) => {
      state.showComparison = action.payload;
    },

    /** Update a single tree in the snapshot (for partial updates) */
    updateSnapshotTree: (state, action: PayloadAction<TreeSnapshot>) => {
      if (state.activeSnapshot) {
        state.activeSnapshot.trees[action.payload.treeId] = action.payload;
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
      }
    },

    /** Load or restore complete comparison state (from saved setup, workspace, or session) */
    loadComparisonState: (state, action: PayloadAction<{ activeSnapshot: ComparisonSnapshot | null; showComparison?: boolean } | null | undefined>) => {
      if (!action.payload) {
        state.activeSnapshot = null;
        state.showComparison = false;
      } else {
        state.activeSnapshot = action.payload.activeSnapshot || null;
        state.showComparison = action.payload.showComparison ?? (action.payload.activeSnapshot !== null);
      }
      logger.info('[comparisonSlice] State loaded:', state.activeSnapshot?.name ?? 'none');
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
  loadComparisonState,
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
