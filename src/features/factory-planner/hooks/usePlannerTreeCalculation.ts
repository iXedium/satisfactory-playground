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
import { convertToImportTree } from '../../../utils';

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
  addAsImported: boolean;
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
  addAsImported,
}: PlannerTreeCalculationProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const generateTreeId = useCallback((itemId: string): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `tree-${itemId}-${timestamp}-${randomSuffix}`;
  }, []);

  // Define handleCreateNewTree *before* handleCalculate
  const handleCreateNewTree = useCallback(async (
    itemId: string, 
    amount: number, 
    treeId: string = generateTreeId(itemId),
    recipeId: string | null = null,
    isAutoImportRoot = false
  ): Promise<DependencyNode | null> => {
    // console.log('[handleCreateNewTree] Creating new tree', { itemId, amount, treeId, recipeId });
    if (!isAutoImportRoot) {
      updateRecentItems(itemId);
    }
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
        return null;
      }
      
      tree.uniqueId = treeId; // Ensure uniqueId is set correctly
      if (rootRecipe) {
        tree.recipe = rootRecipe;
      }

      console.log(`[handleCreateNewTree] New tree ${treeId} calculated (but not yet dispatched).`);
      return tree;
    } catch (error) {
      console.error("Error calculating dependencies for new tree:", error);
      return null;
    }
  }, [dispatch, recipeSelections, excessMap, dependencies.dependencyTrees, updateRecentItems, generateTreeId, setMachineCountMap, setMachineMultiplierMap, setExcessMap]);

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
      
      let tree = await calculateDependencyTree(
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
      
      // If AddAsImported is checked, convert children to imports
      if (addAsImported) {
        console.log("[AddAsImported] Option enabled, starting conversion...");
        const initialTrees = { ...dependencies.dependencyTrees }; // Shallow copy for THIS pass
        const pendingCreations: Record<string, Promise<DependencyNode | null>> = {}; // Track pending creations

        // Define a wrapper for createTreeFn that also converts the new tree
        const createAndConvertTreeFn = async (
          itemId: string, 
          amount: number, 
          treeId?: string, 
          recipeId?: string | null, 
          isAutoImportRoot?: boolean, // Should always be true from convertToImportTree
          // Add pendingCreations map to signature
          _pendingCreations?: Record<string, Promise<DependencyNode | null>> // Use _ to avoid conflict if not needed directly
        ): Promise<DependencyNode | null> => {
          // 1. Create the basic tree structure
          const newTree = await handleCreateNewTree(
            itemId, amount, treeId, recipeId, isAutoImportRoot
          );

          if (newTree) {
            // 2. If creation succeeded, recursively convert this new tree
            console.log(`[createAndConvertTreeFn] New tree ${newTree.uniqueId} created, now running conversion on it...`);
            const mutableNewTree = JSON.parse(JSON.stringify(newTree));
            // Pass pendingCreations down
            const processedNewTree = await convertToImportTree(mutableNewTree, initialTrees, createAndConvertTreeFn, pendingCreations);
            console.log(`[createAndConvertTreeFn] Conversion finished for ${newTree.uniqueId}.`);

            // --- Dispatch the *processed* new tree and initialize its state --- 
            if (processedNewTree) {
              const accumulated = calculateAccumulatedFromTree(processedNewTree);
              dispatch(setDependencies({ treeId: processedNewTree.uniqueId, tree: processedNewTree, accumulated }));
              
              // Initialize machine/excess values for the new processed tree
              const resetMachineValues = (node: DependencyNode) => {
                setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
                setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
                setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
                if (node.children) {
                  node.children.forEach(resetMachineValues);
                }
              };
              resetMachineValues(processedNewTree);
              console.log(`[createAndConvertTreeFn] Processed tree ${processedNewTree.uniqueId} dispatched and state initialized.`);
            }
            // ------------------------------------------------------------------

            return processedNewTree;
          } else {
            // Creation failed
            return null;
          }
        };

        // Start the main conversion process with the wrapper function and pending map
        tree = await convertToImportTree(tree, initialTrees, createAndConvertTreeFn, pendingCreations);
        console.log("[AddAsImported] Conversion complete.");
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
  }, [selectedItem, selectedRecipe, recipeSelections, updateRecentItems, generateTreeId, dispatch, setMachineCountMap, setMachineMultiplierMap, setExcessMap, addAsImported, handleCreateNewTree, dependencies.dependencyTrees]);

  return {
    handleCalculate,
    handleCreateNewTree,
    // generateTreeId is internal, no need to return unless used elsewhere
  };
}; 