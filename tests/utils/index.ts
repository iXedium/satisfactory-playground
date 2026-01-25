/**
 * Test Utilities Index
 * 
 * Central export point for all test utilities.
 * Import from 'tests/utils' in your test files.
 */

// Render utilities with providers
export {
  renderWithProviders,
  createTestStore,
  userEvent,
  // Re-export all testing-library utilities
  screen,
  within,
  waitFor,
  fireEvent,
  act,
} from './renderWithProviders';

export type { TestStore } from './renderWithProviders';

// Test helpers
export {
  // Async utilities
  waitForState,
  waitForTreeCount,
  waitForTree,
  // State selectors
  getTrees,
  getTree,
  getTreeIds,
  getRecipeSelections,
  getAccumulated,
  findNodeInTree,
  findNode,
  countNodes,
  // DOM query helpers
  getByTestId,
  queryByTestId,
  withinTestId,
  getAllByTestIdPattern,
  // Assertion helpers
  assertTreeStructure,
  assertNodeExists,
  // Action dispatchers
  setDependencies,
  deleteTree,
  updateNodeProperties,
  toggleNodeSelected,
  toggleNodeCompleted,
  setNodeMachineCount,
  setNodeMachineMultiplier,
  setNodeExcess,
  setRecipeSelection,
  clearRecipeSelections,
  loadRecipeSelections,
  setExpandedNodes,
} from './testHelpers';

// Mock data fixtures
export {
  // Items
  mockIronOre,
  mockIronIngot,
  mockIronPlate,
  mockIronRod,
  mockScrew,
  mockReinforcedIronPlate,
  // Recipes
  mockIronIngotRecipe,
  mockIronPlateRecipe,
  mockIronRodRecipe,
  mockScrewRecipe,
  mockReinforcedIronPlateRecipe,
  // Nodes
  createMockNode,
  createMockTree,
  mockIronPlateNode,
  mockIronIngotNode,
  mockIronOreNode,
  // State factories
  createMockDependencyState,
  createMockRootState,
  // Builders
  TreeBuilder,
  // Utilities
  resetNodeCounter,
} from './mockData';
