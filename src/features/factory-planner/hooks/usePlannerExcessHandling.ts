/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, Dispatch, SetStateAction } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { DependencyNode } from '../../../types';
import { 
    updateTreeProduction, 
    checkAndConvertNodeTypeThunk, 
    calculateAndAutoImportThunk
} from '../store';
import { findNodeById } from '../../../utils';
import { createNewTreeStructure } from './usePlannerTreeCalculation';
import { PayloadAction } from '@reduxjs/toolkit';

// Define the expected shape of the dependencies state slice locally
// Matching the one used in usePlannerNodeInteractions
interface DependencySliceStateForExcess {
  dependencyTrees: Record<string, DependencyNode>;
}

interface PlannerExcessHandlingProps {
  dependencies: DependencySliceStateForExcess;
  setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
  generateTreeId: (itemId: string) => string;
  createNewTreeStructure: (
    itemId: string, 
    amount: number, 
    treeId: string, 
    recipeId: string | null, 
    isAutoImportRoot: boolean | undefined,
    originalDepth: number | undefined,
    isInitiallyByproductRoot: boolean | undefined,
    recipeSelections: Record<string, string>, 
    allTrees: Record<string, DependencyNode>
  ) => Promise<DependencyNode | null>;
}

export const usePlannerExcessHandling = ({
  dependencies,
  setExcessMap,
  generateTreeId,
  createNewTreeStructure,
}: PlannerExcessHandlingProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);

  const handleExcessChange = useCallback(async (nodeId: string, excess: number) => {
    // Update local map immediately
    setExcessMap(prevMap => ({ ...prevMap, [nodeId]: excess }));
    
    let treeIdToUpdate = null;
    let rootNodeUniqueId = null; // Store the uniqueId of the root

    // Determine the treeId and rootNode's uniqueId
    if (dependencies.dependencyTrees[nodeId]) { 
      const tree = dependencies.dependencyTrees[nodeId];
      treeIdToUpdate = nodeId;
      rootNodeUniqueId = tree.uniqueId;
      setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess })); 
      dispatch(updateTreeProduction(tree.uniqueId, nodeId, 'excess', excess));
    } else {
      let foundTreeId = '';
      for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
        const node = findNodeById(tree, nodeId);
        if (node) {
          foundTreeId = treeId;
          treeIdToUpdate = treeId; 
          rootNodeUniqueId = tree.uniqueId;
          break;
        }
      }
      if (!foundTreeId) return;
      dispatch(updateTreeProduction(nodeId, foundTreeId, 'excess', excess));
    }

    // --- Trigger Node Type Conversion Check and Potential Recalculation --- 
    setTimeout(async () => {
        console.log(`[handleExcessChange] Scheduling node type checks after update related to node ${nodeId}`);
        const stateBeforeChecks = { ...dependencies.dependencyTrees }; // Use current dependencies prop
        const rootIdsToCheck = Object.keys(stateBeforeChecks).filter(id => stateBeforeChecks[id].isRoot);

        // Dispatch checks for all roots and collect promises
        const checkPromises = rootIdsToCheck.map(rootId => 
            dispatch(checkAndConvertNodeTypeThunk(rootId))
        );

        // Wait for all checks to settle and get their results
        const results = await Promise.allSettled(checkPromises);
        console.log('[handleExcessChange] Node type checks settled.');

        const convertedNodeIds: string[] = [];
        results.forEach((result, index) => {
            // Add explicit type assertion for the fulfilled action
            if (result.status === 'fulfilled') {
                const fulfilledAction = result.value as PayloadAction<string | undefined>; // Type assertion
                if (fulfilledAction?.payload) {
                    const convertedId = fulfilledAction.payload;
                    if (convertedId) { // Ensure it's not undefined
                       convertedNodeIds.push(convertedId);
                       console.log(`[handleExcessChange] Detected B->N conversion for ${convertedId} via thunk result payload.`);
                    }
                }
            } else if (result.status === 'rejected') {
                 console.error(`[handleExcessChange] checkAndConvertNodeTypeThunk failed for root ${rootIdsToCheck[index]}:`, result.reason);
            }
        });

        // If any nodes converted B->N, trigger recalculation for them
        if (convertedNodeIds.length > 0) {
            console.log(`[handleExcessChange] Detected ${convertedNodeIds.length} B->N conversions. Recalculation is now handled directly in the thunk.`);
            
            // No need to trigger recalculation here anymore - the thunk handles it synchronously
            /*
            // This code is now disabled as recalculation happens directly in the checkAndConvertNodeTypeThunk
            await new Promise(resolve => setTimeout(resolve, 100)); 

            const latestTreesState = dependencies.dependencyTrees;
            console.log(`[handleExcessChange] Got latest state after delay. Starting recalculation.`);

            for (const convertedNodeId of convertedNodeIds) {
                 const nodeAfter = latestTreesState ? latestTreesState[convertedNodeId] : undefined;
                 if (nodeAfter) {
                    console.log(`[handleExcessChange] Node state for ${convertedNodeId}:`, 
                                JSON.stringify({
                                    id: nodeAfter.id,
                                    hasRecipe: !!nodeAfter.recipe,
                                    recipeId: nodeAfter.recipe?.id,
                                    isByproduct: nodeAfter.isByproduct
                                }));
                    
                    const recipeId = nodeAfter.recipe?.id;
                    if (recipeId) {
                        // Prepare args for the main thunk
                         const createStructureArg = async (
                            itemId: string, amount: number, treeId?: string, recipeIdOverride?: string | null, 
                            isAutoImportRoot?: boolean, originalDepth?: number, isInitiallyByproductRoot?: boolean
                          ): Promise<DependencyNode | null> => {
                              const actualTreeId = treeId || generateTreeId(itemId);
                              // Pass the *very latest* trees state into the helper
                              return createNewTreeStructure(
                                itemId, amount, actualTreeId, recipeIdOverride ?? null, 
                                isAutoImportRoot, originalDepth, isInitiallyByproductRoot, 
                                recipeSelections, dependencies.dependencyTrees // Use current dependencies from hook scope
                              );
                          };

                        console.log(`[handleExcessChange] Dispatching calculateAndAutoImportThunk for converted node ${convertedNodeId}`);
                        dispatch(calculateAndAutoImportThunk({
                            selectedItem: nodeAfter.id,
                            selectedRecipeId: recipeId,
                            recipeSelections,
                            generateTreeId,
                            createNewTreeStructure: createStructureArg
                        })).catch(error => {
                            console.error(`[handleExcessChange] Error dispatching recalculation for ${convertedNodeId}:`, error);
                        });
                    } else {
                        console.warn(`[handleExcessChange] Node ${convertedNodeId} converted B->N but has no recipe ID in latest state. Cannot trigger recalculation.`);
                    }
                 } else {
                      console.warn(`[handleExcessChange] Could not find state for node ${convertedNodeId} after B->N conversion. Skipping recalculation.`);
                 }
            }
            */
        } else {
             console.log('[handleExcessChange] No B->N conversions detected after checks.');
        }
    }, 10); // Initial delay
    // ------------------------------------------------------

  }, [dependencies, dispatch, setExcessMap, recipeSelections, generateTreeId, createNewTreeStructure]);

  return {
    handleExcessChange,
  };
}; 