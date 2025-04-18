/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSlice, PayloadAction, createAction } from "@reduxjs/toolkit";
import { DependencyNode, Recipe } from "../../../types";
import { AccumulatedNode, calculateAccumulatedFromTree, findNodeById } from "../../../utils";
import { 
  clearImportReference, 
  getImportReference, 
} from "../../../utils/nodeReferenceUtils";
import { getRecipeById, getRecipeByOutput } from "../../../data";
import { AppDispatch } from "../../../store";
import {
  importNodeAction,
  unimportNode,
  handleNodeImportReducer,
  handleNodeUnimportReducer,
  removeNodeAction
} from './importExportLogic';
import {
  productionSliceExtraReducers,
} from './productionUpdateLogic';

interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;  // Map of treeId to DependencyNode
  accumulatedDependencies: Record<string, AccumulatedNode>;
  // Additional properties for better state management
  errors: string[]; // Track errors like circular references
}

// Export the state interface for use in tests
export type { DependencyState };

const initialState: DependencyState = {
  dependencyTrees: {},
  accumulatedDependencies: {},
  errors: []
};

// Helper function to find nodes importing to a specific tree
function findNodesImportingToTree(trees: Record<string, DependencyNode>, targetTreeId: string): DependencyNode[] {
  const results: DependencyNode[] = [];
  
  // Helper function to check nodes recursively
  const checkNode = (node: DependencyNode) => {
    // Check if this node imports from the target tree
    if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
        (node.isImport && node.importedFrom === targetTreeId)) {
      results.push(node);
    }
    
    // Check children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: DependencyNode) => checkNode(child));
    }
  };
  
  // Check all trees
  Object.values(trees).forEach(tree => {
    checkNode(tree);
  });
  
  return results;
}

const dependencySlice = createSlice({
  name: "dependencies",
  initialState,
  reducers: {
    setDependencies: (
      state,
      action: PayloadAction<{
        treeId: string;
        tree: DependencyNode;
        // Remove accumulated from payload, we will calculate it here
      }>
    ) => {
      const { treeId, tree } = action.payload;
      
      // Direct mutation for the specific tree using Immer
      state.dependencyTrees[treeId] = tree;
      
      // Recalculate the *entire* accumulated state after adding/updating a tree
      const newAccumulated: Record<string, AccumulatedNode> = {};
      Object.values(state.dependencyTrees).forEach(currentTree => {
          const treeAccumulated = calculateAccumulatedFromTree(currentTree);
          // Merge accumulations (handle potential overlaps if needed, though unlikely with roots)
          Object.assign(newAccumulated, treeAccumulated);
      });
      state.accumulatedDependencies = newAccumulated;
    },
    
    deleteTree: (
      state,
      action: PayloadAction<{
        treeId: string;
      }>
    ) => {
      const treeIdToDelete = action.payload.treeId;
      
      // Clear any previous errors
      state.errors = [];
      
      // Use helper function to find all nodes importing from the deleted tree
      const findNodesImportingFromTree = (trees: Record<string, DependencyNode>, targetTreeId: string): {
        tree: DependencyNode;
        node: DependencyNode;
      }[] => {
        const results: { tree: DependencyNode; node: DependencyNode }[] = [];
        
        // Check all trees
        Object.values(trees).forEach(tree => {
          // Recursive helper to check each node
          const checkNode = (node: DependencyNode, currentTree: DependencyNode) => {
            // Check if this node is importing from the target tree
            const importRef = getImportReference(node);
            if (importRef && importRef.targetTreeId === targetTreeId) {
              results.push({ tree: currentTree, node });
            }
            
            // Check all children
            if (node.children) {
              node.children.forEach((child: DependencyNode) => checkNode(child, currentTree));
            }
          };
          
          // Start at the root of each tree
          checkNode(tree, tree);
        });
        
        return results;
      };
      
      // Find all nodes importing from the to-be-deleted tree
      const affectedNodes = findNodesImportingFromTree(state.dependencyTrees, treeIdToDelete);
      
      // For each affected node, clear the import reference
      affectedNodes.forEach(({ node }) => {
        
        // Use our reference-based utility to properly clear import reference
        const clearedNode = clearImportReference(node);
        
        // Apply changes to the node in place
        Object.assign(node, clearedNode);
      });
      
      // Delete the tree
      delete state.dependencyTrees[treeIdToDelete];
      
      // Recalculate accumulated dependencies
      if (Object.keys(state.dependencyTrees).length === 0) {
        state.accumulatedDependencies = {};
      } else {
        // Update accumulated dependencies
        const allAccumulated: Record<string, AccumulatedNode> = {};
        Object.values(state.dependencyTrees).forEach(tree => {
          const treeAccumulated = calculateAccumulatedFromTree(tree);
          Object.assign(allAccumulated, treeAccumulated);
        });
        state.accumulatedDependencies = allAccumulated;
      }
    },
    
    updateAccumulated: (
      state,
      action: PayloadAction<Record<string, AccumulatedNode>>
    ) => {
      state.accumulatedDependencies = action.payload;
    },
    
    loadSavedState: (state, action: PayloadAction<DependencyState>) => {
      // Replace the entire state with the saved state
      return action.payload;
    },
    
    updateNodeProperties: (
      state,
      // Restore original payload structure
      action: PayloadAction<{
        nodeId: string;
        updatedNode: Partial<DependencyNode>; 
      }>
    ) => {
      const { nodeId, updatedNode } = action.payload;
      let treeUpdated = false;
      
      // Add debug logging for recipe updates
      if (updatedNode.recipe) {
        // 
      }
      
      for (const treeId in state.dependencyTrees) {
        const tree = state.dependencyTrees[treeId];
        const updateNodeInTree = (node: DependencyNode): boolean => {
          if (node.uniqueId === nodeId) {
            // If updatedNode contains selectedRecipeId, handle/remove it
            if ('selectedRecipeId' in updatedNode) {
               delete updatedNode.selectedRecipeId;
            }
            
            // Special handling for recipe updates to ensure they fully propagate
            if (updatedNode.recipe) {
              // Make sure we're setting a complete recipe object with required properties
              node.recipe = { ...updatedNode.recipe };
              
              
              // Remove recipe from the updatedNode to prevent double-application
              const { recipe, ...restOfUpdates } = updatedNode;
              // Apply the rest of the updates
              Object.assign(node, restOfUpdates);
            } else {
              // Normal update for non-recipe properties
              Object.assign(node, updatedNode);
            }
            
            treeUpdated = true;
            return true;
          }
          return node.children?.some(updateNodeInTree) || false;
        };
        
       // Just run the update function (no accumulated calc here)
       if (updateNodeInTree(tree)) {
         // break; // Optional break
       }
      }
      if (!treeUpdated) {
         // Still log warnings
         console.warn(`Node ${nodeId} not found in any tree for update.`);
      }
    },
    
    clearErrors: (state) => {
      state.errors = [];
    },
  },
  extraReducers: (builder) => {
    // Add cases for the imported actions to use the imported reducer logic
    builder
      .addCase(importNodeAction, handleNodeImportReducer)
      .addCase(unimportNode, handleNodeUnimportReducer)
      .addCase(removeNodeAction, (state, action: PayloadAction<string>) => {
        const nodeIdToRemove = action.payload;
        if (state.dependencyTrees[nodeIdToRemove]) {
            delete state.dependencyTrees[nodeIdToRemove];

            // Clean up accumulated dependencies associated with the removed tree
            // Recalculate all for simplicity (can be optimized later)
             state.accumulatedDependencies = {};
             Object.values(state.dependencyTrees).forEach((tree) => {
                 const treeAccumulated = calculateAccumulatedFromTree(tree);
                 Object.assign(state.accumulatedDependencies, treeAccumulated);
             });
             // TODO: A more efficient cleanup of accumulatedDependencies is needed.

        } else {
            // Still log warnings
            console.warn(`[Reducer/removeNode] Node ${nodeIdToRemove} not found in state.dependencyTrees.`);
        }
    });
      
    // Add cases for production update actions by calling the imported function
    productionSliceExtraReducers(builder);
  }
});

export const { 
  setDependencies, 
  deleteTree, 
  updateAccumulated, 
  loadSavedState,
  updateNodeProperties,
  clearErrors,
} = dependencySlice.actions;
export default dependencySlice.reducer;

// Define custom actions for local use (if any) or move relevant ones
export const setExcess = createAction<{
  excess: number;
  nodeId: string;
  treeId: string;
}>('dependency/setExcess');

// Keep Recipe Loading Thunk
export const loadNodeRecipe = 
  (nodeId: string, treeId: string) => 
  async (dispatch: AppDispatch, getState: () => { dependencies: DependencyState }) => {
    
    const state = getState();
    // Check if dependencies state exists
    if (!state.dependencies) {
        // Still log errors
        console.error(`[RECIPE LOADER] Dependencies state is undefined`);
        return;
    }
    const tree = state.dependencies.dependencyTrees[treeId];
    if (!tree) {
      // Still log errors
      console.error(`[RECIPE LOADER] Tree ${treeId} not found`);
      return;
    }
    
    // Use findNodeById utility
    const node = findNodeById(tree, nodeId);
    if (!node) {
      // Still log errors
      console.error(`[RECIPE LOADER] Node ${nodeId} not found in tree ${treeId}`);
      return;
    }
    
    if (node.recipe) {
      // 
      return;
    }
    
    // FIX: Accessing recipe.id here caused issues, use node.recipe directly if needed
    // const recipeId = node.recipe?.id; // Removed this potentially problematic line
    // Instead, check if recipe exists directly
    if (!node.recipe) { // Check if recipe object is missing
      // Still log errors
      console.error(`[RECIPE LOADER] Node ${nodeId} has no recipe information. Attempting default.`);
      try {
        const recipe = await getRecipeByOutput(node.id);
        if (recipe) {
          dispatch(updateNodeProperties({ nodeId, updatedNode: { recipe } }));
          return;
        } else {
          // Still log errors
          console.error(`[RECIPE LOADER] No default recipe found for item ${node.id}`);
        }
      } catch (error) {
        // Still log errors
        console.error(`[RECIPE LOADER] Error getting default recipe:`, error);
      }
      return; // Return if no recipe and default fetch failed/didn't happen
    }
    
    // If we reach here, node.recipe exists, but maybe we still need to load it fully?
    // This part seems less likely to be reached now, but kept for structure.
    // Let's assume if node.recipe exists, it's the correct one for now.
    // const recipeId = node.recipe.id;
    // try {
    //   
    //   const recipe = await getRecipeById(recipeId); // This might be redundant if recipe object is already attached
    //   if (recipe) {
    //     
    //     dispatch(updateNodeProperties({ nodeId, updatedNode: { recipe } }));
    //   } else {
    //     console.error(`[RECIPE LOADER] Failed to load recipe ${recipeId}`);
    //   }
    // } catch (error) {
    //   console.error(`[RECIPE LOADER] Error loading recipe:`, error);
    // }
  };
