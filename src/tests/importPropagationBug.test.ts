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

describe('Import Propagation Bug Tests', () => {
  it('should propagate production rate changes through import chains', async () => {
    // Set up the scenario described by the user:
    // 1. Create an iron rod tree with excess=15
    // 2. Create a screw tree with excess=40
    // 3. Import iron rod to screw tree
    // 4. Verify that iron rod tree updates its production to account for the "forced" amount

    // Step 1: Calculate the iron rod tree with excess=15
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

    // Step 2: Calculate the screw tree with excess=40
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

    // Create initial Redux state with both trees
    const initialState = {
      dependencyTrees: {
        'tree-iron-rod': ironRodTree,
        'tree-screw': screwTree
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

    // Verify initial amounts
    const initialIronRodTree = store.getState().dependencies.dependencyTrees['tree-iron-rod'];
    const initialScrewTree = store.getState().dependencies.dependencyTrees['tree-screw'];
    
    expect(initialIronRodTree.excess).toBe(15);
    expect(initialScrewTree.excess).toBe(40);
    
    // Calculate how many iron rods the screw tree needs
    // With 40 excess screws, and recipe output of 4 screws per iron rod,
    // we need 10 iron rods (40 / 4 = 10)
    const ironRodInScrewTree = initialScrewTree.children?.[0];
    expect(ironRodInScrewTree).toBeDefined();
    expect(ironRodInScrewTree?.id).toBe('iron_rod');
    expect(ironRodInScrewTree?.amount).toBe(10); // 10 iron rods needed for 40 screws

    // Step 3: Import iron rod into screw tree
    store.dispatch(importNodeAction({
      nodeId: 'tree-screw-screw-0-iron_rod-1', // The iron rod node in screw tree
      sourceTreeId: 'tree-screw',
      targetTreeId: 'tree-iron-rod', 
      shouldImport: true
    }));

    // Verify the import worked
    const stateAfterImport = store.getState().dependencies;
    const screwTreeAfterImport = stateAfterImport.dependencyTrees['tree-screw'];
    const ironRodInScrewAfterImport = screwTreeAfterImport.children?.[0];
    
    expect(ironRodInScrewAfterImport).toBeDefined();
    expect(ironRodInScrewAfterImport?.isImport).toBe(true);
    expect(ironRodInScrewAfterImport?.importedFrom).toBe('tree-iron-rod');
    expect(ironRodInScrewAfterImport?.amount).toBe(10);

    // Important step: The iron rod tree should now reflect that it needs to produce
    // the original 15 (excess) + 10 (imported by screw) = 25 total
    const ironRodTreeAfterImport = stateAfterImport.dependencyTrees['tree-iron-rod'];
    expect(ironRodTreeAfterImport.amount).toBe(10); // The "forced" production for imports
    expect(ironRodTreeAfterImport.excess).toBe(15); // The excess is still 15
    
    // The total production of the iron rod tree should be 25
    // This isn't directly stored but is the sum of amount (forced) + excess
    const totalProduction = (ironRodTreeAfterImport.amount || 0) + (ironRodTreeAfterImport.excess || 0);
    expect(totalProduction).toBe(25);

    // Most importantly: The iron rod tree's children (iron ingot) should also reflect
    // the increased production amount of 25
    const ironIngotInRodTree = ironRodTreeAfterImport.children?.[0];
    expect(ironIngotInRodTree).toBeDefined();
    expect(ironIngotInRodTree?.id).toBe('iron_ingot');
    expect(ironIngotInRodTree?.amount).toBe(25); // Should match the total production of iron rod

    // And the iron ore in the chain should also reflect the updated amount
    const ironOreInIngotTree = ironIngotInRodTree?.children?.[0];
    expect(ironOreInIngotTree).toBeDefined();
    expect(ironOreInIngotTree?.id).toBe('iron_ore');
    expect(ironOreInIngotTree?.amount).toBe(25); // Should match the production of iron ingot

    // Step 4: Changing excess on iron rod should propagate through its chain
    store.dispatch(setExcess({
      treeId: 'tree-iron-rod',
      nodeId: 'tree-iron-rod',
      excess: 20 // Increase excess from 15 to 20
    }));

    // We need to recalculate the tree with the new excess
    const updatedIronRodTree = await calculateDependencyTree(
      'iron_rod',
      10, // Forced amount from import
      'recipe_iron_rod',
      {}, // No recipe selections
      0, // Initial depth
      [], // No affected branches
      'tree-iron-rod', // Tree ID
      { 'iron_rod': 20 }, // New excess of 20
      {} // No direct imports
    );

    // Update the tree in the Redux state
    store.dispatch(setDependencies({
      treeId: 'tree-iron-rod',
      tree: updatedIronRodTree,
      accumulated: {}
    }));

    // Verify the updated iron rod tree
    const finalState = store.getState().dependencies;
    const finalIronRodTree = finalState.dependencyTrees['tree-iron-rod'];
    
    expect(finalIronRodTree.amount).toBe(10); // Still 10 forced from import
    expect(finalIronRodTree.excess).toBe(20); // New excess of 20
    
    // Total production is now 10 (forced) + 20 (excess) = 30
    const newTotalProduction = (finalIronRodTree.amount || 0) + (finalIronRodTree.excess || 0);
    expect(newTotalProduction).toBe(30);

    // The entire production chain should reflect the new total amount of 30
    const finalIronIngotInRodTree = finalIronRodTree.children?.[0];
    expect(finalIronIngotInRodTree).toBeDefined();
    expect(finalIronIngotInRodTree?.amount).toBe(30);
    
    const finalIronOreInChain = finalIronIngotInRodTree?.children?.[0];
    expect(finalIronOreInChain).toBeDefined();
    expect(finalIronOreInChain?.amount).toBe(30);

    // Step 5: Changing excess on the screw tree should affect the imported amount
    // in the iron rod tree
    store.dispatch(setExcess({
      treeId: 'tree-screw',
      nodeId: 'tree-screw',
      excess: 60 // Increase excess from 40 to 60
    }));

    // Recalculate the screw tree with the new excess
    const updatedScrewTree = await calculateDependencyTree(
      'screw',
      0, // Initial amount
      'recipe_screw',
      {}, // No recipe selections
      0, // Initial depth
      [], // No affected branches
      'tree-screw', // Tree ID
      { 'screw': 60 }, // New excess of 60
      { // Keep the import relationship
        'tree-screw-screw-0-iron_rod-1': {
          targetTreeId: 'tree-iron-rod',
          amount: 0
        }
      }
    );

    // Update the screw tree in Redux
    store.dispatch(setDependencies({
      treeId: 'tree-screw',
      tree: updatedScrewTree,
      accumulated: {}
    }));

    // Verify that the screw tree now needs 15 iron rods (60 / 4 = 15)
    const updatedScrewState = store.getState().dependencies;
    const updatedScrewTreeState = updatedScrewState.dependencyTrees['tree-screw'];
    const updatedIronRodInScrew = updatedScrewTreeState.children?.[0];
    
    expect(updatedIronRodInScrew).toBeDefined();
    expect(updatedIronRodInScrew?.amount).toBe(15); // Now needs 15 iron rods
    
    // Now we need to update the iron rod tree to reflect the new import amount
    // Get the current iron rod tree
    const currentIronRodTree = updatedScrewState.dependencyTrees['tree-iron-rod'];
    
    // Recalculate with the new forced amount (15 instead of 10)
    const finalIronRodTree2 = await calculateDependencyTree(
      'iron_rod',
      15, // New forced amount from updated import
      'recipe_iron_rod',
      {}, // No recipe selections
      0, // Initial depth
      [], // No affected branches
      'tree-iron-rod', // Tree ID
      { 'iron_rod': 20 }, // Keep excess at 20
      {} // No direct imports
    );

    // Update the iron rod tree in Redux
    store.dispatch(setDependencies({
      treeId: 'tree-iron-rod',
      tree: finalIronRodTree2,
      accumulated: {}
    }));

    // Verify the final state of the iron rod tree
    const finalState2 = store.getState().dependencies;
    const finalIronRodTree2State = finalState2.dependencyTrees['tree-iron-rod'];
    
    expect(finalIronRodTree2State.amount).toBe(15); // Now 15 forced from import
    expect(finalIronRodTree2State.excess).toBe(20); // Still 20 excess
    
    // Total production is now 15 (forced) + 20 (excess) = 35
    const finalTotalProduction = (finalIronRodTree2State.amount || 0) + (finalIronRodTree2State.excess || 0);
    expect(finalTotalProduction).toBe(35);

    // Verify that the entire production chain reflects the final total of 35
    const finalIronIngot = finalIronRodTree2State.children?.[0];
    expect(finalIronIngot).toBeDefined();
    expect(finalIronIngot?.amount).toBe(35);
    
    const finalIronOre = finalIronIngot?.children?.[0];
    expect(finalIronOre).toBeDefined();
    expect(finalIronOre?.amount).toBe(35);
  });

  it('should propagate production rate changes through nested import chains', async () => {
    // Set up the more complex scenario described by the user:
    // 1. Create an iron rod tree with excess=15
    // 2. Import the iron ingot node in the iron rod tree (iron ingot becomes an import)
    // 3. New iron ingot tree with forced amount=15 is created
    // 4. Create screw tree with excess=40
    // 5. Import iron rod from screw tree to the original iron rod tree 
    // 6. Verify that imported iron ingot in the iron rod tree is updated from 15 to 25

    // Step 1: Calculate the iron rod tree with excess=15
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

    // Create store with initial state
    const store = configureStore({
      reducer: {
        dependencies: dependencyReducer
      },
      preloadedState: {
        dependencies: {
          dependencyTrees: {
            'tree-iron-rod': ironRodTree
          },
          accumulatedDependencies: {},
          errors: []
        }
      }
    });

    // Verify initial amounts
    const initialIronRodTree = store.getState().dependencies.dependencyTrees['tree-iron-rod'];
    expect(initialIronRodTree.excess).toBe(15);
    
    // Find the iron ingot node in the iron rod tree
    const ironIngotNode = initialIronRodTree.children?.[0];
    expect(ironIngotNode).toBeDefined();
    expect(ironIngotNode?.id).toBe('iron_ingot');
    expect(ironIngotNode?.amount).toBe(15);

    // Step 2: Import the iron ingot from the iron rod tree
    // Create a new iron ingot tree
    const ironIngotTree = await calculateDependencyTree(
      'iron_ingot',
      0, // Initial amount
      'recipe_iron_ingot',
      {}, // No recipe selections
      0, // Initial depth
      [], // No affected branches
      'tree-iron-ingot', // Tree ID
      {}, // No excess
      {} // No imports
    );

    // Add the iron ingot tree to state
    store.dispatch(setDependencies({
      treeId: 'tree-iron-ingot',
      tree: ironIngotTree,
      accumulated: {}
    }));

    // Import the iron ingot node in the iron rod tree
    store.dispatch(importNodeAction({
      nodeId: 'tree-iron-rod-iron_rod-0-iron_ingot-1', // The iron ingot node in iron rod tree
      sourceTreeId: 'tree-iron-rod',
      targetTreeId: 'tree-iron-ingot',
      shouldImport: true
    }));

    // Verify the iron ingot is now imported in the iron rod tree
    const ironRodTreeAfterIngotImport = store.getState().dependencies.dependencyTrees['tree-iron-rod'];
    const ironIngotAfterImport = ironRodTreeAfterIngotImport.children?.[0];
    
    expect(ironIngotAfterImport).toBeDefined();
    expect(ironIngotAfterImport?.isImport).toBe(true);
    expect(ironIngotAfterImport?.importedFrom).toBe('tree-iron-ingot');
    expect(ironIngotAfterImport?.amount).toBe(15);

    // Verify the iron ingot tree now has an amount of 15 (from being imported)
    const ironIngotTreeAfterImport = store.getState().dependencies.dependencyTrees['tree-iron-ingot'];
    expect(ironIngotTreeAfterImport.amount).toBe(15);

    // Step 3: Create a screw tree with excess=40
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

    // Verify initial amounts for screw tree
    const initialScrewTree = store.getState().dependencies.dependencyTrees['tree-screw'];
    expect(initialScrewTree.excess).toBe(40);
    
    // Calculate how many iron rods the screw tree needs
    // With 40 excess screws, and recipe output of 4 screws per iron rod,
    // we need 10 iron rods (40 / 4 = 10)
    const ironRodInScrewTree = initialScrewTree.children?.[0];
    expect(ironRodInScrewTree).toBeDefined();
    expect(ironRodInScrewTree?.id).toBe('iron_rod');
    expect(ironRodInScrewTree?.amount).toBe(10); // 10 iron rods needed for 40 screws

    // Step 4: Import the iron rod from the screw tree to the iron rod tree
    store.dispatch(importNodeAction({
      nodeId: 'tree-screw-screw-0-iron_rod-1', // The iron rod node in screw tree
      sourceTreeId: 'tree-screw',
      targetTreeId: 'tree-iron-rod',
      shouldImport: true
    }));

    // Verify the iron rod is now imported in the screw tree
    const screwTreeAfterImport = store.getState().dependencies.dependencyTrees['tree-screw'];
    const ironRodInScrewAfterImport = screwTreeAfterImport.children?.[0];
    
    expect(ironRodInScrewAfterImport).toBeDefined();
    expect(ironRodInScrewAfterImport?.isImport).toBe(true);
    expect(ironRodInScrewAfterImport?.importedFrom).toBe('tree-iron-rod');
    expect(ironRodInScrewAfterImport?.amount).toBe(10);

    // Key verification: The iron rod tree should now have total production of 25
    // 15 excess + 10 forced from screw import
    const finalIronRodTree = store.getState().dependencies.dependencyTrees['tree-iron-rod'];
    expect(finalIronRodTree.amount).toBe(10); // 10 forced production
    expect(finalIronRodTree.excess).toBe(15); // 15 excess
    
    const totalIronRodProduction = (finalIronRodTree.amount || 0) + (finalIronRodTree.excess || 0);
    expect(totalIronRodProduction).toBe(25);

    // Critical test: The imported iron ingot in the iron rod tree should now have 
    // an updated amount of 25, not still 15
    const finalIronIngotInRodTree = finalIronRodTree.children?.[0];
    expect(finalIronIngotInRodTree).toBeDefined();
    expect(finalIronIngotInRodTree?.id).toBe('iron_ingot');
    expect(finalIronIngotInRodTree?.isImport).toBe(true);
    expect(finalIronIngotInRodTree?.amount).toBe(25); // Should be updated to 25, not 15

    // And the iron ingot tree should also have its amount updated to 25
    const finalIronIngotTree = store.getState().dependencies.dependencyTrees['tree-iron-ingot'];
    expect(finalIronIngotTree.amount).toBe(25); // Should be updated to 25
  });
}); 