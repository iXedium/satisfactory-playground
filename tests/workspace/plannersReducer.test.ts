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
});
