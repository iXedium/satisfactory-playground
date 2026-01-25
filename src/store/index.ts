import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "./dataSlice";
import dependencyReducer from "../features/factory-planner/store/dependencySlice"; // Updated path
import recipeSelectionsReducer from '../features/factory-planner/store/recipeSelectionsSlice'; // Updated path
import treeUiReducer from '../features/factory-planner/store/treeUiSlice'; // Updated path
import comparisonReducer from '../features/factory-planner/store/comparisonSlice';
import historyReducer from '../features/factory-planner/store/historySlice';
import { historyMiddleware } from '../features/factory-planner/store/historyMiddleware';

export const store = configureStore({
  reducer: {
    data: dataReducer,
    dependencies: dependencyReducer, // ✅ Add dependencies slice
    recipeSelections: recipeSelectionsReducer,
    treeUi: treeUiReducer,  // ✅ Already properly included
    comparison: comparisonReducer, // Snapshot comparison state
    history: historyReducer, // ✅ Undo/Redo history state
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializable check for history snapshots (they contain complex state)
      serializableCheck: {
        ignoredActions: ['history/pushSnapshot'],
        ignoredPaths: ['history.undoStack', 'history.redoStack'],
      },
    }).concat(historyMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
