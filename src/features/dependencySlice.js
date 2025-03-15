import { createSlice } from "@reduxjs/toolkit";
const initialState = {
    selectedItem: null,
    itemCount: 0,
    dependencyTree: null,
    accumulatedDependencies: {},
};
const dependencySlice = createSlice({
    name: "dependencies",
    initialState,
    reducers: {
        setDependencies: (state, action) => {
            // ✅ Debugging
            state.selectedItem = action.payload.item;
            state.itemCount = action.payload.count;
            state.dependencyTree = action.payload.tree;
            state.accumulatedDependencies = action.payload.accumulated;
        },
    },
});
export const { setDependencies } = dependencySlice.actions;
export default dependencySlice.reducer;
