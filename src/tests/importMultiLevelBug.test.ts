import { configureStore } from '@reduxjs/toolkit';
import dependencyReducer, { 
  importNodeAction, 
  setDependencies, 
  setExcess 
} from '../features/dependencySlice';
import { calculateDependencyTree } from '../utils/calculateDependencyTree';
import * as dbQueries from '../data/dbQueries';

// Mock the database queries
jest.mock('../data/dbQueries', () => ({
  getRecipeById: jest.fn((recipeId) => {
    // Mock recipes
    if (recipeId === 'recipe_iron_rod') {
      return {
        id: 'recipe_iron_rod',
        name: 'Iron Rod',
        out: { 'iron_rod': 1 },
        in: { 'iron_ingot': 1 }
      };
    } else if (recipeId === 'recipe_screw') {
      return {
        id: 'recipe_screw',
        name: 'Screw',
        out: { 'screw': 4 },
        in: { 'iron_rod': 1 }
      };
    } else if (recipeId === 'recipe_iron_ingot') {
      return {
        id: 'recipe_iron_ingot',
        name: 'Iron Ingot',
        out: { 'iron_ingot': 1 },
        in: { 'iron_ore': 1 }
      };
    }
    return null;
  }),
  getRecipesForItem: jest.fn((itemId) => {
    // Mock available recipes for each item
    if (itemId === 'iron_rod') {
      return [{ id: 'recipe_iron_rod', name: 'Iron Rod' }];
    } else if (itemId === 'screw') {
      return [{ id: 'recipe_screw', name: 'Screw' }];
    } else if (itemId === 'iron_ingot') {
      return [{ id: 'recipe_iron_ingot', name: 'Iron Ingot' }];
    } else if (itemId === 'iron_ore') {
      return [];
    }
    return [];
  }),
  getRecipeByOutput: jest.fn((itemId) => {
    // Default recipes
    if (itemId === 'iron_rod') {
      return {
        id: 'recipe_iron_rod',
        name: 'Iron Rod',
        out: { 'iron_rod': 1 },
        in: { 'iron_ingot': 1 }
      };
    } else if (itemId === 'screw') {
      return {
        id: 'recipe_screw',
        name: 'Screw',
        out: { 'screw': 4 },
        in: { 'iron_rod': 1 }
      };
    } else if (itemId === 'iron_ingot') {
      return {
        id: 'recipe_iron_ingot',
        name: 'Iron Ingot',
        out: { 'iron_ingot': 1 },
        in: { 'iron_ore': 1 }
      };
    }
    return null;
  })
}));

describe('Import Multi-Level Bug Tests', () => {
  it('should propagate production changes through multi-level import chains', async () => {
    // Set up the scenario described by the user:
    // 1. Create an iron rod tree with excess=15
    // 2. Import the iron ingot to create a new iron ingot tree with forced=15
    // 3. Create a screw tree with excess=40
    // 4. Import the iron rod to the screw tree
    // 5. Verify that iron rod tree updates to 10 forced + 15 excess
    // 6. Verify that iron ingot tree updates to 25 total (from 15)

    // -------- STEP 1: Create iron rod tree with 15 excess --------
    const ironRodTree = await calculateDependencyTree(
      'iron_rod',
      0, // Initial amount
      'recipe_iron_rod',
      {}, // No recipe selections
      0, // Initial depth
      [], // No affected branches
      'tree-iron-rod', // Tree ID
      { 'iron_rod': 15 }, // Excess of 15
      {} // No imports
    );

    // Create initial Redux state with the rod tree
    const initialState = {
      dependencyTrees: {
        'tree-iron-rod': ironRodTree
      },
      accumulatedDependencies: {},
      errors: []
    };

    // Create store with initial state
    const store = configureStore({
      reducer: {
        dependencies: dependencyReducer
      },
      preloadedState: {
        dependencies: initialState
      }
    });

    // Verify initial state
    const initialIronRodTree = store.getState().dependencies.dependencyTrees['tree-iron-rod'];
    expect(initialIronRodTree.excess).toBe(15);
    
    // Find the iron ingot node in the iron rod tree
    const ironIngotNodeInRod = initialIronRodTree.children?.[0];
    expect(ironIngotNodeInRod?.id).toBe('iron_ingot');
    expect(ironIngotNodeInRod?.amount).toBe(15); // 15 ingots for 15 rods
    
    // -------- STEP 2: Import the iron ingot to create a new tree --------
    // First, get the unique ID of the iron ingot node
    const ironIngotNodeId = ironIngotNodeInRod?.uniqueId;
    expect(ironIngotNodeId).toBeDefined();
    
    // Import the iron ingot node
    store.dispatch(importNodeAction({
      nodeId: ironIngotNodeId!,
      sourceTreeId: 'tree-iron-rod',
      targetTreeId: 'tree-iron-ingot',
      shouldImport: true
    }));
    
    // Verify iron ingot was imported
    const stateAfterIngotImport = store.getState().dependencies;
    
    // Check that the iron rod tree has a properly imported ingot node
    const rodTreeAfterIngotImport = stateAfterIngotImport.dependencyTrees['tree-iron-rod'];
    const ingotNodeAfterImport = rodTreeAfterIngotImport.children?.[0];
    expect(ingotNodeAfterImport?.isImport).toBe(true);
    expect(ingotNodeAfterImport?.importedFrom).toBe('tree-iron-ingot');
    
    // Check that the iron ingot tree was created with the correct amount
    const ingotTreeAfterImport = stateAfterIngotImport.dependencyTrees['tree-iron-ingot'];
    expect(ingotTreeAfterImport?.id).toBe('iron_ingot');
    expect(ingotTreeAfterImport?.amount).toBe(15); // Should have 15 forced from the import
    
    // Check that the iron ingot tree has an iron ore child with the correct amount
    const ironOreInIngotTree = ingotTreeAfterImport?.children?.[0];
    expect(ironOreInIngotTree?.id).toBe('iron_ore');
    expect(ironOreInIngotTree?.amount).toBe(15); // Should match the total production of iron ingot
    
    // -------- STEP 3: Create a screw tree with 40 excess --------
    const screwTree = await calculateDependencyTree(
      'screw',
      0, // Initial amount
      'recipe_screw',
      {}, // No recipe selections
      0, // Initial depth
      [], // No affected branches
      'tree-screw', // Tree ID
      { 'screw': 40 }, // Excess of 40
      {} // No imports
    );
    
    // Add the screw tree to state
    store.dispatch(setDependencies({
      treeId: 'tree-screw',
      tree: screwTree,
      accumulated: {}
    }));
    
    // Verify screw tree state
    const stateAfterScrewAdded = store.getState().dependencies;
    const screwTreeAfterAdded = stateAfterScrewAdded.dependencyTrees['tree-screw'];
    expect(screwTreeAfterAdded?.excess).toBe(40);
    
    // Check the iron rod node in the screw tree
    const ironRodInScrew = screwTreeAfterAdded?.children?.[0];
    expect(ironRodInScrew?.id).toBe('iron_rod');
    expect(ironRodInScrew?.amount).toBe(10); // 10 iron rods needed for 40 screws (ratio 1:4)
    
    // -------- STEP 4: Import the iron rod to the screw tree --------
    const ironRodInScrewId = ironRodInScrew?.uniqueId;
    expect(ironRodInScrewId).toBeDefined();
    
    // Import the iron rod node
    store.dispatch(importNodeAction({
      nodeId: ironRodInScrewId!,
      sourceTreeId: 'tree-screw',
      targetTreeId: 'tree-iron-rod',
      shouldImport: true
    }));
    
    // -------- STEP 5: Verify the multi-level import chain --------
    // Now the iron rod tree should have been updated with forced production of 10
    const stateAfterImport = store.getState().dependencies;
    
    // Calculate what an updated iron ingot tree should look like
    const totalRodProduction = 
      (stateAfterImport.dependencyTrees['tree-iron-rod']?.amount || 0) + 
      (stateAfterImport.dependencyTrees['tree-iron-rod']?.excess || 0);
    
    console.log(`Total rod production: ${totalRodProduction}`);
    expect(totalRodProduction).toBe(25); // 10 + 15
    
    // -------- STEP 6: Verify updates after import --------
    const finalState = stateAfterImport;
    
    // Check that the screw tree has imported iron rod
    const finalScrewTree = finalState.dependencyTrees['tree-screw'];
    const finalRodInScrew = finalScrewTree?.children?.[0];
    expect(finalRodInScrew?.isImport).toBe(true);
    expect(finalRodInScrew?.importedFrom).toBe('tree-iron-rod');
    expect(finalRodInScrew?.amount).toBe(10); // Still needs 10 rods
    
    // Check the iron rod tree has updated to 10 forced + 15 excess
    const finalRodTree = finalState.dependencyTrees['tree-iron-rod'];
    expect(finalRodTree?.amount).toBe(10); // 10 forced from screw import
    expect(finalRodTree?.excess).toBe(15); // Original 15 excess
    
    // Calculate total production 
    const totalRodProduction2 = (finalRodTree?.amount || 0) + (finalRodTree?.excess || 0);
    expect(totalRodProduction2).toBe(25); // Should be 25 total (10 + 15)
    
    // -------- STEP 7: The critical test - verify iron ingot tree updates --------
    // Check that the iron ingot tree has updated to match total rod production
    const finalIngotTree = finalState.dependencyTrees['tree-iron-ingot'];
    console.log(`Current iron ingot tree amount: ${finalIngotTree?.amount}`);
    expect(finalIngotTree?.amount).toBe(25); // Should be 25 now, not 15
    
    // Check that the iron ore also reflects the new amount
    const finalOreInIngot = finalIngotTree?.children?.[0];
    expect(finalOreInIngot?.id).toBe('iron_ore');
    expect(finalOreInIngot?.amount).toBe(25); // Should match the total iron ingot production
  });
}); 