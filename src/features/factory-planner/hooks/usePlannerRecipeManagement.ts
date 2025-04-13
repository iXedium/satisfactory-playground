import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { getRecipeById } from '../../../data';
import { DependencyNode } from '../../../types';
import { 
  setDependencies, 
  setRecipeSelection 
} from '../store';
import { 
  calculateDependencyTree, 
  calculateAccumulatedFromTree, 
  findNodeById,
  AccumulatedNode
} from '../../../utils';

// Define the expected shape of the dependencies state slice locally
// Needs dependencyTrees for finding the node and passing context
// Needs accumulatedDependencies if calculateAccumulatedFromTree uses it?
// Needs errors if relevant?
interface DependencySliceStateForRecipe {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedDependencies: Record<string, AccumulatedNode>; 
  errors: unknown[];
}

interface PlannerRecipeManagementProps {
  dependencies: DependencySliceStateForRecipe;
  recipeSelections: Record<string, string>;
  excessMap: Record<string, number>;
}

export const usePlannerRecipeManagement = ({
  dependencies,
  recipeSelections,
  excessMap,
}: PlannerRecipeManagementProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleTreeRecipeChange = useCallback(async (nodeId: string, recipeId: string) => {
    console.log(`[Recipe Change] Node: ${nodeId}, New Recipe ID: ${recipeId}`);
    const currentTrees = dependencies.dependencyTrees;
    
    let treeId = '';
    let nodeToUpdate: DependencyNode | null = null;
    for (const id in currentTrees) {
      nodeToUpdate = findNodeById(currentTrees[id], nodeId);
      if (nodeToUpdate) {
        treeId = id;
        break;
      }
    }

    if (!nodeToUpdate || !treeId) {
      console.error(`[Recipe Change] Node ${nodeId} not found in any tree.`);
      return;
    }

    const currentTree = currentTrees[treeId];
    const newRecipe = await getRecipeById(recipeId);
    if (!newRecipe) {
        console.error(`[Recipe Change] Recipe ${recipeId} not found.`);
        return;
    }

    // Dispatch recipe selection update first
    dispatch(setRecipeSelection({ nodeId, recipeId }));

    // Create a deep copy only if necessary? calculateDependencyTree might handle immutability
    // For safety, let's keep the deep copy logic for now, though it might be redundant depending on calculateDependencyTree's implementation.
    const treeCopy = JSON.parse(JSON.stringify(currentTree)) as DependencyNode;

    // Update the recipe directly in the copy before recalculation
    const updateNodeRecipe = (node: DependencyNode): boolean => {
      if (node.uniqueId === nodeId) {
        node.recipe = newRecipe;
        console.log(`[Recipe Change] Updated recipe for node ${nodeId} in copied tree.`);
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (updateNodeRecipe(child)) return true;
        }
      }
      return false;
    };

    if (!updateNodeRecipe(treeCopy)) {
      console.error(`[Recipe Change] Failed to find and update node ${nodeId} in copied tree. This shouldn't happen.`);
      return; 
    }

    // Use the latest recipe selections (including the one just dispatched)
    // Note: Redux state might not update immediately, so merge manually for calculation
    const updatedRecipeSelections = { ...recipeSelections, [nodeId]: recipeId };
    
    try {
      // Recalculate the tree using the copied root node's info and the updated selections
      const recalculatedTree = await calculateDependencyTree(
        treeCopy.id,             // Root item ID
        treeCopy.amount,         // Root amount
        treeCopy.recipe?.id ?? null, // Root recipe ID (already updated in copy)
        updatedRecipeSelections, // Pass the merged, up-to-date selections
        0,                     // Reset depth for calculation
        [],                    // Affected branches (start fresh)
        '',                    // Parent ID prefix (none for root)
        excessMap,             // Pass current excess map
        {},                    // Legacy import map (empty)
        currentTrees           // Pass all trees for context (import/export resolution)
      );

      if (recalculatedTree) {
        // Recalculated tree might have a different uniqueId if not handled properly
        // Ensure the original treeId is used for dispatching the update
        recalculatedTree.uniqueId = treeId; 
        
        const accumulated = calculateAccumulatedFromTree(recalculatedTree);
        dispatch(setDependencies({ treeId, tree: recalculatedTree, accumulated }));
        console.log(`[Recipe Change] Dispatched updated tree ${treeId}.`);
      } else {
        console.error('[Recipe Change] Tree recalculation returned null/undefined.');
      }
    } catch (error) {
      console.error('[Recipe Change] Error during tree recalculation:', error);
      // Potentially dispatch an error state update here
    }
  }, [dependencies, recipeSelections, excessMap, dispatch]); // Dependencies updated

  return {
    handleTreeRecipeChange,
  };
}; 