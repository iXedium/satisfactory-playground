import { createSlice } from '@reduxjs/toolkit';
const initialState = {
    expandedNodes: [],
};
const treeUiSlice = createSlice({
    name: 'treeUi',
    initialState,
    reducers: {
        setExpandedNodes: (state, action) => {
            state.expandedNodes = action.payload;
        },
    },
});
export const { setExpandedNodes } = treeUiSlice.actions;
export default treeUiSlice.reducer;
