import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { getRecipeById } from '../../../data';
import { DependencyNode } from '../../../types';
import { 
  setDependencies, 
  setRecipeSelection 
} from '../store';
import { calculateDependencyTree, calculateAccumulatedFromTree, AccumulatedNode } from '../../../utils';

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
}

export const usePlannerTreeCalculation = ({
  selectedItem,
  selectedRecipe,
  recipeSelections,
  dependencies,
  excessMap,
  updateRecentItems,
  setMachineCountMap,
  setMachineMultiplierMap,
  setExcessMap,
}: PlannerTreeCalculationProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const generateTreeId = useCallback((itemId: string): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `tree-${itemId}-${timestamp}-${randomSuffix}`;
  }, []);

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
      
      // console.log(`[CALC DEBUG] Retrieved recipe for ${selectedItem}:`, 
      //   { id: rootRecipe.id, inputs: Object.keys(rootRecipe.in), outputs: Object.keys(rootRecipe.out) });
      
      const tree = await calculateDependencyTree(
        selectedItem,
        0, // Initial amount 0
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
      
      // UI refresh hack - might need a better solution
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
  }, [selectedItem, selectedRecipe, recipeSelections, updateRecentItems, generateTreeId, dispatch, setMachineCountMap, setMachineMultiplierMap, setExcessMap]);

  const handleCreateNewTree = useCallback(async (
    itemId: string, 
    amount: number, 
    treeId: string = generateTreeId(itemId),
    recipeId: string | null = null 
  ) => {
    // console.log('[handleCreateNewTree] Creating new tree', { itemId, amount, treeId, recipeId });
    updateRecentItems(itemId);
    try {
      const rootRecipe = recipeId ? await getRecipeById(recipeId) : null;
      
      const tree = await calculateDependencyTree(
        itemId,
        amount,
        rootRecipe?.id ?? null,
        recipeSelections,
        0, [], '', excessMap, {},
        dependencies.dependencyTrees // Pass existing trees for context
      );

      if (!tree) {
        console.error("Failed to calculate dependency tree for new item");
        return;
      }
      
      tree.uniqueId = treeId; // Ensure uniqueId is set correctly
      if (rootRecipe) {
        tree.recipe = rootRecipe;
      }

      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ treeId, tree, accumulated }));
      
      // Initialize machine/excess values for the new tree
      const resetMachineValues = (node: DependencyNode) => {
        setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
        
        if (node.children) {
          node.children.forEach(resetMachineValues);
        }
      };
      resetMachineValues(tree);

      // console.log(`[handleCreateNewTree] New tree ${treeId} created and dispatched.`);
    } catch (error) {
      console.error("Error calculating dependencies for new tree:", error);
    }
  }, [dispatch, recipeSelections, excessMap, dependencies.dependencyTrees, updateRecentItems, generateTreeId, setMachineCountMap, setMachineMultiplierMap, setExcessMap]);

  return {
    handleCalculate,
    handleCreateNewTree,
    // generateTreeId is internal, no need to return unless used elsewhere
  };
}; 