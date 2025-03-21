import { configureStore } from "@reduxjs/toolkit";
import { ThunkAction, Action } from '@reduxjs/toolkit';
import dataReducer from "../features/dataSlice";
import dependencyReducer from "../features/dependencySlice"; // ✅ Import new slice
import recipeSelectionsReducer from '../features/recipeSelectionsSlice';
import treeUiReducer from '../features/treeUiSlice'; // ✅ Already properly included
import settingsReducer from '../features/settingsSlice';
import importExportReducer from '../features/importExportSlice';

export const store = configureStore({
  reducer: {
    data: dataReducer,
    dependencies: dependencyReducer, // ✅ Add dependencies slice
    recipeSelections: recipeSelectionsReducer,
    treeUi: treeUiReducer,  // ✅ Already properly included
    settings: settingsReducer,
    importExport: importExportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
