import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "./dataSlice";
import dependencyReducer from "../features/factory-planner/store/dependencySlice"; // Updated path
import recipeSelectionsReducer from '../features/factory-planner/store/recipeSelectionsSlice'; // Updated path
import treeUiReducer from '../features/factory-planner/store/treeUiSlice'; // Updated path
import comparisonReducer from '../features/factory-planner/store/comparisonSlice';

export const store = configureStore({
  reducer: {
    data: dataReducer,
    dependencies: dependencyReducer, // ✅ Add dependencies slice
    recipeSelections: recipeSelectionsReducer,
    treeUi: treeUiReducer,  // ✅ Already properly included
    comparison: comparisonReducer, // Snapshot comparison state
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
