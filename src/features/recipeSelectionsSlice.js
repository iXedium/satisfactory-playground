import { createSlice } from '@reduxjs/toolkit';
const initialState = {
    selections: {}
};
const recipeSelectionsSlice = createSlice({
    name: 'recipeSelections',
    initialState,
    reducers: {
        setRecipeSelection(state, action) {
            state.selections[action.payload.nodeId] = action.payload.recipeId;
        },
        clearRecipeSelections(state) {
            state.selections = {};
        }
    }
});
export const { setRecipeSelection, clearRecipeSelections } = recipeSelectionsSlice.actions;
export default recipeSelectionsSlice.reducer;
