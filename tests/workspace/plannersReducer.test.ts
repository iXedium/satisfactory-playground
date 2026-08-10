import { describe, it, expect } from 'vitest';
import { plannersReducer } from '../../src/features/workspace/store/plannersReducer';

describe('plannersReducer — tab isolation', () => {
  it('routes an action with meta.tabId to the correct tab', () => {
    const actionA = {
      type: 'dependencies/setDependencies',
      payload: { treeId: 'tree1', tree: { uniqueId: 'tree1', id: 'iron-plate', isRoot: true, amount: 10, depth: 0 } },
      meta: { tabId: 'tab-a' },
    };

    const state = plannersReducer({}, actionA);
    const plannerA = state['tab-a'];

    // Tab A should have the tree
    expect(plannerA).toBeDefined();
    expect(plannerA!.dependencies.dependencyTrees).toEqual({ tree1: expect.objectContaining({ id: 'iron-plate' }) });

    // Tab B should NOT exist
    expect(state['tab-b']).toBeUndefined();
  });

  it('does not route actions without tabId', () => {
    const action = {
      type: 'dependencies/setDependencies',
      payload: { treeId: 'tree1', tree: { uniqueId: 'tree1', id: 'item', isRoot: true, amount: 1, depth: 0 } },
    };
    const state = plannersReducer({}, action);
    expect(state).toEqual({});
  });

  it('tabs are independent — Tab A action does not affect Tab B', () => {
    const state1 = plannersReducer({}, {
      type: 'dependencies/setDependencies',
      payload: { treeId: 'tree1', tree: { uniqueId: 'tree1', id: 'iron-plate', isRoot: true, amount: 10, depth: 0 } },
      meta: { tabId: 'tab-a' },
    });

    const state2 = plannersReducer(state1, {
      type: 'dependencies/setDependencies',
      payload: { treeId: 'tree2', tree: { uniqueId: 'tree2', id: 'screw', isRoot: true, amount: 20, depth: 0 } },
      meta: { tabId: 'tab-b' },
    });

    // Tab A still has only its tree
    expect(state2['tab-a']!.dependencies.dependencyTrees).toEqual({ tree1: expect.objectContaining({ id: 'iron-plate' }) });

    // Tab B has its own tree
    expect(state2['tab-b']!.dependencies.dependencyTrees).toEqual({ tree2: expect.objectContaining({ id: 'screw' }) });
  });

  it('_planner/pushSnapshot routes to planners[tabId].history.undoStack', () => {
    const snapshot = {
      timestamp: Date.now(),
      actionDescription: 'Test action',
      dependencies: {},
      recipeSelections: { selections: {} },
      comparison: null,
    };

    const state = plannersReducer({}, {
      type: '_planner/pushSnapshot',
      payload: { snapshot },
      meta: { tabId: 'tab-a' },
    });

    expect(state['tab-a']).toBeDefined();
    expect(state['tab-a']!.history.undoStack).toHaveLength(1);
    expect(state['tab-a']!.history.undoStack[0]).toEqual(snapshot);
    expect(state['tab-a']!.history.redoStack).toHaveLength(0);
    expect(state['tab-b']).toBeUndefined();
  });

  it('_planner/setRestoring manipulates per-tab isRestoring flag', () => {
    // Set restoring
    const s1 = plannersReducer({}, {
      type: '_planner/setRestoring',
      payload: { value: true },
      meta: { tabId: 'tab-a' },
    });
    expect(s1['tab-a']!.history.isRestoring).toBe(true);

    // Clear restoring
    const s2 = plannersReducer(s1, {
      type: '_planner/setRestoring',
      payload: { value: false },
      meta: { tabId: 'tab-a' },
    });
    expect(s2['tab-a']!.history.isRestoring).toBe(false);
  });

  it('does not route _planner/* actions without tabId', () => {
    const state = plannersReducer({}, {
      type: '_planner/pushSnapshot',
      payload: { snapshot: {} },
    });
    expect(state).toEqual({});
  });
});
