import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { getRecipeById, getRecipeByOutput } from '../../../data';
import { DependencyNode } from '../../../types';
import { 
  setDependencies, 
  setRecipeSelection, 
  updateNodeProperties
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
export type CreateTreeFunction = (
  itemId: string, 
  amount: number, 
  treeId?: string, 
  recipeId?: string | null, 
  isAutoImportRoot?: boolean,
  originalDepth?: number,
  isSourceNodeByproduct?: boolean // Renamed from isByproductRoot
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
    originalDepth?: number,
    isSourceNodeByproduct?: boolean // Renamed parameter
  ): Promise<DependencyNode | null> => {
    const actualTreeId = treeId || generateTreeId(itemId);

    const recipe = recipeId ? await getRecipeById(recipeId) : await getRecipeByOutput(itemId);
    if (!recipe) {
      return {
        id: itemId,
        amount: amount,
        uniqueId: actualTreeId,
        children: [],
        isRoot: true, // It's becoming a root
        depth: 0, 
        originalDepth: originalDepth ?? 0,
        isByproduct: isSourceNodeByproduct ?? false, // Assign from flag
      };
    }

    try {
      const tree = await calculateDependencyTree(
        itemId,
        amount, // Amount might be 0 initially from convertToImportTree
        recipe.id,
        recipeSelections, // Pass recipeSelections
        0, // Start calculation depth at 0
        [], actualTreeId, {}, {},
        dependencies.dependencyTrees // Pass existing trees for context
      );

      if (!tree) {
        return null;
      }

      // Assign properties to the root node
      tree.uniqueId = actualTreeId;
      tree.recipe = recipe;
      tree.isRoot = true; // Mark as root
      tree.depth = 0; 
      tree.originalDepth = originalDepth ?? 0; 
      tree.isByproduct = isSourceNodeByproduct ?? false; // Assign based on source
      console.log(`[handleCreateNewTree] Calculated tree ${tree.uniqueId}. Assigned isByproduct: ${tree.isByproduct}`);

      return tree;

    } catch (error) {
      console.error(`Error creating new tree for ${itemId}:`, error);
      return null;
    }
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
      
      const tree = await calculateDependencyTree(
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

      let finalTree: DependencyNode | null = tree;
      let workingInitialTrees: Record<string, DependencyNode> = {};

      if (autoImport) {
        workingInitialTrees = { ...dependencies.dependencyTrees }; 
        const pendingCreations: Record<string, Promise<DependencyNode | null>> = {};

        const createAndConvertTreeFn: CreateTreeFunction = async (
          itemId: string, 
          amount: number, 
          treeId?: string, 
          recipeId?: string | null, 
          isAutoImportRoot?: boolean,
          originalDepth?: number,
          isSourceNodeByproduct?: boolean // Renamed param
        ) => {
          const newTree = await handleCreateNewTree(
            itemId, amount, treeId, recipeId, isAutoImportRoot, originalDepth, isSourceNodeByproduct
          );
          
          if (newTree) {
            workingInitialTrees[newTree.uniqueId] = newTree;
            const mutableNewTree = JSON.parse(JSON.stringify(newTree));
            
            const processedNewTree = await convertToImportTree(
              mutableNewTree, 
              workingInitialTrees,
              createAndConvertTreeFn, 
              pendingCreations
            );

            if (processedNewTree) { 
              workingInitialTrees[processedNewTree.uniqueId] = processedNewTree;
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
                setExpandedNodes(prev => ({ ...prev, [processedNewTree.uniqueId]: false }));
              }
            }
            return processedNewTree; 
          } else {
            return null;
          }
        };

        finalTree = await convertToImportTree(
          tree, 
          workingInitialTrees,
          createAndConvertTreeFn, 
          pendingCreations
        );

        if (!finalTree) {
          console.error("[handleCalculate] Main convertToImportTree call returned null! Aborting further processing.");
          return;
        }
      }
      
      if (!finalTree) {
         console.error("[handleCalculate] finalTree became null unexpectedly after autoImport block.");
         return;
      }
      
      const accumulatedMain = calculateAccumulatedFromTree(finalTree);
      dispatch(setDependencies({ treeId: finalTree.uniqueId, tree: finalTree, accumulated: accumulatedMain }));
      dispatch(setRecipeSelection({ nodeId: selectedItem, recipeId: selectedRecipe }));
      
      const resetMachineValuesMain = (node: DependencyNode) => {
        setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
        setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
        
        if (node.children) {
          node.children.forEach(resetMachineValuesMain);
        }
      };
      resetMachineValuesMain(finalTree);
      
      setExpandedNodes(prev => ({ ...prev, [finalTree.uniqueId]: true }));
      
      if (autoImport) { 
        Object.keys(workingInitialTrees).forEach(treeId => {
          const convertedTree = workingInitialTrees[treeId];
          const originalTree = dependencies.dependencyTrees[treeId]; // State BEFORE calculation
          
          if (originalTree && convertedTree) {
              if (originalTree.isByproduct !== convertedTree.isByproduct) {
                console.log(`[Reconcile] Detected byproduct status change for ${treeId} (${convertedTree.id}): ${originalTree.isByproduct} -> ${convertedTree.isByproduct}. Dispatching full update.`); // KEEP this specific log
                
                // --- UPDATED RECONCILIATION ACTION --- 
                // Dispatch setDependencies to update the entire tree structure,
                // as the conversion recalculates recipe, children, etc.
                const accumulated = calculateAccumulatedFromTree(convertedTree);
                dispatch(setDependencies({ treeId: convertedTree.uniqueId, tree: convertedTree, accumulated }));
                
                // We might also need to reset machine/excess counts for the newly converted node
                // and potentially its new children if the structure changed significantly.
                // Consider doing this similar to how it's done for newly created trees.
                const resetMachineValues = (node: DependencyNode) => {
                    setMachineCountMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
                    setMachineMultiplierMap(prev => ({ ...prev, [node.uniqueId]: 1 }));
                    setExcessMap(prev => ({ ...prev, [node.uniqueId]: 0 }));
                    if (node.children) {
                      node.children.forEach(resetMachineValues);
                    }
                };
                resetMachineValues(convertedTree);
                setExpandedNodes(prev => ({ ...prev, [convertedTree.uniqueId]: true })); // Expand the converted node
                // --- END UPDATED ACTION --- 
                
              } else if (originalTree.recipe?.id !== convertedTree.recipe?.id) {
                  console.log(`[Reconcile] Detected recipe change for ${treeId} (${convertedTree.id}): ${originalTree.recipe?.id} -> ${convertedTree.recipe?.id}. Dispatching properties update.`); // Keep this specific log
                  dispatch(updateNodeProperties({ 
                      nodeId: treeId, 
                      updatedNode: { 
                          recipe: convertedTree.recipe 
                          // Potentially update other relevant properties if needed
                      } 
                  }));
              }
          } else if (originalTree && !convertedTree) {
             console.warn(`[Reconcile] Tree ${treeId} existed originally but is missing from workingInitialTrees after conversion.`); // Keep this warning
          } else if (!originalTree && convertedTree) {
             // This is expected for newly created trees, no action needed here
          }
        });
      }
      
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