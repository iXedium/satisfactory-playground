/**
 * Test Utilities - Render with Redux Provider
 * 
 * This file provides a custom render function that wraps components
 * with all necessary providers (Redux, etc.) for testing.
 */

import React, { PropsWithChildren } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../src/store';

// Import all reducers
import dataReducer from '../../src/store/dataSlice';
import dependencyReducer from '../../src/features/factory-planner/store/dependencySlice';
import recipeSelectionsReducer from '../../src/features/factory-planner/store/recipeSelectionsSlice';
import treeUiReducer from '../../src/features/factory-planner/store/treeUiSlice';
import comparisonReducer from '../../src/features/factory-planner/store/comparisonSlice';
import historyReducer from '../../src/features/factory-planner/store/historySlice';
import { historyMiddleware } from '../../src/features/factory-planner/store/historyMiddleware';

// Create the root reducer for test store
const rootReducer = combineReducers({
  data: dataReducer,
  dependencies: dependencyReducer,
  recipeSelections: recipeSelectionsReducer,
  treeUi: treeUiReducer,
  comparison: comparisonReducer,
  history: historyReducer,
});

// Type for the test store
export type TestStore = ReturnType<typeof createTestStore>;

/**
 * Creates a test store with optional preloaded state
 */
export function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['history/pushSnapshot'],
          ignoredPaths: ['history.undoStack', 'history.redoStack'],
        },
      }).concat(historyMiddleware),
  });
}

/**
 * Extended render options that include store configuration
 */
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial Redux state (partial, will be merged with defaults) */
  preloadedState?: Partial<RootState>;
  /** Provide a custom store instance (overrides preloadedState) */
  store?: TestStore;
}

/**
 * Extended render result that includes store access
 */
interface ExtendedRenderResult extends RenderResult {
  /** The Redux store instance used in this render */
  store: TestStore;
  /** Helper to get current state */
  getState: () => RootState;
  /** Helper to dispatch actions */
  dispatch: AppDispatch;
}

/**
 * Custom render function that wraps components with all necessary providers.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { getByText, store } = renderWithProviders(<MyComponent />);
 * 
 * // With preloaded state
 * const { getByText, getState } = renderWithProviders(<MyComponent />, {
 *   preloadedState: {
 *     dependencies: {
 *       dependencyTrees: { 'tree-1': mockTree },
 *       accumulatedDependencies: {},
 *       highlightedNodeId: null,
 *       errors: [],
 *       lastUpdateTime: 0,
 *     },
 *   },
 * });
 * 
 * // Assert on state
 * expect(getState().dependencies.dependencyTrees).toHaveProperty('tree-1');
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
): ExtendedRenderResult {
  // Wrapper component with all providers
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

/**
 * Re-export everything from @testing-library/react for convenience
 */
export * from '@testing-library/react';

// Export userEvent for interaction testing
export { default as userEvent } from '@testing-library/user-event';
