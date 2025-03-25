import { calculateDependencyTree, clearNodeCache } from '../utils/calculateDependencyTree';
import * as dbQueries from '../data/dbQueries'; // Import the module to spy on the mocked functions

// Import the mock setup
import './mockData';

describe('Import Excess Bug Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear node cache
    clearNodeCache();
  });

  it('should maintain import connections when changing excess on parent node', async () => {
    // Set up spies on the actual (mocked) functions
    const getRecipeByIdSpy = jest.spyOn(dbQueries, 'getRecipeById');
    const getRecipesForItemSpy = jest.spyOn(dbQueries, 'getRecipesForItem');
    
    // Calculate the first tree: iron-rod with excess=15
    const ironRodTree = await calculateDependencyTree(
      'iron_rod',
      0, // Initial amount
      'recipe_iron_rod', // Recipe ID
      {}, // No recipe selections yet
      0, // Initial depth
      [], // No affected branches
      'tree-iron-rod', // Parent ID for iron-rod tree
      { 'iron_rod': 15 }, // Initial excess of 15
      {} // No imports yet
    );

    // Verify the initial tree structure
    expect(ironRodTree.id).toBe('iron_rod');
    expect(ironRodTree.excess).toBe(15);
    expect(ironRodTree.children?.[0].id).toBe('iron_ingot');
    expect(ironRodTree.children?.[0].amount).toBe(15); // Base amount is 0, but with excess 15

    // Create a second tree: iron-ingot (standalone tree to import from)
    const ironIngotTree = await calculateDependencyTree(
      'iron_ingot',
      15, // Initial amount matching iron-rod's need
      'recipe_iron_ingot',
      {},
      0,
      [],
      'tree-iron-ingot', // Parent ID for iron-ingot tree
      {},
      {}
    );

    // Verify the iron ingot tree
    expect(ironIngotTree.id).toBe('iron_ingot');
    expect(ironIngotTree.amount).toBe(15);
    expect(ironIngotTree.children?.[0].id).toBe('iron_ore');
    
    // Create import relationship - iron-rod imports iron-ingot
    const childUniqueId = ironRodTree.children?.[0].uniqueId || '';
    const importMap = {
      [childUniqueId]: {
        targetTreeId: ironIngotTree.uniqueId,
        amount: 15
      }
    };

    // Recalculate iron-rod tree with the import relationship
    const treeWithImport = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      { 'iron_rod': 15 },
      importMap
    );

    // Verify import setup
    const importNode = treeWithImport.children?.[0];
    expect(importNode?.isImport).toBe(true);
    expect(importNode?.importedFrom).toBe(ironIngotTree.uniqueId);
    expect(importNode?.amount).toBe(15);
    expect(importNode?.children?.length).toBe(0); // Import nodes have no children

    // Now change excess to 20 and recalculate
    const treeWithNewExcess = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      { 'iron_rod': 20 }, // Increased excess to 20
      importMap
    );

    // Verify import connection is maintained and amounts are updated
    expect(treeWithNewExcess.excess).toBe(20);
    const updatedImportNode = treeWithNewExcess.children?.[0];
    expect(updatedImportNode?.isImport).toBe(true);
    expect(updatedImportNode?.importedFrom).toBe(ironIngotTree.uniqueId);
    expect(updatedImportNode?.amount).toBe(20);
    expect(updatedImportNode?.children?.length).toBe(0);

    // Here we would simulate the update to the target tree in a full app
    // We can manually create what the updated iron ingot tree should look like
    const updatedIronIngotTree = await calculateDependencyTree(
      'iron_ingot',
      20, // Updated amount from 15 to 20
      'recipe_iron_ingot',
      {},
      0,
      [],
      'tree-iron-ingot',
      {},
      {}
    );

    // Verify the iron ingot tree has the updated amount
    expect(updatedIronIngotTree.amount).toBe(20);
    expect(updatedIronIngotTree.children?.[0].id).toBe('iron_ore');
    expect(updatedIronIngotTree.children?.[0].amount).toBe(20); // Should update to match parent's need
    
    // Verify recipe queries were made
    expect(getRecipeByIdSpy).toHaveBeenCalledWith('recipe_iron_rod');
    expect(getRecipeByIdSpy).toHaveBeenCalledWith('recipe_iron_ingot');
    expect(getRecipesForItemSpy).toHaveBeenCalledWith('iron_rod');
    expect(getRecipesForItemSpy).toHaveBeenCalledWith('iron_ingot');
    expect(getRecipesForItemSpy).toHaveBeenCalledWith('iron_ore');
  });
}); 