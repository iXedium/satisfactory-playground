import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "../features/dataSlice";
import dependencyReducer from "../features/dependencySlice"; // ✅ Import new slice
import recipeSelectionsReducer from '../features/recipeSelectionsSlice';
import treeUiReducer from '../features/treeUiSlice'; // ✅ Already properly included
export const store = configureStore({
    reducer: {
        data: dataReducer,
        dependencies: dependencyReducer, // ✅ Add dependencies slice
        recipeSelections: recipeSelectionsReducer,
        treeUi: treeUiReducer, // ✅ Already properly included
    },
});
