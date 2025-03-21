import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "../features/dataSlice";
import dependencyReducer from "../features/dependencySlice"; // ✅ Import new slice
import recipeSelectionsReducer from '../features/recipeSelectionsSlice';
import treeUiReducer from '../features/treeUiSlice'; // ✅ Already properly included
import settingsReducer from '../features/settingsSlice';

export const store = configureStore({
  reducer: {
    data: dataReducer,
    dependencies: dependencyReducer, // ✅ Add dependencies slice
    recipeSelections: recipeSelectionsReducer,
    treeUi: treeUiReducer,  // ✅ Already properly included
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
