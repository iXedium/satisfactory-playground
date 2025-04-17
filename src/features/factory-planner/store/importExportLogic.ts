import { createAction, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer'; // Needed for Immer types in reducers
import { DependencyNode } from '../../../types';
import { 
  clearImportReference, 
  setImportReference,
  getImportReference
} from '../../../utils/nodeReferenceUtils';
import { findNodeById } from '../../../utils';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '../../../store';
import { 
  getRecipeByOutput 
} from "../../../data";
import { calculateDependencyTree } from "../../../utils/calculateDependencyTree";
import { updateNodeProperties, setDependencies } from './dependencySlice';
import { 
  CreateTreeFunction, 
  // We might need handleCreateNewTree or replicate its logic if it uses non-serializable state
} from '../hooks/usePlannerTreeCalculation'; 
import { convertToImportTree } from '../../../utils';
import { calculateAccumulatedFromTree } from '../../../utils/calculateAccumulatedFromTree';
import { 
  AccumulatedNode 
} from "../../../utils/calculateAccumulatedFromTree";
import { DeferredByproductInfo } from '../../../utils/importNodeLogic';

// --- Define the expected Slice State Shape locally --- 
interface ImportExportDependencyState {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedDependencies: Record<string, AccumulatedNode>;
  errors: string[]; // Keep consistent with original type
}

// Define Action Creators related to import/export
export const importNodeAction = createAction<{
  nodeId: string;
  targetTreeId: string;
  sourceTreeId: string;
  shouldImport: boolean;
}>('dependency/importNode');

export const unimportNode = createAction<{
  nodeId: string;
  targetTreeId: string;
  sourceTreeId: string;
}>('dependency/unimportNode');

// Add removeNodeAction
export const removeNodeAction = createAction<string>('dependency/removeNode'); // Payload is nodeIdToDestroy

// Helper function to find and replace a node in a tree by its uniqueId (mutable - use with Immer)
export const findAndReplaceNode = (tree: WritableDraft<DependencyNode>, nodeId: string, replacement: WritableDraft<DependencyNode>): boolean => {
  if (tree.uniqueId === nodeId) {
    console.error("Cannot replace the root node using findAndReplaceNode");
    return false;
  }
  if (tree.children) {
    for (let i = 0; i < tree.children.length; i++) {
      if (tree.children[i].uniqueId === nodeId) {
        console.log(`[findAndReplaceNode] Replacing node ${nodeId} in tree`);
        tree.children[i] = replacement;
        return true;
      }
    }
    for (let i = 0; i < tree.children.length; i++) {
      if (findAndReplaceNode(tree.children[i], nodeId, replacement)) {
        return true;
      }
    }
  }
  return false;
};

// --- Thunk Args Interface --- 
interface CalculateAndAutoImportArgs {
  selectedItem: string;
  selectedRecipeId: string;
  recipeSelections: Record<string, string>;
  generateTreeId: (itemId: string) => string; // Pass the ID generator function
  // We need a way to create the basic tree structure *without* Redux dispatch initially
  // Let's redefine handleCreateNewTree slightly or pass its core logic
  createNewTreeStructure: (
    itemId: string, 
    amount: number, 
    treeId?: string, 
    recipeId?: string | null, 
    isAutoImportRoot?: boolean,
    originalDepth?: number,
    isInitiallyByproductRoot?: boolean
  ) => Promise<DependencyNode | null>; // This version MUST NOT dispatch
}

// --- Thunk Return Type --- 
interface CalculateAndAutoImportResult {
  mainTreeId: string | null;
  newRootIds: string[];
}

// --- calculateAndAutoImportThunk Definition --- 
export const calculateAndAutoImportThunk = createAsyncThunk<
  CalculateAndAutoImportResult, // Return type
  CalculateAndAutoImportArgs, // Argument type
  { dispatch: AppDispatch; state: RootState } // ThunkApi config
>(
  'dependency/calculateAndAutoImport',
  async (args, { getState, dispatch }) => {
    const { 
      selectedItem, 
      selectedRecipeId,
      recipeSelections,
      generateTreeId,
      createNewTreeStructure // Use the passed function
    } = args;

    let mainTreeId: string | null = null;
    // Use a Set for efficient tracking of final root IDs
    const finalRootIds = new Set<string>(); 

    try {
      const initialTreesState = { ...getState().dependencies.dependencyTrees };
      Object.keys(initialTreesState).forEach(id => finalRootIds.add(id)); // Add existing roots

      // --- State Tracking within Thunk ---
      const newTreesCreated: Record<string, DependencyNode> = {}; // Store fully processed new trees
      const processedItemIds = new Set<string>(Object.values(initialTreesState).map(t => t.id)); // Track items with roots
      const pendingCreations: Record<string, Promise<DependencyNode | null>> = {}; // Prevent duplicate creation calls
      // Initialize the deferred byproducts map
      const deferredByproducts = new Map<string, DeferredByproductInfo[]>();

      // --- Initial Main Tree Calculation ---
      const initialMainTreeCalc = await calculateDependencyTree(
        selectedItem, 0, selectedRecipeId, recipeSelections, 0, [], '', {}, {}, initialTreesState
      );

      if (!initialMainTreeCalc) {
        console.error("[Thunk] Initial main tree calculation failed");
        return { mainTreeId, newRootIds: Array.from(finalRootIds) };
      }
      
      const treeId = generateTreeId(selectedItem);
      const rootRecipe = await getRecipeByOutput(selectedRecipeId);
      // Make a mutable copy for processing
      const mutableMainTree = JSON.parse(JSON.stringify(initialMainTreeCalc)); 
      mutableMainTree.uniqueId = treeId;
      mutableMainTree.recipe = rootRecipe; 
      mutableMainTree.depth = 0;
      mutableMainTree.originalDepth = 0;
      mainTreeId = treeId;
      finalRootIds.add(treeId); // Add the main tree ID
      processedItemIds.add(selectedItem); // Mark main item as processed

      // --- Modified createAndConvertTreeFn (Handles Logic, No Dispatch, FULL Inline Conversion) ---
      const createAndConvertTreeFn: CreateTreeFunction = async (
        itemId, amount, treeIdOverride, recipeIdOverride, isAutoImportRoot, originalDepth, isInitiallyByproductRoot
      ) => {

        let existingTree: DependencyNode | null = null;
        let existingIsByproduct = false;

        // Find existing tree (Check initial THEN newly created - IMPORTANT ORDER)
        existingTree = Object.values(initialTreesState).find(t => t.id === itemId) || null;
        if (!existingTree) {
             existingTree = Object.values(newTreesCreated).find(t => t.id === itemId) || null;
        }

        if (existingTree) {
             // Determine byproduct status based on the definitive version in newTreesCreated if it exists, else the found tree
            const definitiveNode = newTreesCreated[existingTree.uniqueId] || existingTree;
            existingIsByproduct = !!definitiveNode.isByproduct;
        }


        if (existingTree) {
            const existingTreeId = existingTree.uniqueId;
            if (existingIsByproduct && !isInitiallyByproductRoot) {
                // ##### FULL INLINE CONVERSION LOGIC #####
                console.log(`[Thunk/createFn] Prioritizing Normal: Converting existing byproduct root ${existingTreeId} FULLY INLINE for ${itemId}.`);

                // Replace with more aggressive approach
                const defaultRecipe = await getRecipeByOutput(existingTree.id);
                if (!defaultRecipe) {
                    console.error(`[Thunk/createFn] Full Inline Conversion Error: No default recipe for ${existingTree.id}. Returning original node.`);
                    finalRootIds.add(existingTreeId); // Ensure ID is tracked
                    // Return the object from the map if it exists, otherwise the originally found one
                    return newTreesCreated[existingTreeId] || existingTree;
                }

                // Calculate children structure for the converted node
                let newChildren: DependencyNode[] = [];
                try {
                    console.log(`[Thunk/createFn] Full Inline Conversion: Calculating children for ${existingTreeId}`);
                    // Use await: This makes the conversion synchronous within this execution path
                    newChildren = await calculateDependencyTree(
                        existingTree.id, 0, defaultRecipe.id, {}, 1, [],
                        existingTreeId, {}, {}, {} // Minimal context
                    ).then(node => node.children || []);
                    console.log(`[Thunk/createFn] Full Inline Conversion: Calculated ${newChildren.length} children for ${existingTreeId}`);
                } catch (error) {
                     console.error(`[Thunk/createFn] Full Inline Conversion: Error calculating children for ${existingTreeId}`, error);
                }

                // Create the updated node structure using SPREAD
                const updatedNode: DependencyNode = {
                    ...(newTreesCreated[existingTreeId] || existingTree), // Spread the most up-to-date version
                    isByproduct: false, // SET TO NORMAL
                    recipe: defaultRecipe,
                    children: newChildren, // ADD calculated children
                    amount: 0, // Reset amount, it will be recalculated via imports later
                };
                
                // No need for conversionsNeeded map anymore
                newTreesCreated[existingTreeId] = updatedNode; // Store/overwrite with FULLY converted version
                finalRootIds.add(existingTreeId);
                console.log(`[Thunk/createFn] Full Inline conversion complete for ${existingTreeId}. Stored in map. Returning converted node.`);
                return updatedNode; // <<< RETURN FULLY CONVERTED NODE
                // ##### END FULL INLINE CONVERSION #####
            // ADD EXTRA CASE - even if not directly conflicting parameters, convert if requesting a normal node 
            } else if (existingIsByproduct && isInitiallyByproductRoot === undefined && !existingTree.children?.length) {
                // This is a more aggressive conversion approach for any byproduct that doesn't have children
                // when the call doesn't explicitly specify isInitiallyByproductRoot
                
                console.log(`[Thunk/createFn] No Children Aggressive: Converting byproduct without children ${existingTree.uniqueId} for ${itemId}.`);

                try {
                    const defaultRecipe = await getRecipeByOutput(existingTree.id);
                    if (!defaultRecipe) {
                        console.error(`[Thunk/createFn] No default recipe found for ${existingTree.id}. Cannot convert.`);
                        return existingTree;
                    }
                    
                    // Create new node structure
                    const updatedNode = {
                        ...existingTree,
                        isByproduct: false,
                        recipe: defaultRecipe,
                        children: [],
                        amount: existingTree.amount || 0
                    };

                    // Store the updated node in our map
                    newTreesCreated[existingTree.uniqueId] = updatedNode;
                    finalRootIds.add(existingTree.uniqueId);
                    return updatedNode;
                } catch (error) {
                    console.error(`[Thunk/createFn] Error converting byproduct node ${existingTree.uniqueId}:`, error);
                    return existingTree;
                }
            // ADD ANOTHER CASE - If we are explicitly requesting a normal node for an item that was previously a byproduct
            } else if (existingIsByproduct && isInitiallyByproductRoot === false) {
                console.log(`[Thunk/createFn] Explicit Conversion: Byproduct ${existingTree.uniqueId} for ${itemId}`);
                
                // NEW: Check if this is a different depth/context than original creation
                const shouldFullConvert = existingTree.originalDepth !== originalDepth;
                
                try {
                    const defaultRecipe = await getRecipeByOutput(existingTree.id);
                    if (!defaultRecipe) return existingTree;

                    // ENHANCED LOGIC: Only keep children if they match the new depth context
                    const newChildren = shouldFullConvert 
                        ? await calculateDependencyTree(
                            existingTree.id, 0, defaultRecipe.id, {}, 1, [],
                            existingTree.uniqueId, {}, {}, {}
                          ).then(n => n.children || [])
                        : existingTree.children || [];

                    const updatedNode = {
                        ...existingTree,
                        isByproduct: false,
                        recipe: defaultRecipe,
                        children: newChildren,
                        amount: existingTree.amount || 0,
                        // CRUCIAL: Update the original depth to match new context
                        originalDepth: originalDepth 
                    };

                    newTreesCreated[existingTree.uniqueId] = updatedNode;
                    finalRootIds.add(existingTree.uniqueId);
                    console.log(`[Thunk/createFn] Converted ${existingTree.uniqueId} in context depth ${originalDepth}`);
                    return updatedNode;
                } catch (error) {
                    console.error(`Conversion failed for ${existingTree.uniqueId}:`, error);
                    return existingTree;
                }
            } else {
                // Log removed for brevity
                finalRootIds.add(existingTreeId);
                // Return the definitive version from the map if available
                return newTreesCreated[existingTreeId] || existingTree;
            }
        }

        // --- No existing tree found, proceed with creation ---
         if (itemId in pendingCreations) {
             return await pendingCreations[itemId];
         }

        const creationPromise = (async () => {
            // ### EXTRA CHECKS BEFORE CREATION ###
            // If we're creating a normal node (not a byproduct) but the item already exists as a byproduct in another tree,
            // we need to convert that existing byproduct to normal first
            if (!isInitiallyByproductRoot) {
                const existingByproduct = Object.values(initialTreesState)
                    .find(t => t.id === itemId && t.isByproduct) || 
                    Object.values(newTreesCreated)
                    .find(t => t.id === itemId && t.isByproduct);
                
                if (existingByproduct) {
                    console.log(`[Thunk/createFn] PRE-CREATION DETECTION: Normal node requested for ${itemId}, but existing byproduct found: ${existingByproduct.uniqueId}.`);
                    // Get recipe for conversion
                    const defaultRecipe = await getRecipeByOutput(itemId);
                    if (!defaultRecipe) {
                        console.error(`[Thunk/createFn] PRE-CREATION CONVERSION Failed: No default recipe for ${itemId}.`);
                    } else {
                        // Calculate children for converted node
                        let newChildren: DependencyNode[] = [];
                        try {
                            console.log(`[Thunk/createFn] PRE-CREATION CONVERSION: Calculating children for ${existingByproduct.uniqueId}`);
                            newChildren = await calculateDependencyTree(
                                itemId, 0, defaultRecipe.id, {}, 1, [],
                                existingByproduct.uniqueId, {}, {}, {}
                            ).then(node => node.children || []);
                            console.log(`[Thunk/createFn] PRE-CREATION CONVERSION: Calculated ${newChildren.length} children.`);
                        } catch (error) {
                            console.error(`[Thunk/createFn] PRE-CREATION CONVERSION: Error calculating children`, error);
                        }
                        
                        // Create updated node
                        const updatedNode: DependencyNode = {
                            ...existingByproduct,
                            isByproduct: false,
                            recipe: defaultRecipe,
                            children: newChildren,
                            amount: 0, // Will be updated by imports later
                        };
                        
                        console.log(`[Thunk/createFn] PRE-CREATION CONVERSION: Storing converted node for ${updatedNode.uniqueId}.`);
                        // Store in our map and mark for root processing
                        newTreesCreated[existingByproduct.uniqueId] = updatedNode;
                        finalRootIds.add(existingByproduct.uniqueId);
                        
                        // Return immediately, skip actual creation
                        console.log(`[Thunk/createFn] PRE-CREATION CONVERSION: Complete. Returning converted node.`);
                        return updatedNode;
                    }
                }
            }
            // ### END EXTRA CHECKS ###
            
            const newTree = await createNewTreeStructure(
              itemId, amount, treeIdOverride, recipeIdOverride, isAutoImportRoot, originalDepth, isInitiallyByproductRoot
            );

            if (newTree) {
              const mutableNewTree = JSON.parse(JSON.stringify(newTree));
              // This recursive call might now find the node created/converted above
              const processedNewTree = await convertToImportTree(
                  mutableNewTree, 
                  initialTreesState, 
                  createAndConvertTreeFn, 
                  pendingCreations, 
                  deferredByproducts // Pass the map here
              );

              // Simple storage: If it wasn't converted inline, store it.
              // The inline conversion above handles the overwrite correctly now.
              // REMOVED SAFEGUARD BLOCK AS INLINE CONVERSION SHOULD HANDLE IT
              newTreesCreated[processedNewTree.uniqueId] = processedNewTree; 

              processedItemIds.add(itemId);
              finalRootIds.add(processedNewTree.uniqueId);
              // Return definitive version
              return newTreesCreated[processedNewTree.uniqueId] || processedNewTree;
            } else {
              console.error(`[Thunk/createFn] createNewTreeStructure failed for ${itemId}`);
              return null;
            }
        })();

        pendingCreations[itemId] = creationPromise;
        return await creationPromise;
      }; // End of createAndConvertTreeFn

      // --- Run Conversion on Main Tree ---
      console.log(`[Thunk] Starting conversion process for main tree: ${mutableMainTree.uniqueId}`);
      // Pass the thunk's pendingCreations map AND deferredByproducts map
      const finalMainTree = await convertToImportTree(
          mutableMainTree, 
          initialTreesState, // Pass initial state for lookups
          createAndConvertTreeFn, 
          pendingCreations, 
          deferredByproducts // Pass the map here
      );
      console.log(`[Thunk] Finished conversion process for main tree: ${finalMainTree.uniqueId}`);
      
      // Update main tree entry in created map (it might have been modified by conversion)
      newTreesCreated[finalMainTree.uniqueId] = finalMainTree; 

      // --- Process Deferred Byproducts --- 
      console.log(`[Thunk] Processing ${deferredByproducts.size} deferred byproduct items...`);
      for (const [itemId, deferredList] of deferredByproducts.entries()) {
          console.log(`[Thunk] Processing deferred byproduct: ${itemId}`);
          // Check if a NORMAL root already exists for this item
          const existingNormalRootId = Object.keys(newTreesCreated).find(id => 
              newTreesCreated[id].id === itemId && 
              !newTreesCreated[id].isByproduct && 
              !newTreesCreated[id].isImport && 
              !newTreesCreated[id].importReference
          );

          let targetTreeId: string | null = existingNormalRootId || null;
          let targetNodeId: string | null = existingNormalRootId || null;

          if (existingNormalRootId) {
              console.log(`[Thunk] Deferred ${itemId}: Found existing NORMAL root ${existingNormalRootId}. Linking deferred nodes to it.`);
          } else {
              console.log(`[Thunk] Deferred ${itemId}: No existing normal root found. Creating BYPRODUCT root.`);
              // No normal root exists, create a new BYPRODUCT root
              try {
                  // Check if a byproduct root was already created in this loop
                  const existingByproductRootId = Object.keys(newTreesCreated).find(id => 
                      newTreesCreated[id].id === itemId && newTreesCreated[id].isByproduct
                  );
                  if (existingByproductRootId) {
                      console.log(`[Thunk] Deferred ${itemId}: Reusing already created BYPRODUCT root ${existingByproductRootId}.`);
                      targetTreeId = existingByproductRootId;
                      targetNodeId = existingByproductRootId;
                  } else {
                      // Get the highest original depth from all deferred instances for this item
                      const maxOriginalDepth = deferredList.reduce((max, item) => Math.max(max, item.originalDepth), 0);
                      // Revert to explicitly passing undefined for optional args
                      const newByproductRoot = await createNewTreeStructure(
                          itemId, 
                          0,
                          undefined, // treeId
                          undefined, // recipeId
                          true, // isAutoImportRoot 
                          maxOriginalDepth, // originalDepth
                          true // isInitiallyByproductRoot
                      );
                      if (newByproductRoot) {
                          console.log(`[Thunk] Deferred ${itemId}: Created new BYPRODUCT root ${newByproductRoot.uniqueId}.`);
                          newTreesCreated[newByproductRoot.uniqueId] = newByproductRoot; // Add to our map
                          finalRootIds.add(newByproductRoot.uniqueId); // Track as a root
                          targetTreeId = newByproductRoot.uniqueId;
                          targetNodeId = newByproductRoot.uniqueId;
                      } else {
                          console.error(`[Thunk] Deferred ${itemId}: Failed to create BYPRODUCT root via createTreeFn.`);
                          continue; // Skip linking for this item if root creation failed
                      }
                  }
              } catch (error) {
                  console.error(`[Thunk] Deferred ${itemId}: Error creating BYPRODUCT root:`, error);
                  continue; // Skip linking
              }
          }

          // Link all deferred source nodes for this item to the target tree
          if (targetTreeId && targetNodeId) {
              console.log(`[Thunk] Deferred ${itemId}: Linking ${deferredList.length} source node(s) to target ${targetTreeId}.`);
              for (const deferredInfo of deferredList) {
                  // IMPORTANT: Find the *original* node within the partially built trees 
                  // where the byproduct occurred and update IT with the import reference.
                  // We need a way to find and modify the node within the main tree structure. 
                  // Let's try finding it in the finalMainTree or other newTreesCreated.
                  const findAndLink = (nodeToSearch: DependencyNode): boolean => {
                      if (nodeToSearch.uniqueId === deferredInfo.sourceNode.uniqueId) {
                          // Fix Linter Error: Remove unused variable
                          // const updatedSourceNode = setImportReference(nodeToSearch, targetTreeId!, targetNodeId!); 
                          // ... placeholder comments ...
                          // --- Alternative: Modify newTreesCreated directly if possible --- 
                          // We can't easily modify nested structures immutably here. 
                          // Let's try modifying the source node reference directly IN PLACE.
                          // THIS IS MUTABLE and relies on object references.
                          Object.assign(nodeToSearch, setImportReference(deferredInfo.sourceNode, targetTreeId!, targetNodeId!));
                          console.log(`[Thunk] Deferred ${itemId}: Linked source ${nodeToSearch.uniqueId} to target ${targetTreeId} IN PLACE.`);
                          return true;
                      }
                      if (nodeToSearch.children) {
                          for (const child of nodeToSearch.children) {
                              if (findAndLink(child)) return true;
                          }
                      }
                      return false;
                  };
                  
                  // Search within the main tree first
                  let foundAndLinked = findAndLink(finalMainTree);
                  // If not found in main tree, search other created trees (less likely but possible)
                  if (!foundAndLinked) {
                      for (const rootId in newTreesCreated) {
                          if (rootId !== finalMainTree.uniqueId && findAndLink(newTreesCreated[rootId])) {
                              foundAndLinked = true;
                              break;
                          }
                      }
                  }
                  if (!foundAndLinked) {
                      console.warn(`[Thunk] Deferred ${itemId}: Could not find original source node ${deferredInfo.sourceNode.uniqueId} in final trees to link.`);
                  }
              }
          } else {
              console.warn(`[Thunk] Deferred ${itemId}: No target tree ID resolved. Skipping linking.`);
          }
      }
      // --- End Deferred Byproduct Processing ---

      // --- Dispatch All Changes ---
      console.log('[Thunk] Dispatching all pending state changes...');
      
      const finalTreesToDispatch = newTreesCreated; 
      
      for (const treeId in finalTreesToDispatch) {
          const tree = finalTreesToDispatch[treeId];
          if (!tree) continue;

          console.log(`[Thunk] PRE-DISPATCH CHECK for ${treeId}: isByproduct=${tree.isByproduct}, recipeId=${tree.recipe?.id}, childrenCount=${tree.children?.length}`);
          const accumulated = calculateAccumulatedFromTree(tree);
          console.log(`[Thunk] Dispatching setDependencies for ${tree.isByproduct ? 'BYPRODUCT' : 'NORMAL'} tree: ${treeId} (Amount: ${tree.amount})`);
          dispatch(setDependencies({ treeId, tree, accumulated }));
      }
      
      // --- Trigger Post-Creation Byproduct Checks --- 
      const finalState = getState(); 
      const treesToCheck = finalState.dependencies.dependencyTrees;
      const postConversionChecks: string[] = [];
      Object.values(treesToCheck).forEach(node => {
        // Check if conversion was needed but might have failed or amount became positive later
        if (node.isRoot && node.isByproduct && node.amount > 0) { 
          console.log(`[Thunk] Post-Check: Identified BYPRODUCT root ${node.uniqueId} with positive amount (${node.amount}). Queuing check.`);
          postConversionChecks.push(node.uniqueId);
        } else if (node.isRoot && !node.isByproduct && node.amount < 0) {
           console.log(`[Thunk] Post-Check: Identified NORMAL root ${node.uniqueId} with negative amount (${node.amount}). Queuing check.`);
           postConversionChecks.push(node.uniqueId);
        }
      });
      for (const idToConvert of postConversionChecks) {
        console.log(`[Thunk] Dispatching post-creation conversion check for ${idToConvert}`);
        await dispatch(checkAndConvertNodeTypeThunk(idToConvert));
      }
      // --------------------------------------------
      
      console.log(`[Thunk] calculateAndAutoImportThunk finished. Returning mainTreeId: ${mainTreeId}, newRootIds: ${Array.from(finalRootIds)}`);
      return { mainTreeId, newRootIds: Array.from(finalRootIds) };

    } catch (error) {
      console.error("[Thunk] Error during calculateAndAutoImportThunk:", error);
      return { mainTreeId, newRootIds: Array.from(finalRootIds) }; // Return IDs found so far
    }
  }
);

// --- Thunk for Destroying a Node and its Dependencies ---
export const destroyNodeRecursiveThunk = createAsyncThunk<
  void,
  string, // Argument: nodeIdToDestroy
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/destroyNodeRecursive',
  async (nodeIdToDestroy, { getState, dispatch }) => {
    console.log(`[Thunk/Destroy] Request to destroy node: ${nodeIdToDestroy}`);
    const state = getState();
    const nodeToDestroy = state.dependencies.dependencyTrees[nodeIdToDestroy];

    if (!nodeToDestroy) {
      console.log(`[Thunk/Destroy] Node ${nodeIdToDestroy} not found (already destroyed?). Skipping.`);
      return;
    }

    // Store children *before* removing the node
    const childrenToCleanup = [...(nodeToDestroy.children || [])];

    // Dispatch synchronous action to remove the node from state
    console.log(`[Thunk/Destroy] Dispatching removeNodeAction for ${nodeIdToDestroy}.`);
    dispatch(removeNodeAction(nodeIdToDestroy));
    // TODO: Consider cleaning up accumulatedDependencies entry as well?

    // Trigger dependency checks for its former children
    console.log(`[Thunk/Destroy] Triggering dependency checks for ${childrenToCleanup.length} former children.`);
    for (const childNode of childrenToCleanup) {
      // Ensure childNode has a valid uniqueId before dispatching check
      if (childNode && childNode.uniqueId) {
         await dispatch(requestDependencyCheckThunk({ nodeIdToCheck: childNode.uniqueId, disconnectedConsumerId: nodeIdToDestroy }));
      } else {
         console.warn(`[Thunk/Destroy] Invalid child node structure found while cleaning up ${nodeIdToDestroy}. Skipping check.`);
      }
    }
    console.log(`[Thunk/Destroy] Finished destroying node: ${nodeIdToDestroy}`);
  }
);

// --- Thunk for Checking Dependency Need After Disconnect ---
interface RequestDependencyCheckArgs {
    nodeIdToCheck: string;
    disconnectedConsumerId: string;
}
export const requestDependencyCheckThunk = createAsyncThunk<
  void,
  RequestDependencyCheckArgs,
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/requestDependencyCheck',
  async ({ nodeIdToCheck, disconnectedConsumerId }, { getState, dispatch }) => {
    console.log(`[Thunk/Check] Request to check necessity of node ${nodeIdToCheck} (disconnected: ${disconnectedConsumerId})`);
    const state = getState();
    const nodeToCheck = state.dependencies.dependencyTrees[nodeIdToCheck];

    if (!nodeToCheck || !nodeToCheck.isRoot) { // Only check root nodes
      console.log(`[Thunk/Check] Node ${nodeIdToCheck} not found or not a root. Skipping check.`);
      return;
    }

    let isStillNeeded = false;

    // 1. Check for manual excess
    if ((nodeToCheck.excess || 0) > 0) {
      console.log(`[Thunk/Check] Node ${nodeIdToCheck} has excess > 0. Still needed.`);
      isStillNeeded = true;
    }

    // 2. Check for other importers
    if (!isStillNeeded) {
      console.log(`[Thunk/Check] Node ${nodeIdToCheck}: Checking for other importers...`);
      for (const tree of Object.values(state.dependencies.dependencyTrees)) {
         // Avoid checking the node against itself or trees being deleted?
         // If tree.uniqueId === nodeIdToCheck? Might be relevant if check gets complex.
        const findImporter = (node: DependencyNode): boolean => {
          if (node.uniqueId === disconnectedConsumerId) return false; // Skip the one that just disconnected

          const importRef = getImportReference(node);
          if (importRef?.targetTreeId === nodeIdToCheck) {
             console.log(`[Thunk/Check] Node ${nodeIdToCheck} is still imported by ${node.uniqueId} in tree ${tree.uniqueId}. Still needed.`);
            return true; // Found another importer
          }
          if (node.children) {
            for (const child of node.children) {
              if (findImporter(child)) return true;
            }
          }
          return false;
        };
        if (findImporter(tree)) {
          isStillNeeded = true;
          break; // Stop searching once one importer is found
        }
      }
    }

    if (isStillNeeded) {
      console.log(`[Thunk/Check] Node ${nodeIdToCheck} is still needed. Recalculating amount...`);
      // Node is still needed, recalculate its required amount
      let newRequiredAmount = 0;
      // Add manual excess first
      newRequiredAmount += nodeToCheck.excess || 0;
      // Find all current importers and sum their demands
       for (const tree of Object.values(state.dependencies.dependencyTrees)) {
            const findDemand = (node: DependencyNode): number => {
                let demand = 0;
                const importRef = getImportReference(node);
                if (importRef?.targetTreeId === nodeIdToCheck) {
                    demand += node.amount || 0;
                }
                if (node.children) {
                    for (const child of node.children) {
                        demand += findDemand(child);
                    }
                }
                return demand;
            };
            newRequiredAmount += findDemand(tree);
       }

      console.log(`[Thunk/Check] Node ${nodeIdToCheck}: New required amount: ${newRequiredAmount}. Current amount: ${nodeToCheck.amount}`);
      if (nodeToCheck.amount !== newRequiredAmount) {
          console.log(`[Thunk/Check] Node ${nodeIdToCheck}: Amount changed. Dispatching update and re-checking type.`);
          dispatch(updateNodeProperties({ nodeId: nodeIdToCheck, updatedNode: { amount: newRequiredAmount } }));
          // Re-check node type as amount change might trigger conversion
          await dispatch(checkAndConvertNodeTypeThunk(nodeIdToCheck));
      } else {
           console.log(`[Thunk/Check] Node ${nodeIdToCheck}: Amount unchanged. No update needed.`);
      }

    } else {
      console.log(`[Thunk/Check] Node ${nodeIdToCheck} is no longer needed. Triggering destruction.`);
      // Node is not needed anymore, destroy it
      await dispatch(destroyNodeRecursiveThunk(nodeIdToCheck));
    }
     console.log(`[Thunk/Check] Finished check for node ${nodeIdToCheck}.`);
  }
);

// --- Thunk for Checking and Converting Node Type --- 
export const checkAndConvertNodeTypeThunk = createAsyncThunk<
  void, 
  string, // Argument: targetTreeId
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/checkAndConvertNodeType', // Renamed action type
  async (targetTreeId, { getState, dispatch }) => {
    // console.log(`[Thunk] checkAndConvertNodeTypeThunk called for ${targetTreeId}`);
    const state = getState();
    const targetNode = state.dependencies.dependencyTrees[targetTreeId];

    if (!targetNode || !targetNode.isRoot) {
      // console.log(`[Thunk] Node ${targetTreeId} not found or not a root node.`);
      return; // Only operate on existing root nodes
    }

    // --- Scenario 1: Convert Byproduct to Normal --- 
    if (targetNode.isByproduct && targetNode.amount > 0) { 
      console.log(`[Thunk/Convert] Converting BYPRODUCT root ${targetTreeId} (amount: ${targetNode.amount}) to NORMAL.`);
      const defaultRecipe = await getRecipeByOutput(targetNode.id);
      if (!defaultRecipe) {
        console.error(`[Thunk/Convert] No default recipe found for item ${targetNode.id}. Cannot convert byproduct.`);
        return; 
      }
      
      try {
        const recipeSelections = state.recipeSelections.selections;
        const newChildren = await calculateDependencyTree(
          targetNode.id, targetNode.amount, defaultRecipe.id, recipeSelections, 1, [], 
          targetNode.uniqueId, {}, {}, state.dependencies.dependencyTrees
        ).then(node => node.children || []);
        
        const updatedNodeData: Partial<DependencyNode> = {
          isByproduct: false,
          recipe: defaultRecipe,
          children: newChildren,
        };
        dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: updatedNodeData }));
        console.log(`[Thunk/Convert] Dispatched updateNodeProperties for ${targetTreeId} (Byproduct -> Normal)`);

        // If children were added, they might need their own amounts calculated/imports set up
        // This might require recalculating the whole tree or triggering updates on children.
        // For now, we rely on the subsequent accumulation updates.

      } catch(error) {
        console.error(`[Thunk/Convert] Error recalculating children for ${targetTreeId}:`, error);
      }
    } 
    // --- Scenario 2: Convert Normal to Byproduct --- 
    else if (!targetNode.isByproduct && targetNode.amount < 0) {
      console.log(`[Thunk/Convert] Converting NORMAL root ${targetTreeId} (amount: ${targetNode.amount}) to BYPRODUCT.`);

      // Store original children *before* clearing them
      const originalChildren = [...(targetNode.children || [])];

      const updatedNodeData: Partial<DependencyNode> = {
        isByproduct: true,
        recipe: undefined,
        children: [], // Clear children for byproduct
      };
      dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: updatedNodeData }));
      console.log(`[Thunk/Convert] Dispatched updateNodeProperties for ${targetTreeId} (Normal -> Byproduct)`);

      // Trigger dependency checks for former children
      console.log(`[Thunk/Convert] Triggering dependency checks for ${originalChildren.length} former children.`);
      for (const childNode of originalChildren) {
          // Check if the child exists before dispatching (it might have been removed concurrently)
          // Ensure childNode and uniqueId are valid before accessing/dispatching
          if (childNode && childNode.uniqueId) {
             // --- FIX: Check the target ROOT node, not the import node itself --- 
             let nodeIdToActuallyCheck = childNode.uniqueId;
             const importRef = getImportReference(childNode);
             if (importRef?.targetTreeId) {
                 nodeIdToActuallyCheck = importRef.targetTreeId;
                 console.log(`[Thunk/Convert] Child ${childNode.uniqueId} is an import. Checking target root ${nodeIdToActuallyCheck} instead.`);
             }
             // -------------------------------------------------------------------

             // Check if the node to check *still exists* in the state before dispatching
             const nodeState = getState().dependencies.dependencyTrees[nodeIdToActuallyCheck];
             if (nodeState) {
                  await dispatch(requestDependencyCheckThunk({ nodeIdToCheck: nodeIdToActuallyCheck, disconnectedConsumerId: targetTreeId }));
             } else {
                  console.log(`[Thunk/Convert] Node to check (${nodeIdToActuallyCheck}) already removed. Skipping check.`);
             }
          } else {
             console.warn(`[Thunk/Convert] Invalid child node structure found while cleaning up ${targetTreeId}. Skipping check.`);
          }
      }
    } 
    // --- Scenario 3: No Conversion Needed --- 
    else {
      // console.log(`[Thunk] Node ${targetTreeId} type does not need conversion (isByproduct: ${targetNode.isByproduct}, amount: ${targetNode.amount}).`);
    }
  }
);

// --- Helper Function: replaceNode (defined locally) ---
// Recursively searches for a node by ID and replaces it immutably
const replaceNode = (
  tree: DependencyNode,
  nodeId: string,
  newNode: DependencyNode
): DependencyNode => {
  if (tree.uniqueId === nodeId) {
    return newNode; // Replace the node itself
  }

  if (!tree.children || tree.children.length === 0) {
    return tree; // Node not found in this branch
  }

  // Create a new children array with the potentially replaced child
  const newChildren = tree.children.map(child => 
    replaceNode(child, nodeId, newNode) // Recursively call on children
  );

  // If the children array reference changed, it means a replacement happened deeper
  // Return a new tree node with the updated children
  if (newChildren !== tree.children) {
    return { ...tree, children: newChildren };
  }

  // Otherwise, return the original tree node (no changes in this branch)
  return tree;
};

// --- Reducer logic for handling import/unimport --- 
export const handleNodeImportReducer = (
  state: WritableDraft<ImportExportDependencyState>,
  action: PayloadAction<{
    nodeId: string;
    targetTreeId: string;
    sourceTreeId: string;
    shouldImport: boolean;
  }>
) => {
  const { nodeId, targetTreeId, sourceTreeId, shouldImport } = action.payload;
  const sourceTree = state.dependencyTrees[sourceTreeId];
  if (!sourceTree) return;

  const nodeToToggle = findNodeById(sourceTree, nodeId);
  if (!nodeToToggle) return;

  let targetTreeForUpdate: WritableDraft<DependencyNode> | undefined;

  if (shouldImport === false) {
    // --- Unimport logic --- 
    console.log(`[UNIMPORT DEBUG] Toggling import off for node: ${nodeId}`);
    const clearedNode = clearImportReference(nodeToToggle);
    if (nodeToToggle.excess !== undefined && nodeToToggle.excess > 0) {
      clearedNode.excess = nodeToToggle.excess;
    }
    // Use local replaceNode (immutable version needed here as we replace the whole tree)
    const updatedSourceTree = replaceNode(sourceTree, nodeId, clearedNode);
    state.dependencyTrees[sourceTreeId] = updatedSourceTree;

    // Reduce amount in target tree
    if (targetTreeId && state.dependencyTrees[targetTreeId]) {
      console.log(`[UNIMPORT DEBUG] Reducing target tree amount by: ${nodeToToggle.amount}`);
      let totalRequiredAmount = 0;
      Object.values(state.dependencyTrees).forEach((tree: WritableDraft<DependencyNode>) => {
        if (tree.uniqueId === sourceTreeId) return; // Skip updated source tree
        const findImportsToTarget = (node: DependencyNode): number => {
          let amount = 0;
          if ((node.importReference && node.importReference.targetTreeId === targetTreeId) || (node.isImport && node.importedFrom === targetTreeId)) {
            amount += node.amount || 0;
          }
          if (node.children && node.children.length > 0) {
            for (const child of node.children) {
              amount += findImportsToTarget(child);
            }
          }
          return amount;
        };
        totalRequiredAmount += findImportsToTarget(tree);
      });
      
      targetTreeForUpdate = state.dependencyTrees[targetTreeId];
      if (targetTreeForUpdate) {
        if (totalRequiredAmount <= 0) {
          console.log(`[UNIMPORT DEBUG] No imports left, setting target tree amount to 0`);
          targetTreeForUpdate.amount = 0;
        } else {
          console.log(`[UNIMPORT DEBUG] Target tree amount updated to: ${totalRequiredAmount}`);
          targetTreeForUpdate.amount = totalRequiredAmount;
        }
        // TODO: Trigger checkAndConvertNodeTypeThunk(targetTreeId) externally
      }
    }
    // --- End Unimport Logic --- 
  } else {
    // --- Import logic --- 
    console.log('Converting to import node');
    targetTreeForUpdate = state.dependencyTrees[targetTreeId];
    if (!targetTreeForUpdate) {
      console.log(`[IMPORT DEBUG] Creating new target tree: ${targetTreeId}`);
      targetTreeForUpdate = {
        id: nodeToToggle.id,
        amount: 0, // Start new trees at 0 amount
        uniqueId: targetTreeId,
        isRoot: true,
        children: []
      };
      state.dependencyTrees[targetTreeId] = targetTreeForUpdate;
    } else {
      console.log('Adding to existing root:', targetTreeForUpdate);
    }
    
    const importedNode = setImportReference(
      nodeToToggle, 
      { targetTreeId, targetNodeId: targetTreeForUpdate.uniqueId || targetTreeId }
    );
    // Use local replaceNode (immutable version needed here)
    const updatedSourceTree = replaceNode(sourceTree, nodeId, importedNode);
    state.dependencyTrees[sourceTreeId] = updatedSourceTree;
    
    // Calculate total required amount for the target tree
    let totalRequiredAmount = 0;
    console.log(`[IMPORT AGGREGATION DEBUG] Calculating total required amount for target tree ${targetTreeId}`);
    Object.values(state.dependencyTrees).forEach((tree: WritableDraft<DependencyNode>) => {
      const findImportsToTarget = (node: DependencyNode): number => {
        let amount = 0;
        if ((node.importReference && node.importReference.targetTreeId === targetTreeId) || (node.isImport && node.importedFrom === targetTreeId)) {
          amount += node.amount || 0;
        }
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            amount += findImportsToTarget(child);
          }
        }
        return amount;
      };
      totalRequiredAmount += findImportsToTarget(tree);
    });
    console.log(`[IMPORT AGGREGATION] Final aggregated amount for ${targetTreeId}: ${totalRequiredAmount}`);
    
    // --- Apply Amount Update --- 
    if (targetTreeForUpdate) {
      targetTreeForUpdate.amount = totalRequiredAmount;
      console.log(`[Reducer] Updated target tree ${targetTreeId} amount to: ${totalRequiredAmount}`);
      // TODO: Trigger checkAndConvertNodeTypeThunk(targetTreeId) externally AFTER this reducer completes
    } else {
      console.error(`[Reducer] Target tree ${targetTreeId} could not be found or created during amount update.`);
    }
    // -------------------------
  }
  
  // Update accumulated dependencies (common to both import/unimport)
  const allAccumulated: Record<string, AccumulatedNode> = {};
  Object.values(state.dependencyTrees).forEach((tree: WritableDraft<DependencyNode>) => {
    const treeAccumulated = calculateAccumulatedFromTree(tree);
    Object.assign(allAccumulated, treeAccumulated);
  });
  state.accumulatedDependencies = allAccumulated;
};

// Reducer logic for handling legacy unimport action
export const handleNodeUnimportReducer = (
  state: WritableDraft<ImportExportDependencyState>,
  action: PayloadAction<{
    nodeId: string;
    targetTreeId: string;
    sourceTreeId: string;
  }>
) => {
  // Call the main import handler with shouldImport=false
  handleNodeImportReducer(state, {
    type: importNodeAction.type,
    payload: {
      ...action.payload,
      shouldImport: false
    }
  });
}; 