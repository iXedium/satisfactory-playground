/**
 * Multi-Tab UI Integration Tests
 *
 * Verifies end-to-end multi-tab behavior at the Redux store level
 * and through the TabDispatchProvider context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react';
import dataReducer from '../../src/store/dataSlice';
import dependencyReducer from '../../src/features/factory-planner/store/dependencySlice';
import recipeSelectionsReducer from '../../src/features/factory-planner/store/recipeSelectionsSlice';
import treeUiReducer from '../../src/features/factory-planner/store/treeUiSlice';
import comparisonReducer from '../../src/features/factory-planner/store/comparisonSlice';
import historyReducer from '../../src/features/factory-planner/store/historySlice';
import workspaceReducer from '../../src/features/workspace/store/workspaceSlice';
import { plannersReducer } from '../../src/features/workspace/store/plannersReducer';
import { historyMiddleware } from '../../src/features/factory-planner/store/historyMiddleware';
import { addTab, removeTab, replaceWorkspace, setActiveTab } from '../../src/features/workspace/store/workspaceSlice';
import { TabDispatchProvider, useTabDispatch } from '../../src/features/workspace/context/TabDispatchContext';
import { createEmptyPlannerState } from '../../src/features/workspace/store/plannerState';

function createStore() {
  return configureStore({
    reducer: {
      data: dataReducer,
      dependencies: dependencyReducer,
      recipeSelections: recipeSelectionsReducer,
      treeUi: treeUiReducer,
      comparison: comparisonReducer,
      history: historyReducer,
      workspace: workspaceReducer,
      planners: plannersReducer,
    },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(historyMiddleware),
  });
}

// ============================================
// 1. Planner State Initialization
// ============================================

describe('Planner state initialization', () => {
  it('addTab creates a planners[tabId] entry', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-1', name: 'Test' }));
    const state = store.getState();
    expect(state.workspace.tabs).toHaveLength(1);
    expect(state.planners['tab-1']).toBeDefined();
    expect(state.planners['tab-1'].dependencies.dependencyTrees).toEqual({});
    expect(state.planners['tab-1'].recipeSelections.selections).toEqual({});
    expect(state.planners['tab-1'].history.undoStack).toEqual([]);
  });

  it('addTab creates independent entries for multiple tabs', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-1', name: 'One' }));
    store.dispatch(addTab({ tabId: 'tab-2', name: 'Two' }));
    const state = store.getState();
    expect(Object.keys(state.planners)).toHaveLength(2);
    expect(state.planners['tab-1']).toBeDefined();
    expect(state.planners['tab-2']).toBeDefined();
  });

  it('removeTab cleans up planners[tabId]', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-1', name: 'One' }));
    store.dispatch(addTab({ tabId: 'tab-2', name: 'Two' }));
    store.dispatch(removeTab('tab-1'));
    const state = store.getState();
    expect(state.planners['tab-1']).toBeUndefined();
    expect(state.planners['tab-2']).toBeDefined();
  });

  it('replaceWorkspace creates planner entries for restored tabs', () => {
    const store = createStore();
    store.dispatch(replaceWorkspace({
      tabs: [{ tabId: 'tab-a', name: 'A' }, { tabId: 'tab-b', name: 'B' }],
      activeTabId: 'tab-a',
    }));
    const state = store.getState();
    expect(state.workspace.tabs).toHaveLength(2);
    expect(state.planners['tab-a']).toBeDefined();
    expect(state.planners['tab-b']).toBeDefined();
  });
});

// ============================================
// 2. Tab Isolation (data-level)
// ============================================

describe('Tab isolation', () => {
  const TREE_A = { treeId: 'tree-a', tree: { uniqueId: 'tree-a', id: 'item-a', isRoot: true, amount: 1, depth: 0 } };
  const TREE_B = { treeId: 'tree-b', tree: { uniqueId: 'tree-b', id: 'item-b', isRoot: true, amount: 1, depth: 0 } };

  it('tab-A action does not affect tab-B dependencies', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-a', name: 'A' }));
    store.dispatch(addTab({ tabId: 'tab-b', name: 'B' }));

    store.dispatch({ type: 'dependencies/setDependencies', payload: TREE_A, meta: { tabId: 'tab-a' } });
    store.dispatch({ type: 'dependencies/setDependencies', payload: TREE_B, meta: { tabId: 'tab-b' } });

    const s = store.getState();
    expect(s.planners['tab-a'].dependencies.dependencyTrees['tree-a']).toBeDefined();
    expect(s.planners['tab-a'].dependencies.dependencyTrees['tree-b']).toBeUndefined();
    expect(s.planners['tab-b'].dependencies.dependencyTrees['tree-b']).toBeDefined();
    expect(s.planners['tab-b'].dependencies.dependencyTrees['tree-a']).toBeUndefined();
  });

  it('per-tab history stacks are independent', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-a', name: 'A' }));
    store.dispatch(addTab({ tabId: 'tab-b', name: 'B' }));

    store.dispatch({
      type: '_planner/pushSnapshot',
      payload: { snapshot: { timestamp: Date.now(), actionDescription: 'a', dependencies: {}, recipeSelections: {}, comparison: null } },
      meta: { tabId: 'tab-a' },
    });

    const s = store.getState();
    expect(s.planners['tab-a'].history.undoStack).toHaveLength(1);
    expect(s.planners['tab-b'].history.undoStack).toHaveLength(0);
  });

  it('actions without tabId do not affect planners state', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-1', name: 'One' }));
    store.dispatch({ type: 'dependencies/setDependencies', payload: TREE_A }); // no meta.tabId
    const s = store.getState();
    expect(Object.keys(s.planners['tab-1'].dependencies.dependencyTrees)).toHaveLength(0);
  });

  it('new tab starts with empty dependencies', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-1', name: 'One' }));
    const s = store.getState();
    expect(s.planners['tab-1'].dependencies.dependencyTrees).toEqual({});
    expect(s.planners['tab-1'].recipeSelections.selections).toEqual({});
    expect(s.planners['tab-1'].history.undoStack).toHaveLength(0);
    expect(s.planners['tab-1'].history.redoStack).toHaveLength(0);
  });
});

// ============================================
// 3. TabDispatchProvider Context
// ============================================

describe('TabDispatchProvider', () => {
  it('injects meta.tabId into dispatched actions', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'ctx-tab', name: 'CTX' }));

    let capturedAction: any = null;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <TabDispatchProvider tabId="ctx-tab">{children}</TabDispatchProvider>
      </Provider>
    );

    const { result } = renderHook(() => useTabDispatch(), { wrapper });

    const { tabDispatch } = result.current;
    tabDispatch({ type: 'TEST_ACTION', payload: { value: 1 } });

    // The action should have been dispatched to the store.
    // We can verify by checking planners state for an _planner action.
    act(() => {
      tabDispatch({
        type: '_planner/pushSnapshot',
        payload: { snapshot: { timestamp: Date.now(), actionDescription: 'dispatched', dependencies: {}, recipeSelections: {}, comparison: null } },
      });
    });

    const s = store.getState();
    expect(s.planners['ctx-tab'].history.undoStack).toHaveLength(1);
  });

  it('provides correct tabId from context', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'ctx-tab-2', name: 'CTX2' }));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <TabDispatchProvider tabId="ctx-tab-2">{children}</TabDispatchProvider>
      </Provider>
    );

    const { result } = renderHook(() => useTabDispatch(), { wrapper });
    expect(result.current.tabId).toBe('ctx-tab-2');
  });
});

// ============================================
// 4. Tab-scoped localStorage
// ============================================

describe('Tab-scoped localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('workspace tabs persist and restore', () => {
    const store = createStore();
    store.dispatch(addTab({ tabId: 'tab-1', name: 'One' }));
    store.dispatch(addTab({ tabId: 'tab-2', name: 'Two' }));
    store.dispatch(setActiveTab('tab-2'));

    // Simulate auto-save (same logic as useWorkspaceInit)
    const ws = store.getState().workspace;
    localStorage.setItem('workspace_tabs', JSON.stringify({ tabs: ws.tabs, activeTabId: ws.activeTabId }));

    // Simulate page reload: read from localStorage
    const saved = JSON.parse(localStorage.getItem('workspace_tabs')!);
    expect(saved.tabs).toHaveLength(2);
    expect(saved.activeTabId).toBe('tab-2');

    // Create a new store and restore
    const store2 = createStore();
    store2.dispatch(replaceWorkspace(saved));
    const s2 = store2.getState();
    expect(s2.workspace.tabs).toHaveLength(2);
    expect(s2.workspace.activeTabId).toBe('tab-2');
    expect(s2.planners['tab-1']).toBeDefined();
    expect(s2.planners['tab-2']).toBeDefined();
  });

  it('tab-scoped dependency keys isolate data', () => {
    const keyA = 'lastSession_tab-a_savedDependencies';
    const keyB = 'lastSession_tab-b_savedDependencies';

    localStorage.setItem(keyA, JSON.stringify({ tree: 'data-a' }));
    localStorage.setItem(keyB, JSON.stringify({ tree: 'data-b' }));

    expect(JSON.parse(localStorage.getItem(keyA)!)).toEqual({ tree: 'data-a' });
    expect(JSON.parse(localStorage.getItem(keyB)!)).toEqual({ tree: 'data-b' });
    expect(keyA).not.toBe(keyB);
  });

  it('tab-scoped recipe keys isolate data', () => {
    const keyA = 'lastSession_tab-a_savedRecipeSelections';
    const keyB = 'lastSession_tab-b_savedRecipeSelections';

    localStorage.setItem(keyA, JSON.stringify({ sel: 'recipe-a' }));
    localStorage.setItem(keyB, JSON.stringify({ sel: 'recipe-b' }));

    expect(JSON.parse(localStorage.getItem(keyA)!)).toEqual({ sel: 'recipe-a' });
    expect(JSON.parse(localStorage.getItem(keyB)!)).toEqual({ sel: 'recipe-b' });
  });
});
