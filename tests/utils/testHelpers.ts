/**
 * Test Helpers
 * 
 * Utility functions for common testing patterns including:
 * - Async state updates
 * - Redux action dispatching
 * - DOM queries
 * - State assertions
 */

import { waitFor, screen, within } from '@testing-library/react';
import type { RootState, AppDispatch } from '../../src/store';
import type { TestStore } from './renderWithProviders';
import type { DependencyNode, Recipe, Item } from '../../src/types';

// ============================================
// Async Utilities
// ============================================

/**
 * Wait for a Redux state condition to be true
 * 
 * @example
 * ```ts
 * await waitForState(store, (state) => state.dependencies.dependencyTrees['tree-1'] !== undefined);
 * ```
 */
export async function waitForState(
  store: TestStore,
  predicate: (state: RootState) => boolean,
  options?: { timeout?: number; interval?: number }
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options ?? {};
  
  return waitFor(
    () => {
      if (!predicate(store.getState())) {
        throw new Error('State condition not met');
      }
    },
    { timeout, interval }
  );
}

/**
 * Wait for a specific number of trees to exist
 */
export async function waitForTreeCount(
  store: TestStore,
  count: number,
  options?: { timeout?: number }
): Promise<void> {
  return waitForState(
    store,
    (state) => Object.keys(state.dependencies.dependencyTrees).length === count,
    options
  );
}

/**
 * Wait for a specific tree to exist
 */
export async function waitForTree(
  store: TestStore,
  treeId: string,
  options?: { timeout?: number }
): Promise<DependencyNode> {
  await waitForState(
    store,
    (state) => state.dependencies.dependencyTrees[treeId] !== undefined,
    options
  );
  return store.getState().dependencies.dependencyTrees[treeId];
}

// ============================================
// State Selectors
// ============================================

/**
 * Get all dependency trees from state
 */
export function getTrees(store: TestStore): Record<string, DependencyNode> {
  return store.getState().dependencies.dependencyTrees;
}

/**
 * Get a specific tree by ID
 */
export function getTree(store: TestStore, treeId: string): DependencyNode | undefined {
  return store.getState().dependencies.dependencyTrees[treeId];
}

/**
 * Get tree IDs as an array
 */
export function getTreeIds(store: TestStore): string[] {
  return Object.keys(store.getState().dependencies.dependencyTrees);
}

/**
 * Get recipe selections
 */
export function getRecipeSelections(store: TestStore): Record<string, string> {
  return store.getState().recipeSelections.selections;
}

/**
 * Get accumulated dependencies
 */
export function getAccumulated(store: TestStore) {
  return store.getState().dependencies.accumulatedDependencies;
}

/**
 * Find a node in a tree by its unique ID (recursive search)
 */
export function findNodeInTree(
  tree: DependencyNode,
  uniqueId: string
): DependencyNode | undefined {
  if (tree.uniqueId === uniqueId) {
    return tree;
  }
  
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeInTree(child, uniqueId);
      if (found) return found;
    }
  }
  
  return undefined;
}

/**
 * Find a node in any tree by unique ID
 */
export function findNode(
  store: TestStore,
  uniqueId: string
): DependencyNode | undefined {
  const trees = getTrees(store);
  for (const tree of Object.values(trees)) {
    const found = findNodeInTree(tree, uniqueId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Count total nodes in a tree (including children)
 */
export function countNodes(tree: DependencyNode): number {
  let count = 1;
  if (tree.children) {
    for (const child of tree.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// ============================================
// DOM Query Helpers
// ============================================

/**
 * Get elements by test ID with type safety
 */
export function getByTestId(testId: string) {
  return screen.getByTestId(testId);
}

/**
 * Query elements by test ID (returns null if not found)
 */
export function queryByTestId(testId: string) {
  return screen.queryByTestId(testId);
}

/**
 * Find elements within a container by test ID
 */
export function withinTestId(testId: string) {
  return within(screen.getByTestId(testId));
}

/**
 * Get all elements matching a test ID pattern
 */
export function getAllByTestIdPattern(pattern: RegExp) {
  return screen.getAllByTestId(pattern);
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert that a tree has a specific structure
 */
export function assertTreeStructure(
  tree: DependencyNode,
  expected: {
    id: string;
    amount?: number;
    childCount?: number;
    hasRecipe?: boolean;
  }
) {
  expect(tree.id).toBe(expected.id);
  
  if (expected.amount !== undefined) {
    expect(tree.amount).toBe(expected.amount);
  }
  
  if (expected.childCount !== undefined) {
    expect(tree.children?.length ?? 0).toBe(expected.childCount);
  }
  
  if (expected.hasRecipe !== undefined) {
    if (expected.hasRecipe) {
      expect(tree.recipe).toBeDefined();
    } else {
      expect(tree.recipe).toBeUndefined();
    }
  }
}

/**
 * Assert that a node exists with specific properties
 */
export function assertNodeExists(
  store: TestStore,
  uniqueId: string,
  expectedProps?: Partial<DependencyNode>
) {
  const node = findNode(store, uniqueId);
  expect(node).toBeDefined();
  
  if (expectedProps && node) {
    for (const [key, value] of Object.entries(expectedProps)) {
      expect(node[key as keyof DependencyNode]).toEqual(value);
    }
  }
  
  return node;
}

// ============================================
// Action Dispatchers
// ============================================

/**
 * Import commonly used actions for easy dispatching in tests
 */
export { 
  setDependencies, 
  deleteTree,
  updateNodeProperties,
  toggleNodeSelected,
  toggleNodeCompleted,
  setNodeMachineCount,
  setNodeMachineMultiplier,
  setNodeExcess,
} from '../../src/features/factory-planner/store/dependencySlice';
export { setRecipeSelection, clearRecipeSelections, loadRecipeSelections } from '../../src/features/factory-planner/store/recipeSelectionsSlice';
export { setExpandedNodes } from '../../src/features/factory-planner/store/treeUiSlice';
