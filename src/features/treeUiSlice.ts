import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TreeUiState {
  expandedNodes: string[];
}

const initialState: TreeUiState = {
  expandedNodes: [],
};

const treeUiSlice = createSlice({
  name: 'treeUi',
  initialState,
  reducers: {
    setExpandedNodes: (state, action: PayloadAction<string[]>) => {
      state.expandedNodes = action.payload;
    },
  },
});

export const { setExpandedNodes } = treeUiSlice.actions;
export default treeUiSlice.reducer;
