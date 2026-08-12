import React, { PropsWithChildren } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import type { PlannerRootState, PlannerAppDispatch } from '../../src/store/plannerStore';

import dataReducer from '../../src/store/dataSlice';
import dependencyReducer from '../../src/features/factory-planner/store/dependencySlice';
import recipeSelectionsReducer from '../../src/features/factory-planner/store/recipeSelectionsSlice';
import treeUiReducer from '../../src/features/factory-planner/store/treeUiSlice';
import comparisonReducer from '../../src/features/factory-planner/store/comparisonSlice';
import historyReducer from '../../src/features/factory-planner/store/historySlice';
import { historyMiddleware } from '../../src/features/factory-planner/store/historyMiddleware';
import { createImportLogic } from '../../src/features/factory-planner/store/importExportLogic';
import { Recipe } from '../../src/types';

const rootReducer = combineReducers({
  data: dataReducer,
  dependencies: dependencyReducer,
  recipeSelections: recipeSelectionsReducer,
  treeUi: treeUiReducer,
  comparison: comparisonReducer,
  history: historyReducer,
});

export type TestRootState = PlannerRootState & { data: ReturnType<typeof dataReducer> };

export type TestStore = ReturnType<typeof createTestStore>;

export function createTestStore(preloadedState?: Partial<TestRootState>) {
  const importLogic = createImportLogic(new Map<string, Recipe | undefined>());
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as TestRootState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['history/pushSnapshot'],
          ignoredPaths: ['history.undoStack', 'history.redoStack'],
        },
        thunk: {
          extraArgument: importLogic.cache,
        },
      }).concat(historyMiddleware),
  });
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<TestRootState>;
  store?: TestStore;
}

interface ExtendedRenderResult extends RenderResult {
  store: TestStore;
  getState: () => TestRootState;
  dispatch: PlannerAppDispatch;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
): ExtendedRenderResult {
  function Wrapper({ children }: PropsWithChildren<object>): React.JSX.Element {
    return <Provider store={store}>{children}</Provider>;
  }

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    store,
    getState: () => store.getState(),
    dispatch: store.dispatch,
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
