import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { getRecipeById, getRecipeByOutput } from '../../../data';
import { DependencyNode } from '../../../types';
import { 
  setDependencies, 
  setRecipeSelection 
} from '../store';
import { calculateDependencyTree, calculateAccumulatedFromTree, AccumulatedNode } from '../../../utils';
import { convertToImportTree } from '../../../utils';
import { usePlannerNodeState } from './usePlannerNodeState';

interface DependencySliceStateForCalc {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedDependencies: Record<string, AccumulatedNode>; 
  errors: unknown[]; // Replace any[] with unknown[]
}

interface PlannerTreeCalculationProps {
  selectedItem: string;
  selectedRecipe: string;
  recipeSelections: Record<string, string>;
  dependencies: DependencySliceStateForCalc; // Use the local type
  excessMap: Record<string, number>;
  updateRecentItems: (itemId: string) => void;
  setMachineCountMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setMachineMultiplierMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setExcessMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  autoImport: boolean;
}

// Define the type for the createTreeFn used by convertToImportTree
// It now includes originalDepth
export type CreateTreeFunction = (
  itemId: string, 
  amount: number, 
  treeId?: string, 
  recipeId?: string | null, 
  isAutoImportRoot?: boolean, 
  originalDepth?: number // Added originalDepth
) => Promise<DependencyNode | null>;

export const usePlannerTreeCalculation = ({
  selectedItem,
  selectedRecipe,
  recipeSelections,
  dependencies,
  updateRecentItems,
  setMachineCountMap,
  setMachineMultiplierMap,
  setExcessMap,
  autoImport,
}: Omit<PlannerTreeCalculationProps, 'excessMap'>) => {
  const dispatch = useDispatch<AppDispatch>();
  const { setExpandedNodes } = usePlannerNodeState();

  const generateTreeId = useCallback((itemId: string): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `tree-${itemId}-${timestamp}-${randomSuffix}`;
  }, []);

  const handleCreateNewTree = useCallback(async (
    itemId: string, 
    amount: number, 
    treeId?: string, 
    recipeId?: string | null, 
    isAutoImportRoot?: boolean,
    originalDepth?: number // Accept originalDepth
  ): Promise<DependencyNode | null> => {
    console.log(`[handleCreateNewTree] Called for ${itemId}. Received originalDepth: ${originalDepth}`);
    const actualTreeId = treeId || generateTreeId(itemId);
    const recipe = recipeId ? await getRecipeById(recipeId) : await getRecipeByOutput(itemId);
    if (!recipe) {
      console.warn(`Could not find recipe for ${itemId} (recipeId: ${recipeId})`);
      const basicNode: DependencyNode = {
        id: itemId,
        amount: amount,
        uniqueId: actualTreeId,
        children: [],
        isRoot: isAutoImportRoot,
        depth: 0,
        originalDepth: originalDepth ?? 0
      };
      console.log(`[handleCreateNewTree] Basic node ${basicNode.uniqueId} assigned originalDepth: ${basicNode.originalDepth}`);
      return basicNode;
    }

    try {
      // Calculate the tree structure first
      const tree = await calculateDependencyTree(
        itemId,
        amount,
        recipe.id,
        recipeSelections,
        0, // Start calculation depth at 0 for the new tree
        [],
        actualTreeId,
        {},
        {},
        dependencies.dependencyTrees
      );

      if (!tree) {
        console.error(`Failed to calculate dependency tree for ${itemId}`);
        return null;
      }

      // Assign properties to the root node
      tree.uniqueId = actualTreeId;
      tree.recipe = recipe;
      tree.isRoot = isAutoImportRoot;
      tree.depth = 0; // It's a root, so depth is 0 in its own tree
      tree.originalDepth = originalDepth ?? 0;
      console.log(`[handleCreateNewTree] Calculated tree ${tree.uniqueId} assigned originalDepth: ${tree.originalDepth}`);

      return tree;

    } catch (error) {
      console.error(`Error creating new tree for ${itemId}:`, error);
      return null;
    }
    // Removed dependencies no longer used directly (excessMap, setters for machine/excess)
  }, [dispatch, recipeSelections, dependencies.dependencyTrees, generateTreeId]);

  const handleCalculate = useCallback(async () => {
    if (!selectedItem || !selectedRecipe) return;
    
    updateRecentItems(selectedItem);
    
    try {
      const treeId = generateTreeId(selectedItem);
      const uniquePrefix = `${treeId}`;
      const rootRecipe = await getRecipeById(selectedRecipe);
      if (!rootRecipe) {
        console.error(`Could not find recipe ${selectedRecipe} for ${selectedItem}`);
        return;
      }
      
      let tree = await calculateDependencyTree(
        selectedItem,
        0,
        selectedRecipe,
        recipeSelections,
        0, [], uniquePrefix, {}
      );
      
      if (!tree) {
        console.error("Failed to calculate dependency tree");
        return;
      }
      
      tree.uniqueId = treeId;
      tree.recipe = rootRecipe;
      tree.depth = 0;
      tree.originalDepth = 0; // Main tree originalDepth is also 0

      if (autoImport) {
        const initialTrees = { ...dependencies.dependencyTrees };
        const pendingCreations: Record<string, Promise<DependencyNode | null>> = {};

        // Use the exported type for the function signature
        const createAndConvertTreeFn: CreateTreeFunction = async (
          itemId: string, 
          amount: number, 
          treeId?: string, 
          recipeId?: string | null, 
          isAutoImportRoot?: boolean,
          originalDepth?: number // Added originalDepth here
        ) => {
          // Pass originalDepth to handleCreateNewTree
          const newTree = await handleCreateNewTree(
            itemId, amount, treeId, recipeId, isAutoImportRoot, originalDepth
          );

          if (newTree) {
            const mutableNewTree = JSON.parse(JSON.stringify(newTree));
            // Pass the correctly typed createAndConvertTreeFn to convertToImportTree
            const processedNewTree = await convertToImportTree(mutableNewTree, initialTrees, createAndConvertTreeFn, pendingCreations);

            if (processedNewTree) {
              const accumulated = calculateAccumulatedFromTree(processedNewTree);
              dispatch(setDependencies({ treeId: processedNewTree.uniqueId, tree: processedNewTree, accumulated }));
              
              const resetMachineValues = (node: DependencyNode) => {
                setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
                setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
                setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
                if (node.children) {
                  node.children.forEach(resetMachineValues);
                }
              };
              resetMachineValues(processedNewTree);
              
              if (processedNewTree.isRoot) {
                console.log(`[ExpandedNodes] Setting auto-imported root ${processedNewTree.uniqueId} to collapsed (false).`);
                setExpandedNodes(prev => {
                  const newState = { ...prev, [processedNewTree.uniqueId]: false };
                  console.log(`[ExpandedNodes] State AFTER setting ${processedNewTree.uniqueId} to false:`, newState);
                  return newState;
                });
              }
            }
            return processedNewTree;
          } else {
            return null;
          }
        };

        // Pass the correctly typed function to convertToImportTree
        tree = await convertToImportTree(tree, initialTrees, createAndConvertTreeFn, pendingCreations);
      }
      
      const accumulated = calculateAccumulatedFromTree(tree);
      
      dispatch(setDependencies({ treeId, tree, accumulated }));
      dispatch(setRecipeSelection({ nodeId: selectedItem, recipeId: selectedRecipe }));
      
      const resetMachineValues = (node: DependencyNode) => {
        setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
        
        if (node.children) {
          node.children.forEach(resetMachineValues);
        }
      };
      resetMachineValues(tree);
      
      console.log(`[ExpandedNodes] Setting main root ${tree.uniqueId} (originalDepth: ${tree.originalDepth}) to expanded (true).`);
      setExpandedNodes(prev => {
         const newState = { ...prev, [tree.uniqueId]: true };
         console.log(`[ExpandedNodes] State AFTER setting ${tree.uniqueId} to true:`, newState);
         return newState;
      });

      setTimeout(() => {
        const treeViewElement = document.getElementById('tree-view');
        if (treeViewElement) {
          treeViewElement.style.opacity = '0.99';
          setTimeout(() => {
            if (treeViewElement) treeViewElement.style.opacity = '1';
          }, 10);
        }
      }, 100);
    } catch (error) {
      console.error("Error calculating dependency tree:", error);
    }
  }, [selectedItem, selectedRecipe, recipeSelections, updateRecentItems, generateTreeId, dispatch, setMachineCountMap, setMachineMultiplierMap, setExcessMap, autoImport, handleCreateNewTree, dependencies.dependencyTrees, setExpandedNodes]);

  return {
    handleCalculate,
    handleCreateNewTree,
  };
}; 