/**
 * Integration Tests - Dependency State Management
 * 
 * Tests for the dependency slice and tree management functionality.
 * These tests verify that Redux actions correctly update state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestStore,
  createMockTree,
  createMockDependencyState,
  createMockNode,
  mockIronPlateRecipe,
  mockIronIngotRecipe,
  TreeBuilder,
  getTrees,
  getTree,
  getTreeIds,
  findNode,
  countNodes,
  setDependencies,
  deleteTree,
} from '../utils';

describe('Dependency State Management', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Adding Trees', () => {
    it('should add a single tree to empty state', () => {
      const tree = createMockTree('Desc_IronPlate_C', {
        treeId: 'tree-1',
        amount: 20,
        recipe: mockIronPlateRecipe,
      });

      store.dispatch(setDependencies({ treeId: 'tree-1', tree }));

      expect(getTreeIds(store)).toHaveLength(1);
      expect(getTree(store, 'tree-1')).toBeDefined();
      expect(getTree(store, 'tree-1')?.amount).toBe(20);
    });

    it('should add multiple trees', () => {
      const tree1 = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      const tree2 = createMockTree('Desc_IronIngot_C', { treeId: 'tree-2' });

      store.dispatch(setDependencies({ treeId: 'tree-1', tree: tree1 }));
      store.dispatch(setDependencies({ treeId: 'tree-2', tree: tree2 }));

      expect(getTreeIds(store)).toHaveLength(2);
      expect(getTree(store, 'tree-1')?.id).toBe('Desc_IronPlate_C');
      expect(getTree(store, 'tree-2')?.id).toBe('Desc_IronIngot_C');
    });

    it('should update an existing tree', () => {
      const tree = createMockTree('Desc_IronPlate_C', {
        treeId: 'tree-1',
        amount: 20,
      });

      store.dispatch(setDependencies({ treeId: 'tree-1', tree }));
      expect(getTree(store, 'tree-1')?.amount).toBe(20);

      const updatedTree = createMockTree('Desc_IronPlate_C', {
        treeId: 'tree-1',
        amount: 50,
      });

      store.dispatch(setDependencies({ treeId: 'tree-1', tree: updatedTree }));
      expect(getTree(store, 'tree-1')?.amount).toBe(50);
      expect(getTreeIds(store)).toHaveLength(1); // Still only one tree
    });
  });

  describe('Removing Trees', () => {
    it('should remove a tree by ID', () => {
      const tree1 = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      const tree2 = createMockTree('Desc_IronIngot_C', { treeId: 'tree-2' });

      store.dispatch(setDependencies({ treeId: 'tree-1', tree: tree1 }));
      store.dispatch(setDependencies({ treeId: 'tree-2', tree: tree2 }));
      expect(getTreeIds(store)).toHaveLength(2);

      store.dispatch(deleteTree({ treeId: 'tree-1' }));

      expect(getTreeIds(store)).toHaveLength(1);
      expect(getTree(store, 'tree-1')).toBeUndefined();
      expect(getTree(store, 'tree-2')).toBeDefined();
    });

    it('should handle removing non-existent tree gracefully', () => {
      const tree = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      store.dispatch(setDependencies({ treeId: 'tree-1', tree }));

      // This should not throw
      store.dispatch(deleteTree({ treeId: 'non-existent' }));

      expect(getTreeIds(store)).toHaveLength(1);
    });
  });

  describe('Tree Structure', () => {
    it('should store trees with children', () => {
      const tree = new TreeBuilder('Desc_IronPlate_C', 'tree-1')
        .withAmount(20)
        .withRecipe(mockIronPlateRecipe)
        .addChild('Desc_IronIngot_C', (child) =>
          child
            .withAmount(30)
            .withRecipe(mockIronIngotRecipe)
            .addChild('Desc_OreIron_C', (ore) => ore.withAmount(30))
        )
        .build();

      store.dispatch(setDependencies({ treeId: 'tree-1', tree }));

      const storedTree = getTree(store, 'tree-1');
      expect(storedTree).toBeDefined();
      expect(storedTree?.children).toHaveLength(1);
      expect(storedTree?.children?.[0].children).toHaveLength(1);
      expect(countNodes(storedTree!)).toBe(3);
    });

    it('should find nodes by unique ID', () => {
      const tree = new TreeBuilder('Desc_IronPlate_C', 'tree-1')
        .withAmount(20)
        .addChild('Desc_IronIngot_C', (child) => child.withAmount(30))
        .build();

      store.dispatch(setDependencies({ treeId: 'tree-1', tree }));

      const ironIngotNode = findNode(store, 'tree-1-Desc_IronIngot_C-1');
      expect(ironIngotNode).toBeDefined();
      expect(ironIngotNode?.id).toBe('Desc_IronIngot_C');
    });
  });

  describe('Preloaded State', () => {
    it('should initialize with preloaded trees', () => {
      const preloadedTree = createMockTree('Desc_IronPlate_C', {
        treeId: 'preloaded',
        amount: 100,
      });

      const storeWithState = createTestStore({
        dependencies: createMockDependencyState({
          dependencyTrees: { preloaded: preloadedTree },
        }),
      });

      expect(getTree(storeWithState, 'preloaded')?.amount).toBe(100);
    });
  });
});
