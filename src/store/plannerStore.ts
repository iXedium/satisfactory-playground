import { configureStore } from '@reduxjs/toolkit';
import dependencyReducer from '../features/factory-planner/store/dependencySlice';
import recipeSelectionsReducer from '../features/factory-planner/store/recipeSelectionsSlice';
import treeUiReducer from '../features/factory-planner/store/treeUiSlice';
import comparisonReducer from '../features/factory-planner/store/comparisonSlice';
import historyReducer from '../features/factory-planner/store/historySlice';
import { createHistoryMiddleware } from '../features/factory-planner/store/historyMiddleware';
import { createImportLogic } from '../features/factory-planner/store/importExportLogic';
import { Recipe } from '../types';

export function createPlannerStore() {
  const historyMiddlewareAPI = createHistoryMiddleware();
  const importLogic = createImportLogic(new Map<string, Recipe | undefined>());

  const store = configureStore({
    reducer: {
      dependencies: dependencyReducer,
      recipeSelections: recipeSelectionsReducer,
      treeUi: treeUiReducer,
      comparison: comparisonReducer,
      history: historyReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['history/pushSnapshot'],
          ignoredPaths: ['history.undoStack', 'history.redoStack'],
        },
        thunk: {
          extraArgument: importLogic.cache,
        },
      }).concat(historyMiddlewareAPI.middleware),
  });

  return store;
}

export type PlannerRootState = ReturnType<ReturnType<typeof createPlannerStore>['getState']>;
export type PlannerAppDispatch = ReturnType<typeof createPlannerStore>['dispatch'];
