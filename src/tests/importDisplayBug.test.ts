import { configureStore } from '@reduxjs/toolkit';
import dependencyReducer, { 
  importNodeAction, 
  setDependencies, 
  setExcess 
} from '../features/dependencySlice';
import recipeSelectionReducer from '../features/recipeSelectionsSlice';
import { DependencyNode } from '../utils/calculateDependencyTree';
import { hasImportReference, getImportReference } from '../utils/nodeReferenceUtils';

// Create a mock store for testing
const setupStore = (preloadedState = {}) => {
  // @ts-ignore - Type casting for test purposes
  return configureStore({
    reducer: {
      dependencies: dependencyReducer,
      recipeSelections: recipeSelectionReducer
    },
    preloadedState
  });
};

describe('Import Display Bug Tests', () => {
  it('should correctly set iron ingot as import on first click', () => {
    // Create initial state with iron plate tree
    const ironPlateTree: DependencyNode = {
      id: 'iron_plate',
      amount: 0,
      uniqueId: 'tree-iron-plate',
      isRoot: true,
      children: [
        {
          id: 'iron_ingot',
          amount: 0,
          uniqueId: 'tree-iron-plate-iron_ingot-1',
          children: [
            {
              id: 'iron_ore',
              amount: 0,
              uniqueId: 'tree-iron-plate-iron_ingot-1-iron_ore-2',
              children: [],
              excess: 0
            }
          ],
          excess: 0
        }
      ],
      excess: 0
    };

    const initialState = {
      dependencies: {
        dependencyTrees: {
          'tree-iron-plate': ironPlateTree
        },
        accumulatedDependencies: {},
        errors: []
      },
      recipeSelections: { selections: {} }
    };

    const store = setupStore(initialState);

    // Step 1: Set excess on iron plate to 20 (simulating maximizing production)
    store.dispatch(setExcess({
      treeId: 'tree-iron-plate',
      nodeId: 'tree-iron-plate',
      excess: 20
    }));

    // Update tree with new amounts caused by excess change
    // This simulates what happens when the excess controller updates the tree
    const updatedTree = {
      ...ironPlateTree,
      excess: 20,
      children: [
        {
          ...ironPlateTree.children[0],
          amount: 30, // Iron ingot now needs 30 units because of excess
          children: [
            {
              ...ironPlateTree.children[0].children[0],
              amount: 30 // Iron ore also needs 30 units
            }
          ]
        }
      ]
    };

    store.dispatch(setDependencies({
      treeId: 'tree-iron-plate',
      tree: updatedTree,
      accumulated: {}
    }));

    // Verify tree updated correctly with excess
    const stateAfterExcess = store.getState().dependencies;
    expect(stateAfterExcess.dependencyTrees['tree-iron-plate'].excess).toBe(20);
    expect(stateAfterExcess.dependencyTrees['tree-iron-plate'].children[0].amount).toBe(30);

    // Step 2: Click import on iron ingot - this is where the bug occurs
    store.dispatch(importNodeAction({
      nodeId: 'tree-iron-plate-iron_ingot-1',
      sourceTreeId: 'tree-iron-plate',
      targetTreeId: 'tree-iron-ingot',
      shouldImport: true
    }));

    // Verify that:
    // 1. A new iron ingot tree was created
    const stateAfterImport = store.getState().dependencies;
    expect(stateAfterImport.dependencyTrees['tree-iron-ingot']).toBeTruthy();
    expect(stateAfterImport.dependencyTrees['tree-iron-ingot'].amount).toBe(30);

    // 2. The iron ingot in the iron plate tree should be marked as an import
    const ingotNodeInPlateTree = stateAfterImport.dependencyTrees['tree-iron-plate'].children[0];

    // This is where the bug is - the ingot node doesn't have import reference set properly on first click
    expect(hasImportReference(ingotNodeInPlateTree)).toBe(true);
    expect(ingotNodeInPlateTree.isImport).toBe(true);

    // 3. Check that the import reference points to the correct tree
    const importRef = getImportReference(ingotNodeInPlateTree);
    expect(importRef).toBeTruthy();
    expect(importRef?.targetTreeId).toBe('tree-iron-ingot');
  });
}); 