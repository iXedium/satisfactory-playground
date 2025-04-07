import { calculateDependencyTree, clearNodeCache } from '../utils/calculateDependencyTree';
import * as dbQueries from '../data/dbQueries'; // Import the module to spy on the mocked functions
import dependencyReducer, { importNodeAction, setDependencies, loadSavedState } from '../features/dependencySlice';
import { AccumulatedNode } from '../utils/calculateAccumulatedFromTree';
import { configureStore } from '@reduxjs/toolkit';
import { findNodeById } from '../utils/nodeReferenceUtils';
import { DependencyNode } from '../utils/calculateDependencyTree';
import { DependencyState } from '../features/dependencySlice';

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
    expect(importNode?.isImport || (importNode?.importReference !== undefined)).toBe(true);
    expect(importNode?.importedFrom || importNode?.importReference?.targetTreeId).toBe(ironIngotTree.uniqueId);
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
    expect(updatedImportNode?.isImport || (updatedImportNode?.importReference !== undefined)).toBe(true);
    expect(updatedImportNode?.importedFrom || updatedImportNode?.importReference?.targetTreeId).toBe(ironIngotTree.uniqueId);
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

  it('should restore original children when unimporting a node', async () => {
    // Set up spies on the actual (mocked) functions
    const getRecipeByIdSpy = jest.spyOn(dbQueries, 'getRecipeById');
    const getRecipesForItemSpy = jest.spyOn(dbQueries, 'getRecipesForItem');
    
    // Create a test state with the nodes we need to test the import/unimport functionality
    // First, calculate the iron rod tree
    const ironRodTree = await calculateDependencyTree(
      'iron_rod',
      0, // Initial amount
      'recipe_iron_rod', // Recipe ID
      {}, // No recipe selections yet
      0, // Initial depth
      [], // No affected branches
      'tree-iron-rod', // Parent ID for iron-rod tree
      { 'iron_rod': 16 }, // Initial excess of 16
      {} // No imports yet
    );

    // Verify the initial iron rod tree structure
    expect(ironRodTree.id).toBe('iron_rod');
    expect(ironRodTree.excess).toBe(16);
    expect(ironRodTree.children?.[0].id).toBe('iron_ingot');
    expect(ironRodTree.children?.[0].amount).toBe(16);
    
    // Original iron ingot must have an iron ore child
    const ironIngotChild = ironRodTree.children?.[0];
    expect(ironIngotChild).toBeDefined();
    expect(ironIngotChild?.children?.[0].id).toBe('iron_ore');
    expect(ironIngotChild?.children?.[0].amount).toBe(16);

    // Create a second tree: iron-ingot (standalone tree to import from)
    const ironIngotTree = await calculateDependencyTree(
      'iron_ingot',
      16, // Initial amount matching iron-rod's need
      'recipe_iron_ingot',
      {},
      0,
      [],
      'tree-iron-ingot', // Parent ID for iron-ingot tree
      {},
      {}
    );

    // Verify the stand-alone iron ingot tree
    expect(ironIngotTree.id).toBe('iron_ingot');
    expect(ironIngotTree.amount).toBe(16);
    expect(ironIngotTree.children?.[0].id).toBe('iron_ore');
    expect(ironIngotTree.children?.[0].amount).toBe(16);

    // Create import relationship - iron-rod imports iron-ingot
    const ironIngotChildId = ironRodTree.children?.[0].uniqueId || '';
    const importMap = {
      [ironIngotChildId]: {
        targetTreeId: ironIngotTree.uniqueId,
        amount: 16
      }
    };

    // First, check that when we create an import, we store the original children
    // This should save originalChildren with the iron ore node
    const treeWithImport = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      { 'iron_rod': 16 },
      importMap
    );

    // Verify import setup
    const importNode = treeWithImport.children?.[0];
    expect(importNode?.isImport || (importNode?.importReference !== undefined)).toBe(true);
    expect(importNode?.importedFrom || importNode?.importReference?.targetTreeId).toBe(ironIngotTree.uniqueId);
    expect(importNode?.amount).toBe(16);
    expect(importNode?.children?.length).toBe(0); // Import nodes have no children
    
    // Now, simulate unimporting by removing the import relationship
    // and recalculating the tree
    const unimportMap = {}; // Empty import map
    
    const treeAfterUnimport = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      { 'iron_rod': 16 },
      unimportMap
    );

    // Verify that after unimporting:
    // 1. The iron ingot node is no longer an import
    const unimportedNode = treeAfterUnimport.children?.[0];
    expect(unimportedNode?.isImport || (unimportedNode?.importReference !== undefined)).toBeFalsy();
    
    // 2. The iron ingot has its children restored - should have iron ore child
    expect(unimportedNode?.children).toBeDefined();
    expect(unimportedNode?.children?.length).toBeGreaterThan(0);
    expect(unimportedNode?.children?.[0].id).toBe('iron_ore');
    expect(unimportedNode?.children?.[0].amount).toBe(16);
    
    // 3. The iron ore node is correctly calculated
    const ironOreNode = unimportedNode?.children?.[0];
    expect(ironOreNode).toBeDefined();
    expect(ironOreNode?.id).toBe('iron_ore');
    expect(ironOreNode?.amount).toBe(16);
    
    // Verify recipe queries were made for both the import and unimport paths
    expect(getRecipeByIdSpy).toHaveBeenCalledWith('recipe_iron_rod');
    expect(getRecipeByIdSpy).toHaveBeenCalledWith('recipe_iron_ingot');
    expect(getRecipesForItemSpy).toHaveBeenCalledWith('iron_ore');
  });

  it('should correctly restore children when using the importNode Redux action', () => {
    // SETUP
    // Create an initial dependency state with two trees
    const initialState: DependencyState = {
      dependencyTrees: {
        'tree-iron-rod': {
          id: 'iron_rod',
          amount: 15,
          uniqueId: 'tree-iron-rod',
          isRoot: true,
          children: [
            {
              id: 'iron_ingot',
              amount: 15, 
              uniqueId: 'tree-iron-rod-iron_ingot-1',
              children: [
                {
                  id: 'iron_ore',
                  amount: 15,
                  uniqueId: 'tree-iron-rod-iron_ingot-1-iron_ore-2',
                  children: [],
                  excess: 0
                }
              ],
              excess: 0
            }
          ],
          excess: 0
        },
        'tree-iron-ingot': {
          id: 'iron_ingot',
          amount: 0,
          uniqueId: 'tree-iron-ingot',
          isRoot: true,
          children: [
            {
              id: 'iron_ore',
              amount: 0,
              uniqueId: 'tree-iron-ingot-iron_ore-1',
              children: [],
              excess: 0
            }
          ],
          excess: 0
        }
      },
      accumulatedDependencies: {},
      errors: []
    };

    // ACTION 1: Perform an import operation
    const afterImport = dependencyReducer(initialState, {
      type: 'dependency/importNode',
      payload: {
        nodeId: 'tree-iron-rod-iron_ingot-1',
        sourceTreeId: 'tree-iron-rod',
        targetTreeId: 'tree-iron-ingot',
        shouldImport: true
      }
    });

    // ASSERTIONS 1: Verify the import worked properly
    // Verify the import happened correctly
    const sourceNodeAfterImport = afterImport.dependencyTrees['tree-iron-rod']?.children?.[0];
    expect(sourceNodeAfterImport?.isImport || (sourceNodeAfterImport?.importReference !== undefined)).toBe(true);
    expect(sourceNodeAfterImport?.importedFrom || sourceNodeAfterImport?.importReference?.targetTreeId).toBe('tree-iron-ingot');
    expect(sourceNodeAfterImport?.children?.length).toBe(0); // Import nodes have no children
    expect(sourceNodeAfterImport?.originalChildren).toBeDefined(); // Original children should be saved

    // Target tree should have amount increased
    const targetTree = afterImport.dependencyTrees['tree-iron-ingot'];
    expect(targetTree?.amount).toBe(15); // Amount should be transferred

    // ACTION 2: Perform an unimport operation
    const afterUnimport = dependencyReducer(afterImport, {
      type: 'dependency/unimportNode',
      payload: {
        nodeId: 'tree-iron-rod-iron_ingot-1',
        sourceTreeId: 'tree-iron-rod',
        targetTreeId: 'tree-iron-ingot'
      }
    });

    // ASSERTIONS 2: Verify the unimport restored the original structure
    const sourceNodeAfterUnimport = afterUnimport.dependencyTrees['tree-iron-rod']?.children?.[0];
    expect(sourceNodeAfterUnimport?.isImport || (sourceNodeAfterUnimport?.importReference !== undefined)).toBeFalsy();
    expect(sourceNodeAfterUnimport?.children?.length).toBe(1); // Children should be restored
    
    const childNode = sourceNodeAfterUnimport?.children?.[0];
    expect(childNode?.id).toBe('iron_ore');
    expect(childNode?.amount).toBe(15);

    // Target tree amount should be back to 0
    const targetTreeAfter = afterUnimport.dependencyTrees['tree-iron-ingot'];
    expect(targetTreeAfter?.amount).toBe(0);
  });

  it('should restore full chain when unimporting a node after excess was changed', async () => {
    // Set up spies on the actual (mocked) functions
    const getRecipeByIdSpy = jest.spyOn(dbQueries, 'getRecipeById');
    const getRecipesForItemSpy = jest.spyOn(dbQueries, 'getRecipesForItem');
    
    // 1. Create a new iron rod tree without any excess
    const ironRodTree = await calculateDependencyTree(
      'iron_rod',
      0, // Initial amount (no excess yet)
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      {}, // No excess initially
      {}
    );

    // Verify the initial tree structure with no excess
    expect(ironRodTree.id).toBe('iron_rod');
    expect(ironRodTree.excess).toBe(0);
    expect(ironRodTree.children?.[0].id).toBe('iron_ingot');
    expect(ironRodTree.children?.[0].amount).toBe(0); // No amount since no excess
    expect(ironRodTree.children?.[0].children?.[0].id).toBe('iron_ore');
    expect(ironRodTree.children?.[0].children?.[0].amount).toBe(0);
    
    // 2. Create a target tree for import
    const ironIngotTree = await calculateDependencyTree(
      'iron_ingot',
      0, // Initial amount
      'recipe_iron_ingot',
      {},
      0,
      [],
      'tree-iron-ingot',
      {},
      {}
    );

    // 3. Import the iron ingot node BEFORE adding excess
    const childUniqueId = ironRodTree.children?.[0].uniqueId || '';
    const importMap = {
      [childUniqueId]: {
        targetTreeId: ironIngotTree.uniqueId,
        amount: 0
      }
    };

    const treeWithImport = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      {}, // Still no excess
      importMap
    );

    // Verify the import was set up correctly
    const importedNode = treeWithImport.children?.[0];
    expect(importedNode?.isImport).toBe(true);
    expect(importedNode?.importedFrom).toBe(ironIngotTree.uniqueId);
    expect(importedNode?.amount).toBe(0); // No amount yet
    expect(importedNode?.children?.length).toBe(0); // Import nodes have no children

    // 4. Now add excess AFTER the import was set up
    const excessMap = { 'iron_rod': 15 };
    const treeWithExcess = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      excessMap,
      importMap
    );

    // Verify excess was applied and import relationship maintained
    expect(treeWithExcess.excess).toBe(15);
    const importedNodeWithExcess = treeWithExcess.children?.[0];
    expect(importedNodeWithExcess?.isImport).toBe(true);
    expect(importedNodeWithExcess?.importedFrom).toBe(ironIngotTree.uniqueId);
    expect(importedNodeWithExcess?.amount).toBe(15); // Amount now reflects excess
    expect(importedNodeWithExcess?.children?.length).toBe(0); // Still no children
    expect(importedNodeWithExcess?.originalChildren).toBeDefined(); // Should have original children stored

    // 5. Finally, unimport to verify the iron ore child is restored
    const unimportMap = {};
    const treeAfterUnimport = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod',
      excessMap, // Keep the excess
      unimportMap 
    );

    // Critical test: verify the full chain is restored
    expect(treeAfterUnimport.excess).toBe(15); // Excess remains
    const unimportedNode = treeAfterUnimport.children?.[0];
    expect(unimportedNode?.isImport).toBeFalsy();
    expect(unimportedNode?.amount).toBe(15); // Amount should be preserved
    
    // Verify the iron ore child is restored
    expect(unimportedNode?.children?.length).toBeGreaterThan(0);
    expect(unimportedNode?.children?.[0].id).toBe('iron_ore');
    expect(unimportedNode?.children?.[0].amount).toBe(15);
    
    // Verify recipe queries
    expect(getRecipeByIdSpy).toHaveBeenCalledWith('recipe_iron_rod');
    expect(getRecipeByIdSpy).toHaveBeenCalledWith('recipe_iron_ingot');
    expect(getRecipesForItemSpy).toHaveBeenCalledWith('iron_ore');
  });

  it('should correctly restore children in Redux when unimporting after adding excess', () => {
    // Set up initial state with two trees
    const initialState: DependencyState = {
      dependencyTrees: {
        'tree-iron-rod': {
          id: 'iron_rod',
          amount: 15,
          uniqueId: 'tree-iron-rod',
          isRoot: true,
          children: [
            {
              id: 'iron_ingot',
              amount: 15, 
              uniqueId: 'tree-iron-rod-iron_ingot-1',
              children: [
                {
                  id: 'iron_ore',
                  amount: 15,
                  uniqueId: 'tree-iron-rod-iron_ingot-1-iron_ore-2',
                  children: [],
                  excess: 0
                }
              ],
              excess: 0
            }
          ],
          excess: 0
        },
        'tree-iron-ingot': {
          id: 'iron_ingot',
          amount: 0,
          uniqueId: 'tree-iron-ingot',
          isRoot: true,
          children: [
            {
              id: 'iron_ore',
              amount: 0,
              uniqueId: 'tree-iron-ingot-iron_ore-1',
              children: [],
              excess: 0
            }
          ],
          excess: 0
        }
      },
      accumulatedDependencies: {},
      errors: []
    };

    // Step.1: Import the iron ingot from iron rod tree to the iron ingot tree
    const afterImport = dependencyReducer(initialState, {
      type: 'dependency/importNode',
      payload: {
        nodeId: 'tree-iron-rod-iron_ingot-1',
        sourceTreeId: 'tree-iron-rod',
        targetTreeId: 'tree-iron-ingot',
        shouldImport: true
      }
    });

    // Verify import happened correctly
    const ironIngotNodeAfterImport = afterImport.dependencyTrees['tree-iron-rod']?.children?.[0];
    expect(ironIngotNodeAfterImport?.isImport || (ironIngotNodeAfterImport?.importReference !== undefined)).toBe(true);
    expect(ironIngotNodeAfterImport?.importedFrom || ironIngotNodeAfterImport?.importReference?.targetTreeId).toBe('tree-iron-ingot');
    expect(ironIngotNodeAfterImport?.originalChildren).toBeDefined();
    expect(ironIngotNodeAfterImport?.children?.length).toBe(0);

    // Step 2: Add excess to the original iron rod
    const afterExcess = dependencyReducer(afterImport, {
      type: 'dependency/setExcess',
      payload: {
        excess: 5,
        nodeId: 'tree-iron-rod',
        treeId: 'tree-iron-rod'
      }
    });

    // Verify excess was added
    const ironRodWithExcess = afterExcess.dependencyTrees['tree-iron-rod'];
    expect(ironRodWithExcess.excess).toBe(5);

    // Step 3: Unimport the iron ingot from the iron rod tree
    const afterUnimport = dependencyReducer(afterExcess, {
      type: 'dependency/unimportNode',
      payload: {
        nodeId: 'tree-iron-rod-iron_ingot-1',
        sourceTreeId: 'tree-iron-rod',
        targetTreeId: 'tree-iron-ingot'
      }
    });

    // Verify unimport worked and restored the original node structure
    const ironIngotNodeAfterUnimport = afterUnimport.dependencyTrees['tree-iron-rod']?.children?.[0];
    expect(ironIngotNodeAfterUnimport?.isImport || (ironIngotNodeAfterUnimport?.importReference !== undefined)).toBeFalsy();
    expect(ironIngotNodeAfterUnimport?.children?.length).toBe(1);
    expect(ironIngotNodeAfterUnimport?.children?.[0]?.id).toBe('iron_ore');
    
    // Verify the children are correctly restored with the right amounts
    expect(ironIngotNodeAfterUnimport?.children?.[0]?.amount).toBe(15);
  });

  it('should handle the specific sequence from import -> excess change -> unimport', async () => {
    // This test replicates the exact scenario described in the bug:
    // 1. Add iron rod with no excess
    // 2. Make its iron ingot import (before adding excess)
    // 3. Change iron rod excess to 15
    // 4. Unimport the iron ingot
    // 5. Verify iron ore is restored with the correct amount
    
    // Setup initial Redux state
    const initialState = {
      dependencyTrees: {},
      accumulatedDependencies: {},
      errors: []
    };
    
    // Step 1: Add the iron rod tree with no excess
    const ironRodTree = await calculateDependencyTree(
      'iron_rod',
      0,
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod-12345', // Fixed ID for testing
      {}, // No excess initially
      {}
    );
    
    // Create the target tree to import from
    const ironIngotTree = await calculateDependencyTree(
      'iron_ingot',
      0,
      'recipe_iron_ingot',
      {},
      0,
      [],
      'tree-iron-ingot-12345', // Fixed ID for testing
      {},
      {}
    );
    
    // Add both trees to the Redux state
    const stateWithTrees = {
      ...initialState,
      dependencyTrees: {
        'tree-iron-rod-12345': ironRodTree,
        'tree-iron-ingot-12345': ironIngotTree
      }
    };
    
    // Step 2: Make iron ingot import
    const stateAfterImport = dependencyReducer(
      stateWithTrees,
      importNodeAction({
        nodeId: 'tree-iron-rod-12345-iron_rod-0-iron_ingot-1',
        sourceTreeId: 'tree-iron-rod-12345',
        targetTreeId: 'tree-iron-ingot-12345',
        shouldImport: true
      })
    );
    
    // Verify import worked
    const ironIngotNodeAfterImport = stateAfterImport.dependencyTrees['tree-iron-rod-12345']?.children?.[0];
    expect(ironIngotNodeAfterImport?.isImport).toBe(true);
    expect(ironIngotNodeAfterImport?.importedFrom).toBe('tree-iron-ingot-12345');
    expect(ironIngotNodeAfterImport?.originalChildren).toBeDefined();
    
    // Step 3: Change iron rod excess to 15 - this would happen through the recalculation
    // First, calculate a new tree with the excess
    const treeWithExcess = await calculateDependencyTree(
      'iron_rod',
      0, 
      'recipe_iron_rod',
      {},
      0,
      [],
      'tree-iron-rod-12345',
      { 'iron_rod': 15 }, // Add excess
      { // Maintain import relationship
        'tree-iron-rod-12345-iron_rod-0-iron_ingot-1': {
          targetTreeId: 'tree-iron-ingot-12345',
          amount: 0
        }
      }
    );
    
    // Update the target tree to match the new amount
    const targetTreeWithAmount = await calculateDependencyTree(
      'iron_ingot',
      15, // Updated amount from excess
      'recipe_iron_ingot',
      {},
      0,
      [],
      'tree-iron-ingot-12345',
      {},
      {}
    );
    
    // Update both trees in the Redux state
    const stateWithExcess = dependencyReducer(
      stateAfterImport,
      setDependencies({
        treeId: 'tree-iron-rod-12345',
        tree: treeWithExcess,
        accumulated: {} // Simplified for test
      })
    );
    
    // Update target tree
    const stateWithBothTreesUpdated = dependencyReducer(
      stateWithExcess,
      setDependencies({
        treeId: 'tree-iron-ingot-12345',
        tree: targetTreeWithAmount,
        accumulated: {} // Simplified for test
      })
    );
    
    // Verify excess was applied
    const ironRodWithExcess = stateWithBothTreesUpdated.dependencyTrees['tree-iron-rod-12345'];
    expect(ironRodWithExcess.excess).toBe(15);
    
    // Verify iron ingot node amount was updated
    const ironIngotNodeWithExcess = ironRodWithExcess.children?.[0];
    expect(ironIngotNodeWithExcess?.amount).toBe(15);
    expect(ironIngotNodeWithExcess?.isImport).toBe(true);
    
    // Step 4: Unimport the iron ingot
    const stateAfterUnimport = dependencyReducer(
      stateWithBothTreesUpdated,
      importNodeAction({
        nodeId: 'tree-iron-rod-12345-iron_rod-0-iron_ingot-1',
        sourceTreeId: 'tree-iron-rod-12345',
        targetTreeId: 'tree-iron-ingot-12345',
        shouldImport: false
      })
    );
    
    // Step 5: Verify everything was restored correctly
    const finalIronRodTree = stateAfterUnimport.dependencyTrees['tree-iron-rod-12345'];
    const finalIronIngotNode = finalIronRodTree.children?.[0];
    
    // Verify iron ingot node is no longer an import
    expect(finalIronIngotNode?.isImport).toBeFalsy();
    expect(finalIronIngotNode?.importedFrom).toBeUndefined();
    
    // Critical test: Verify iron ore node was restored with correct amount
    expect(finalIronIngotNode?.children).toBeDefined();
    expect(finalIronIngotNode?.children?.length).toBe(1);
    
    const finalIronOreNode = finalIronIngotNode?.children?.[0];
    expect(finalIronOreNode?.id).toBe('iron_ore');
    expect(finalIronOreNode?.amount).toBe(15); // Should have the same amount as parent
    
    // Target tree should have been removed or empty
    if (stateAfterUnimport.dependencyTrees['tree-iron-ingot-12345']) {
      expect(stateAfterUnimport.dependencyTrees['tree-iron-ingot-12345'].amount).toBeLessThanOrEqual(0);
    }
  });

  it('should recover correctly if originalChildren is unavailable during unimport', () => {
    // This test mocks the behavior rather than modifying an immer object
    
    // Create mock original state with types that match the store structure
    const mockOriginalState = {
      dependencyTrees: {
        'tree-iron-rod': {
          id: 'iron_rod',
          amount: 15,
          uniqueId: 'tree-iron-rod',
          isRoot: true,
          selectedRecipeId: 'recipe_iron_rod',
          children: [
            {
              id: 'iron_ingot',
              amount: 15,
              uniqueId: 'tree-iron-rod-iron_ingot-1',
              isImport: true,
              importedFrom: 'tree-iron-ingot',
              children: [], // Import nodes have no children
              // Intentionally missing originalChildren to test recovery
            }
          ],
          excess: 0
        },
        'tree-iron-ingot': {
          id: 'iron_ingot',
          amount: 15,
          uniqueId: 'tree-iron-ingot',
          isRoot: true,
          selectedRecipeId: 'recipe_iron_ingot',
          children: [
            {
              id: 'iron_ore',
              amount: 15,
              uniqueId: 'tree-iron-ingot-iron_ore-1',
              children: [],
              excess: 0
            }
          ],
          excess: 0
        }
      },
      accumulatedDependencies: {},
      errors: []
    };

    // Mock the state with the prebuilt trees - type assertion for test
    const store = configureStore({
      reducer: {
        dependencies: dependencyReducer
      },
      preloadedState: {
        dependencies: mockOriginalState as any
      }
    });

    // Initial state should have the import node
    const initialRodTree = store.getState().dependencies.dependencyTrees['tree-iron-rod'];
    expect(initialRodTree?.children?.[0]?.isImport).toBe(true);
    
    // Now try to unimport - this should trigger the recovery mechanism
    store.dispatch(importNodeAction({
      sourceTreeId: 'tree-iron-rod', 
      nodeId: 'tree-iron-rod-iron_ingot-1',
      targetTreeId: 'tree-iron-ingot',
      shouldImport: false
    }));
    
    // Verify the node is no longer an import
    const updatedTree = store.getState().dependencies.dependencyTrees['tree-iron-rod'];
    const updatedNode = updatedTree?.children?.[0];
    expect(updatedNode?.isImport).toBeFalsy();
    
    // Children should be restored by the recovery mechanism
    expect(updatedNode?.children).toBeDefined();
    if (updatedNode?.children) {
      expect(updatedNode.children.length).toBe(1);
      expect(updatedNode.children[0]?.id).toBe('iron_ore');
    }
  });
}); 