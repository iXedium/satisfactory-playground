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
import { usePlannerNodeState } from './usePlannerNodeState';
import { calculateAndAutoImportThunk } from '../store/importExportLogic';

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
// Added isInitiallyByproductRoot
export type CreateTreeFunction = (
  itemId: string, 
  amount: number, 
  treeId?: string, 
  recipeId?: string | null, 
  isAutoImportRoot?: boolean, 
  originalDepth?: number, 
  isInitiallyByproductRoot?: boolean // Added flag
) => Promise<DependencyNode | null>;

// --- Extracted Tree Creation Logic --- 
// This version doesn't dispatch or use hook state directly
export const createNewTreeStructure = async (
  itemId: string, 
  amount: number, 
  treeId: string, // Require treeId to be generated beforehand
  recipeId: string | null, 
  isAutoImportRoot: boolean | undefined,
  originalDepth: number | undefined,
  isInitiallyByproductRoot: boolean | undefined,
  recipeSelections: Record<string, string>, // Pass needed state/data
  allTrees: Record<string, DependencyNode>
): Promise<DependencyNode | null> => {
  
  if (isInitiallyByproductRoot) {
    const byproductRootNode: DependencyNode = {
      id: itemId,
      amount: amount, 
      uniqueId: treeId,
      children: [], 
      recipe: undefined, 
      isRoot: true, 
      isByproduct: true, 
      depth: 0, 
      originalDepth: originalDepth ?? 0
    };
    return byproductRootNode;
  }

  const recipe = recipeId ? await getRecipeById(recipeId) : await getRecipeByOutput(itemId);
  if (!recipe) {
    const basicNode: DependencyNode = { 
      id: itemId,
      amount: amount,
      uniqueId: treeId,
      children: [],
      isRoot: isAutoImportRoot,
      isByproduct: false, 
      depth: 0, 
      originalDepth: originalDepth ?? 0
    };
    return basicNode;
  }

  try {
    const tree = await calculateDependencyTree(
      itemId,
      amount,
      recipe.id,
      recipeSelections,
      0, 
      [],
      treeId,
      {},
      {},
      allTrees
    );

    if (!tree) {
      console.error(`Failed to calculate dependency tree for ${itemId}`);
      return null;
    }

    tree.uniqueId = treeId;
    tree.recipe = recipe;
    tree.isRoot = true; 
    tree.isByproduct = false; 
    tree.depth = 0; 
    tree.originalDepth = originalDepth ?? 0;
    return tree;

  } catch (error) {
    console.error(`Error creating new tree structure for ${itemId}:`, error);
    return null;
  }
};
// ------------------------------------

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

  // handleCreateNewTree now becomes a simpler wrapper for dispatching
  // It's primarily used for MANUAL creation, not auto-import internal calls
  const handleCreateNewTree = useCallback(async (
    itemId: string, 
    amount: number, 
    treeIdParam?: string, 
    recipeId?: string | null, 
    isAutoImportRoot?: boolean,
    originalDepth?: number,
    isInitiallyByproductRoot?: boolean
  ): Promise<void> => { // Returns void now, just dispatches
    const treeId = treeIdParam || generateTreeId(itemId);
    const newTree = await createNewTreeStructure(
      itemId, amount, treeId, recipeId ?? null, isAutoImportRoot, originalDepth, 
      isInitiallyByproductRoot, recipeSelections, dependencies.dependencyTrees
    );
    if (newTree) {
      dispatch(setDependencies({ treeId, tree: newTree }));
      // Set default state for manually created tree
      const resetValues = (node: DependencyNode) => {
        setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
        if (node.children) {
          node.children.forEach(resetValues);
        }
      };
      resetValues(newTree);
      setExpandedNodes(prev => ({ ...prev, [treeId]: true })); // Expand manual trees
    }
  }, [dispatch, recipeSelections, dependencies.dependencyTrees, generateTreeId, setMachineCountMap, setMachineMultiplierMap, setExcessMap, setExpandedNodes]);

  const handleCalculate = useCallback(async () => {
    if (!selectedItem || !selectedRecipe) return;
    
    updateRecentItems(selectedItem);
    
    if (autoImport) {
      try {
        // --- Pass a correctly typed lambda for createNewTreeStructure --- 
        const createStructureArg = async (
          itemId: string, amount: number, treeId?: string, recipeId?: string | null, 
          isAutoImportRoot?: boolean, originalDepth?: number, isInitiallyByproductRoot?: boolean
        ): Promise<DependencyNode | null> => {
            // Ensure treeId is generated if missing before calling the main logic
            const actualTreeId = treeId || generateTreeId(itemId);
            return createNewTreeStructure(
              itemId, amount, actualTreeId, recipeId ?? null, // Ensure null if undefined
              isAutoImportRoot, originalDepth, isInitiallyByproductRoot, 
              recipeSelections, dependencies.dependencyTrees
            );
        };

        const result = await dispatch(calculateAndAutoImportThunk({
          selectedItem,
          selectedRecipeId: selectedRecipe,
          generateTreeId,
        })).unwrap();
        
        
        // Set expanded state (Keep this part)
        setExpandedNodes(prev => {
          const newState = { ...prev };
          // Collapse new roots that might have been created
          result.newRootIds.forEach(id => { 
              // Only collapse if it wasn't the main tree added
              if (id !== result.mainTreeId) { 
                  newState[id] = false; 
              }
          });
          // Expand the main root that was just added
          if (result.mainTreeId) {
            newState[result.mainTreeId] = true;
          }
          return newState;
        });
        
      } catch (error) {
        console.error("Error dispatching or processing calculateAndAutoImportThunk:", error);
      }
    } else {
      // --- Non-Auto-Import Logic (Simpler) --- 
      try {
        const treeId = generateTreeId(selectedItem);
        const tree = await calculateDependencyTree(
          selectedItem, 0, selectedRecipe, recipeSelections, 0, [], 
          treeId, {}, {}, dependencies.dependencyTrees
        );
        if (tree) {
          tree.uniqueId = treeId;
          tree.recipe = await getRecipeById(selectedRecipe) ?? undefined;
          tree.depth = 0;
          tree.originalDepth = 0;
          
          const accumulated = calculateAccumulatedFromTree(tree);
          dispatch(setDependencies({ treeId, tree }));
          dispatch(setRecipeSelection({ nodeId: selectedItem, recipeId: selectedRecipe }));
          
          const resetValues = (node: DependencyNode) => {
            setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
            setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
            setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
            if (node.children) {
              node.children.forEach(resetValues);
            }
          };
          resetValues(tree);
          setExpandedNodes(prev => ({ ...prev, [treeId]: true }));
        } else {
          console.error("Failed to calculate non-auto-import tree");
        }
      } catch (error) {
        console.error("Error calculating non-auto-import tree:", error);
      }
    }

    // --- UI Refresh Hack (Keep?) ---
    setTimeout(() => {
      const treeViewElement = document.getElementById('tree-view');
      if (treeViewElement) {
        treeViewElement.style.opacity = '0.99';
        setTimeout(() => {
          if (treeViewElement) treeViewElement.style.opacity = '1';
        }, 10);
      }
    }, 100);
  }, [selectedItem, selectedRecipe, recipeSelections, updateRecentItems, generateTreeId, dispatch, setMachineCountMap, setMachineMultiplierMap, setExcessMap, autoImport, dependencies.dependencyTrees, setExpandedNodes]);

  return {
    handleCalculate,
    handleCreateNewTree,
  };
}; 