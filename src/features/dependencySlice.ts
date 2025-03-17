import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { AccumulatedNode } from "../utils/calculateAccumulatedFromTree";

interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;  // Map of treeId to DependencyNode
  accumulatedDependencies: Record<string, AccumulatedNode>;
}

const initialState: DependencyState = {
  dependencyTrees: {},
  accumulatedDependencies: {},
};

const dependencySlice = createSlice({
  name: "dependencies",
  initialState,
  reducers: {
    setDependencies: (
      state,
      action: PayloadAction<{
        treeId: string;  // Unique identifier for the tree
        tree: DependencyNode;
        accumulated: Record<string, AccumulatedNode>;
      }>
    ) => {
      state.dependencyTrees[action.payload.treeId] = action.payload.tree;
      state.accumulatedDependencies = action.payload.accumulated;
    },
    deleteTree: (
      state,
      action: PayloadAction<{
        treeId: string;
      }>
    ) => {
      // Delete the tree with the specified ID
      delete state.dependencyTrees[action.payload.treeId];
      
      // Clear accumulated dependencies if no trees remain
      if (Object.keys(state.dependencyTrees).length === 0) {
        state.accumulatedDependencies = {};
      }
    },
    updateAccumulated: (
      state,
      action: PayloadAction<Record<string, AccumulatedNode>>
    ) => {
      state.accumulatedDependencies = action.payload;
    },
  },
});

export const { setDependencies, deleteTree, updateAccumulated } = dependencySlice.actions;
export default dependencySlice.reducer;
