import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RecipeSelectionsState {
  selections: Record<string, string>;  // nodeId -> recipeId
}

const initialState: RecipeSelectionsState = {
  selections: {}
};

const recipeSelectionsSlice = createSlice({
  name: 'recipeSelections',
  initialState,
  reducers: {
    setRecipeSelection(state, action: PayloadAction<{ nodeId: string; recipeId: string }>) {
      state.selections[action.payload.nodeId] = action.payload.recipeId;
    },
    clearRecipeSelections(state) {
      state.selections = {};
    }
  }
});

export const { setRecipeSelection, clearRecipeSelections } = recipeSelectionsSlice.actions;
export default recipeSelectionsSlice.reducer;
