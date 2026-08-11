import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import dataReducer from '../../src/store/dataSlice';
import dependencyReducer from '../../src/features/factory-planner/store/dependencySlice';
import recipeSelectionsReducer from '../../src/features/factory-planner/store/recipeSelectionsSlice';
import treeUiReducer from '../../src/features/factory-planner/store/treeUiSlice';
import comparisonReducer from '../../src/features/factory-planner/store/comparisonSlice';
import historyReducer from '../../src/features/factory-planner/store/historySlice';
import workspaceReducer from '../../src/features/workspace/store/workspaceSlice';
import { plannersReducer } from '../../src/features/workspace/store/plannersReducer';
import { historyMiddleware } from '../../src/features/factory-planner/store/historyMiddleware';
import { addTab } from '../../src/features/workspace/store/workspaceSlice';
import { undoAction, redoAction } from '../../src/features/factory-planner/store/historyMiddleware';

function createTabStore() {
  const store = configureStore({
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
  store.dispatch(addTab({ tabId: 'test-tab', name: 'Test' }));
  return store;
}

const TAB_ID = 'test-tab';
const SNAPSHOT = {
  timestamp: Date.now(),
  actionDescription: 'test',
  dependencies: {},
  recipeSelections: { selections: {} },
  comparison: null,
};

function pushSnapshot(store: ReturnType<typeof createTabStore>) {
  store.dispatch({
    type: '_planner/pushSnapshot',
    payload: { snapshot: SNAPSHOT },
    meta: { tabId: TAB_ID },
  } as any);
}

describe('Tab-Scoped Planner Operations', () => {
  let store: ReturnType<typeof createTabStore>;

  beforeEach(() => {
    store = createTabStore();
  });

  it('tree creation dispatches with meta.tabId', () => {
    store.dispatch({
      type: 'dependencies/setDependencies',
      payload: { treeId: 'tree1', tree: { uniqueId: 'tree1', id: 'iron-plate', isRoot: true, amount: 10, depth: 0 } },
      meta: { tabId: TAB_ID },
    });

    const state = store.getState();
    expect(state.planners[TAB_ID]).toBeDefined();
    expect(state.planners[TAB_ID].dependencies.dependencyTrees['tree1']).toBeDefined();
  });

  it('per-tab history stores snapshot', () => {
    pushSnapshot(store);
    expect(store.getState().planners[TAB_ID].history.undoStack.length).toBe(1);
  });

  it('per-tab undoAction pops the undo stack', () => {
    pushSnapshot(store);
    store.dispatch(undoAction(TAB_ID) as any);
    expect(store.getState().planners[TAB_ID].history.undoStack.length).toBe(0);
    expect(store.getState().planners[TAB_ID].history.redoStack.length).toBe(1);
  });

  it('per-tab redoAction pops the redo stack', () => {
    pushSnapshot(store);
    store.dispatch(undoAction(TAB_ID) as any);
    store.dispatch(redoAction(TAB_ID) as any);
    expect(store.getState().planners[TAB_ID].history.undoStack.length).toBe(1);
  });

  it('Tab A operations do NOT affect Tab B', () => {
    store.dispatch(addTab({ tabId: 'tab-b', name: 'Tab B' }));

    store.dispatch({
      type: 'dependencies/setDependencies',
      payload: { treeId: 'tree-a', tree: { uniqueId: 'tree-a', id: 'item-a', isRoot: true, amount: 1, depth: 0 } },
      meta: { tabId: TAB_ID },
    });
    store.dispatch({
      type: 'dependencies/setDependencies',
      payload: { treeId: 'tree-b', tree: { uniqueId: 'tree-b', id: 'item-b', isRoot: true, amount: 1, depth: 0 } },
      meta: { tabId: 'tab-b' },
    });

    const s = store.getState();
    expect(s.planners[TAB_ID].dependencies.dependencyTrees['tree-a']).toBeDefined();
    expect(s.planners[TAB_ID].dependencies.dependencyTrees['tree-b']).toBeUndefined();
    expect(s.planners['tab-b'].dependencies.dependencyTrees['tree-b']).toBeDefined();
    expect(s.planners['tab-b'].dependencies.dependencyTrees['tree-a']).toBeUndefined();
  });

  it('activeOperations tracks begin/end', () => {
    store.dispatch({
      type: '_planner/beginOperation',
      payload: { operationId: 'op1', description: 'Test' },
      meta: { tabId: TAB_ID },
    });
    expect(store.getState().planners[TAB_ID].activeOperations['op1']).toBeDefined();

    store.dispatch({
      type: '_planner/endOperation',
      payload: { operationId: 'op1' },
      meta: { tabId: TAB_ID },
    });
    expect(store.getState().planners[TAB_ID].activeOperations['op1']).toBeUndefined();
  });
});
