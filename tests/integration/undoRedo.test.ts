/**
 * Undo/Redo Integration Tests
 * 
 * Comprehensive tests for the undo/redo history system.
 * Tests both Redux state changes and the history stack management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore, AnyAction, Dispatch } from '@reduxjs/toolkit';
import {
  createTestStore,
  createMockTree,
  createMockDependencyState,
  TreeBuilder,
  mockIronPlateRecipe,
  mockIronIngotRecipe,
  mockIronOreNode,
  setDependencies,
  deleteTree,
  setNodeExcess,
} from '../utils';

// Import actions and middleware directly for testing
import { 
  legacyUndoAction, 
  legacyRedoAction,
  beginHistoryTransaction,
  commitHistoryTransaction,
  cancelHistoryTransaction,
} from '../../src/features/factory-planner/store/historyMiddleware';
import { 
  clearHistory,
  pushSnapshot,
} from '../../src/features/factory-planner/store/historySlice';
import { loadSavedState } from '../../src/features/factory-planner/store/dependencySlice';
import { loadRecipeSelections } from '../../src/features/factory-planner/store/recipeSelectionsSlice';
import { updateExcessProduction } from '../../src/features/factory-planner/store/productionUpdateLogic';
import type { RootState, AppDispatch } from '../../src/store';
import { addTab } from '../../src/features/workspace/store/workspaceSlice';

const TAB_ID = 'test-tab';

// ============================================
// Helper Functions
// ============================================

function getUndoStackSize(state: RootState): number {
  return state.planners[TAB_ID]?.history?.undoStack?.length ?? 0;
}

function getRedoStackSize(state: RootState): number {
  return state.planners[TAB_ID]?.history?.redoStack?.length ?? 0;
}

function canUndo(state: RootState): boolean {
  return (state.planners[TAB_ID]?.history?.undoStack?.length ?? 0) > 0;
}

function canRedo(state: RootState): boolean {
  return (state.planners[TAB_ID]?.history?.redoStack?.length ?? 0) > 0;
}

function getTreeCount(state: RootState): number {
  return Object.keys(state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}).length;
}

function getTreeIds(state: RootState): string[] {
  return Object.keys(state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {});
}

function findTreeByRootId(state: RootState, itemId: string) {
  const trees = state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {};
  return Object.values(trees).find(tree => tree.id === itemId);
}

function getNodeExcess(state: RootState, nodeUniqueId: string): number | undefined {
  const trees = state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {};
  for (const tree of Object.values(trees)) {
    if (tree.uniqueId === nodeUniqueId) {
      return tree.excess ?? 0;
    }
    // Check children recursively
    const findInChildren = (node: typeof tree): number | undefined => {
      if (node.uniqueId === nodeUniqueId) {
        return node.excess ?? 0;
      }
      if (node.children) {
        for (const child of node.children) {
          const result = findInChildren(child);
          if (result !== undefined) return result;
        }
      }
      return undefined;
    };
    const result = findInChildren(tree);
    if (result !== undefined) return result;
  }
  return undefined;
}

/**
 * Asserts that state matches IMAGE 1 - Initial state after adding Iron Plate tree
 * - Iron Plate with no excess, machineCount=1
 * - Iron Ingot as child with no excess
 * - Iron Ore as grandchild with no excess
 */
function assertStateMatchesImage1(state: RootState, treeId: string) {
  // Should have 1 tree
  expect(getTreeCount(state)).toBe(1);
  
  // Get the tree
  const tree = state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}[treeId];
  expect(tree).toBeDefined();
  
  // Iron Plate (root)
  expect(tree.id).toBe('Desc_IronPlate_C');
  expect(tree.amount).toBe(20);
  expect(tree.excess ?? 0).toBe(0);
  expect(tree.machineCount ?? 1).toBe(1);
  
  // Iron Ingot (first child)
  expect(tree.children).toBeDefined();
  expect(tree.children!.length).toBeGreaterThanOrEqual(1);
  const ironIngotNode = tree.children!.find(c => c.id === 'Desc_IronIngot_C');
  expect(ironIngotNode).toBeDefined();
  expect(ironIngotNode!.amount).toBe(30);
  expect(ironIngotNode!.excess ?? 0).toBe(0);
  
  // Iron Ore (grandchild)
  expect(ironIngotNode!.children).toBeDefined();
  expect(ironIngotNode!.children!.length).toBeGreaterThanOrEqual(1);
  const ironOreNode = ironIngotNode!.children!.find(c => c.id === 'Desc_OreIron_C');
  expect(ironOreNode).toBeDefined();
  expect(ironOreNode!.amount).toBe(30);
  expect(ironOreNode!.excess ?? 0).toBe(0);
}

/**
 * Asserts that state matches IMAGE 2 - After setting Iron Plate excess to 20
 * - Iron Plate with excess=20, machineCount=1
 * - Iron Ingot unchanged
 * - Iron Ore unchanged
 */
function assertStateMatchesImage2(state: RootState, treeId: string) {
  // Should have 1 tree
  expect(getTreeCount(state)).toBe(1);
  
  // Get the tree
  const tree = state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}[treeId];
  expect(tree).toBeDefined();
  
  // Iron Plate (root) - EXCESS CHANGED TO 20
  expect(tree.id).toBe('Desc_IronPlate_C');
  expect(tree.amount).toBe(20);
  expect(tree.excess).toBe(20); // CHANGED
  expect(tree.machineCount ?? 1).toBe(1);
  
  // Iron Ingot (first child) - UNCHANGED
  expect(tree.children).toBeDefined();
  const ironIngotNode = tree.children!.find(c => c.id === 'Desc_IronIngot_C');
  expect(ironIngotNode).toBeDefined();
  expect(ironIngotNode!.excess ?? 0).toBe(0);
  
  // Iron Ore (grandchild) - UNCHANGED
  expect(ironIngotNode!.children).toBeDefined();
  const ironOreNode = ironIngotNode!.children!.find(c => c.id === 'Desc_OreIron_C');
  expect(ironOreNode).toBeDefined();
  expect(ironOreNode!.excess ?? 0).toBe(0);
}

// ============================================
// Test Suite
// ============================================

describe('Undo/Redo System', () => {
  let store: ReturnType<typeof createTestStore>;
  let dispatch: AppDispatch;
  let td: AppDispatch;

  beforeEach(() => {
    store = createTestStore();
    dispatch = store.dispatch as AppDispatch;
    td = ((action: any) => store.dispatch({ ...action, meta: { ...(action.meta || {}), tabId: TAB_ID } })) as AppDispatch;
    dispatch(addTab({ tabId: TAB_ID, name: 'Test' }));
    dispatch(clearHistory());
  });

  describe('History Stack Management', () => {
    it('should start with empty undo/redo stacks', () => {
      const state = store.getState();
      expect(getUndoStackSize(state)).toBe(0);
      expect(getRedoStackSize(state)).toBe(0);
      expect(canUndo(state)).toBe(false);
      expect(canRedo(state)).toBe(false);
    });

    it('should add to undo stack when action is dispatched', () => {
      // Dispatch an action that should be tracked
      const tree = createMockTree('Desc_IronPlate_C', {
        treeId: 'iron-plate-tree',
        amount: 20,
        recipe: mockIronPlateRecipe,
      });
      
      td(setDependencies({ treeId: 'iron-plate-tree', tree }));
      
      const state = store.getState();
      expect(getUndoStackSize(state)).toBe(1);
      expect(getRedoStackSize(state)).toBe(0);
      expect(canUndo(state)).toBe(true);
      expect(canRedo(state)).toBe(false);
    });

    it('should clear redo stack when new action is performed after undo', () => {
      // Add first tree
      const tree1 = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      td(setDependencies({ treeId: 'tree-1', tree: tree1 }));
      
      // Add second tree
      const tree2 = createMockTree('Desc_IronIngot_C', { treeId: 'tree-2' });
      td(setDependencies({ treeId: 'tree-2', tree: tree2 }));
      
      expect(getUndoStackSize(store.getState())).toBe(2);
      
      // Undo
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      expect(getRedoStackSize(store.getState())).toBe(1);
      
      // Add new tree (should clear redo stack)
      const tree3 = createMockTree('Desc_Wire_C', { treeId: 'tree-3' });
      td(setDependencies({ treeId: 'tree-3', tree: tree3 }));
      
      expect(getRedoStackSize(store.getState())).toBe(0);
    });
  });

  describe('Undo Operation', () => {
    it('should restore previous state when undoing', () => {
      // Start clean
      expect(getTreeCount(store.getState())).toBe(0);
      
      // Add a tree
      const tree = createMockTree('Desc_IronPlate_C', {
        treeId: 'iron-plate-tree',
        amount: 20,
      });
      td(setDependencies({ treeId: 'iron-plate-tree', tree }));
      
      expect(getTreeCount(store.getState())).toBe(1);
      expect(getUndoStackSize(store.getState())).toBe(1);
      
      // Undo
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      // Should be back to clean state
      expect(getTreeCount(store.getState())).toBe(0);
      expect(getRedoStackSize(store.getState())).toBe(1);
    });

    it('should do nothing when undo stack is empty', () => {
      expect(getUndoStackSize(store.getState())).toBe(0);
      
      // Try to undo
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      // Should still be empty
      expect(getUndoStackSize(store.getState())).toBe(0);
      expect(getRedoStackSize(store.getState())).toBe(0);
    });
  });

  describe('Redo Operation', () => {
    it('should restore next state when redoing', () => {
      // Add a tree
      const tree = createMockTree('Desc_IronPlate_C', {
        treeId: 'iron-plate-tree',
        amount: 20,
      });
      td(setDependencies({ treeId: 'iron-plate-tree', tree }));
      
      // Undo
      td(undoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(0);
      
      // Redo
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      // Should have tree back
      expect(getTreeCount(store.getState())).toBe(1);
      expect(store.getState().dependencies.dependencyTrees['iron-plate-tree']).toBeDefined();
    });

    it('should do nothing when redo stack is empty', () => {
      // Add and then don't undo
      const tree = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      td(setDependencies({ treeId: 'tree-1', tree }));
      
      expect(getRedoStackSize(store.getState())).toBe(0);
      
      // Try to redo
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      // Should be unchanged
      expect(getTreeCount(store.getState())).toBe(1);
      expect(getRedoStackSize(store.getState())).toBe(0);
    });
  });

  describe('Complete Undo/Redo Cycle', () => {
    const TREE_ID = 'iron-plate-tree';

    /**
     * Creates an Iron Plate tree with the following structure:
     * - Iron Plate (root, amount=20)
     *   - Iron Ingot (amount=30)
     *     - Iron Ore (amount=30)
     */
    function createIronPlateTree(excess: number = 0) {
      return new TreeBuilder('Desc_IronPlate_C', TREE_ID)
        .withAmount(20)
        .withRecipe(mockIronPlateRecipe)
        .withExcess(excess)
        .withMachineCount(1)
        .addChild('Desc_IronIngot_C', (ingot) =>
          ingot
            .withAmount(30)
            .withRecipe(mockIronIngotRecipe)
            .withMachineCount(1)
            .addChild('Desc_OreIron_C', (ore) =>
              ore.withAmount(30).withMachineCount(1)
            )
        )
        .build();
    }

    it('complete undo/redo cycle with exact state assertions', () => {
      // STEP 1: Add Iron Plate tree (no excess) - IMAGE 1 state
      const treeNoExcess = createIronPlateTree(0);
      td(setDependencies({ treeId: TREE_ID, tree: treeNoExcess }));
      
      let state = store.getState();
      assertStateMatchesImage1(state, TREE_ID);
      expect(getUndoStackSize(state)).toBe(1);
      expect(getRedoStackSize(state)).toBe(0);

      // STEP 2: Undo Add (return to clean slate)
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      expect(getTreeCount(state)).toBe(0);
      expect(getUndoStackSize(state)).toBe(0);
      expect(getRedoStackSize(state)).toBe(1);

      // STEP 3: Redo Add (restore IMAGE 1 exactly)
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      assertStateMatchesImage1(state, TREE_ID);
      expect(getUndoStackSize(state)).toBe(1);
      expect(getRedoStackSize(state)).toBe(0);

      // STEP 4: Set Iron Plate excess to 20 - IMAGE 2 state
      // Update the tree with new excess value
      const treeWithExcess = createIronPlateTree(20);
      td(setDependencies({ treeId: TREE_ID, tree: treeWithExcess }));
      
      state = store.getState();
      assertStateMatchesImage2(state, TREE_ID);
      expect(getUndoStackSize(state)).toBe(2);
      expect(getRedoStackSize(state)).toBe(0);

      // STEP 5: Undo excess change (return to IMAGE 1)
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      assertStateMatchesImage1(state, TREE_ID);
      expect(getUndoStackSize(state)).toBe(1);
      expect(getRedoStackSize(state)).toBe(1);

      // STEP 6: Redo excess change (restore IMAGE 2 exactly)
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      assertStateMatchesImage2(state, TREE_ID);
      expect(getUndoStackSize(state)).toBe(2);
      expect(getRedoStackSize(state)).toBe(0);

      // STEP 7: Undo excess change again (return to IMAGE 1)
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      assertStateMatchesImage1(state, TREE_ID);

      // STEP 8: Undo add (clean slate)
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      expect(getTreeCount(state)).toBe(0);

      // STEP 9: Redo add (restore IMAGE 1)
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      assertStateMatchesImage1(state, TREE_ID);

      // STEP 10: Redo excess (restore IMAGE 2)
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      assertStateMatchesImage2(state, TREE_ID);
    });

    it('should handle multiple sequential undo/redo operations', () => {
      // Add 3 trees
      for (let i = 1; i <= 3; i++) {
        const tree = createMockTree('Desc_IronPlate_C', { 
          treeId: `tree-${i}`,
          amount: i * 10,
        });
        td(setDependencies({ treeId: `tree-${i}`, tree }));
      }
      
      expect(getTreeCount(store.getState())).toBe(3);
      expect(getUndoStackSize(store.getState())).toBe(3);
      
      // Undo all
      td(undoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(2);
      
      td(undoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(1);
      
      td(undoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(0);
      
      expect(getUndoStackSize(store.getState())).toBe(0);
      expect(getRedoStackSize(store.getState())).toBe(3);
      
      // Redo all
      td(redoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(1);
      
      td(redoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(2);
      
      td(redoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(3);
      
      expect(getUndoStackSize(store.getState())).toBe(3);
      expect(getRedoStackSize(store.getState())).toBe(0);
    });
  });

  describe('System Actions Should NOT Create Undo Checkpoints', () => {
    it('loadSavedState should NOT create undo checkpoint when restoring', () => {
      // Simulate loading saved state (system action, not user action)
      td({ type: 'history/setRestoring', payload: true });
      
      const savedState = createMockDependencyState({
        dependencyTrees: {
          'loaded-tree': createMockTree('Desc_IronPlate_C', { treeId: 'loaded-tree' }),
        },
      });
      
      td(loadSavedState(savedState));
      td({ type: 'history/setRestoring', payload: false });
      
      // Should NOT have created undo checkpoint
      expect(getUndoStackSize(store.getState())).toBe(0);
      
      // But tree should be loaded
      expect(getTreeCount(store.getState())).toBe(1);
    });

    it('loadSavedState should NOT create undo checkpoint even when NOT restoring', () => {
      // This simulates app startup when loading from localStorage/IndexedDB
      // The loadSavedState action should NEVER create undo checkpoints,
      // regardless of the isRestoring flag
      
      const savedState = createMockDependencyState({
        dependencyTrees: {
          'startup-tree': createMockTree('Desc_IronPlate_C', { treeId: 'startup-tree' }),
        },
      });
      
      // Dispatch WITHOUT setting isRestoring flag (simulating app startup)
      td(loadSavedState(savedState));
      
      // Should NOT have created undo checkpoint
      expect(getUndoStackSize(store.getState())).toBe(0);
      
      // But tree should be loaded
      expect(getTreeCount(store.getState())).toBe(1);
    });

    it('loadRecipeSelections should NOT create undo checkpoint', () => {
      // This simulates loading recipe selections from saved state
      const savedSelections = { 'Desc_IronPlate_C': 'Recipe_IronPlate_C' };
      
      td(loadRecipeSelections(savedSelections));
      
      // Should NOT have created undo checkpoint
      expect(getUndoStackSize(store.getState())).toBe(0);
      
      // But selections should be loaded
      expect(store.getState().recipeSelections.selections).toEqual(savedSelections);
    });

    it('clearHistory should empty both stacks', () => {
      // Add some actions
      const tree1 = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      td(setDependencies({ treeId: 'tree-1', tree: tree1 }));
      
      const tree2 = createMockTree('Desc_IronIngot_C', { treeId: 'tree-2' });
      td(setDependencies({ treeId: 'tree-2', tree: tree2 }));
      
      // Undo one
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      expect(getUndoStackSize(store.getState())).toBe(1);
      expect(getRedoStackSize(store.getState())).toBe(1);
      
      // Clear history
      td(addTab({ tabId: TAB_ID, name: 'Test' }));
    td(clearHistory());
      
      expect(getUndoStackSize(store.getState())).toBe(0);
      expect(getRedoStackSize(store.getState())).toBe(0);
      expect(canUndo(store.getState())).toBe(false);
      expect(canRedo(store.getState())).toBe(false);
    });
  });

  describe('Transaction-based History', () => {
    it('should group multiple actions in transaction into single undo checkpoint', () => {
      // Start a transaction
      td(beginHistoryTransaction('Add complex tree', TAB_ID) as unknown as AnyAction);
      
      // Dispatch multiple actions within transaction
      const tree1 = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      td(setDependencies({ treeId: 'tree-1', tree: tree1 }));
      
      const tree2 = createMockTree('Desc_IronIngot_C', { treeId: 'tree-2' });
      td(setDependencies({ treeId: 'tree-2', tree: tree2 }));
      
      // During transaction, these should NOT be in undo stack yet
      // (middleware skips recording during transaction)
      
      // Commit transaction
      td(commitHistoryTransaction(TAB_ID) as unknown as AnyAction);
      
      // Should have exactly ONE undo checkpoint
      expect(getUndoStackSize(store.getState())).toBe(1);
      
      // Undo should restore to pre-transaction state (no trees)
      td(undoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(0);
    });

    it('should cancel transaction without creating undo checkpoint', () => {
      // Start a transaction
      td(beginHistoryTransaction('Cancelled action', TAB_ID) as unknown as AnyAction);
      
      const tree = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      td(setDependencies({ treeId: 'tree-1', tree }));
      
      // Cancel transaction
      td(cancelHistoryTransaction(TAB_ID) as unknown as AnyAction);
      
      // Should have NO undo checkpoints
      expect(getUndoStackSize(store.getState())).toBe(0);
      
      // But tree is still there (we don't rollback state, just don't record)
      expect(getTreeCount(store.getState())).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undo when isRestoring flag is set', () => {
      const tree = createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' });
      td(setDependencies({ treeId: 'tree-1', tree }));
      
      // Set restoring flag (simulates already in undo operation)
      td({ type: 'history/setRestoring', payload: true });
      
      // Try to add another tree
      const tree2 = createMockTree('Desc_IronIngot_C', { treeId: 'tree-2' });
      td(setDependencies({ treeId: 'tree-2', tree: tree2 }));
      
      td({ type: 'history/setRestoring', payload: false });
      
      // Second add should NOT be recorded (only 1 undo checkpoint)
      expect(getUndoStackSize(store.getState())).toBe(1);
    });

    it('should maintain tree data integrity through undo/redo cycles', () => {
      const originalTree = new TreeBuilder('Desc_IronPlate_C', 'my-tree')
        .withAmount(42)
        .withExcess(15)
        .withMachineCount(3)
        .addChild('Desc_IronIngot_C', (ingot) =>
          ingot.withAmount(63).withExcess(8)
        )
        .build();
      
      td(setDependencies({ treeId: 'my-tree', tree: originalTree }));
      
      // Undo
      td(undoAction(TAB_ID) as unknown as AnyAction);
      expect(getTreeCount(store.getState())).toBe(0);
      
      // Redo
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      // Verify all values are restored exactly
      const restoredTree = store.getState().dependencies.dependencyTrees['my-tree'];
      expect(restoredTree.amount).toBe(42);
      expect(restoredTree.excess).toBe(15);
      expect(restoredTree.machineCount).toBe(3);
      expect(restoredTree.children![0].amount).toBe(63);
      expect(restoredTree.children![0].excess).toBe(8);
    });

    it('should capture excess changes via updateExcessProduction action', () => {
      // This tests the EXACT flow when a user changes excess in the UI:
      // 1. Add tree with excess=0
      // 2. Dispatch updateExcessProduction to set excess=20
      // 3. Undo should restore excess=0
      // 4. Redo should restore excess=20
      
      const TREE_ID = 'excess-test-tree';
      // The TreeBuilder uses TREE_ID directly as the root node's uniqueId
      const NODE_ID = TREE_ID;
      
      // Step 1: Add tree with NO excess
      const tree = new TreeBuilder('Desc_IronPlate_C', TREE_ID)
        .withAmount(20)
        .withExcess(0)
        .build();
      
      td(setDependencies({ treeId: TREE_ID, tree }));
      
      let state = store.getState();
      expect(state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}[TREE_ID].uniqueId).toBe(NODE_ID);
      expect(state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}[TREE_ID].excess).toBe(0);
      expect(getUndoStackSize(state)).toBe(1);
      
      // Step 2: Set excess to 20 using the same action the UI uses
      td(updateExcessProduction({ 
        nodeId: NODE_ID, 
        treeId: TREE_ID, 
        amount: 20 
      }));
      
      state = store.getState();
      expect(state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}[TREE_ID].excess).toBe(20);
      expect(getUndoStackSize(state)).toBe(2);
      
      // Step 3: Undo should restore excess=0
      td(undoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      expect(state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}[TREE_ID].excess).toBe(0);
      expect(getUndoStackSize(state)).toBe(1);
      expect(getRedoStackSize(state)).toBe(1);
      
      // Step 4: Redo should restore excess=20
      td(redoAction(TAB_ID) as unknown as AnyAction);
      
      state = store.getState();
      expect(state.planners[TAB_ID]?.dependencies?.dependencyTrees ?? {}[TREE_ID].excess).toBe(20);
      expect(getUndoStackSize(state)).toBe(2);
      expect(getRedoStackSize(state)).toBe(0);
    });
  });
});
