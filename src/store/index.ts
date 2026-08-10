import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "./dataSlice";
import dependencyReducer from "../features/factory-planner/store/dependencySlice";
import recipeSelectionsReducer from '../features/factory-planner/store/recipeSelectionsSlice';
import treeUiReducer from '../features/factory-planner/store/treeUiSlice';
import comparisonReducer from '../features/factory-planner/store/comparisonSlice';
import historyReducer from '../features/factory-planner/store/historySlice';
import workspaceReducer from "../features/workspace/store/workspaceSlice";
import { plannersReducer } from "../features/workspace/store/plannersReducer";
import { historyMiddleware } from '../features/factory-planner/store/historyMiddleware';

export const store = configureStore({
  reducer: {
    data: dataReducer,
    // Legacy single-planner slices (kept during migration)
    dependencies: dependencyReducer,
    recipeSelections: recipeSelectionsReducer,
    treeUi: treeUiReducer,
    comparison: comparisonReducer,
    history: historyReducer,
    // New multi-planner infrastructure
    workspace: workspaceReducer,
    planners: plannersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['history/pushSnapshot', '_planner/beginOperation', '_planner/endOperation'],
        ignoredPaths: [/planners\..*\.history\.undoStack/, /planners\..*\.history\.redoStack/],
      },
    }).concat(historyMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
