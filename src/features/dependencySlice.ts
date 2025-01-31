import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DependencyNode } from "../utils/calculateDependencyTree";

interface DependencyState {
  selectedItem: string | null;
  itemCount: number;
  dependencyTree: DependencyNode | null;
  accumulatedDependencies: Record<string, number>;
}

const initialState: DependencyState = {
  selectedItem: null,
  itemCount: 0,
  dependencyTree: null,
  accumulatedDependencies: {},
};

const dependencySlice = createSlice({
  name: "dependencies",
  initialState,
  reducers: {
    setDependencies: (
      state,
      action: PayloadAction<{
        item: string;
        count: number;
        tree: DependencyNode;
        accumulated: Record<string, number>;
      }>
    ) => {
      console.log("🔹 Updating Redux Dependencies:", action.payload); // ✅ Debugging
      state.selectedItem = action.payload.item;
      state.itemCount = action.payload.count;
      state.dependencyTree = action.payload.tree;
      state.accumulatedDependencies = action.payload.accumulated;
    },
  },
});

export const { setDependencies } = dependencySlice.actions;
export default dependencySlice.reducer;
