/* eslint-disable @typescript-eslint/no-unused-vars */
import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer'; // Needed for Immer types in reducers
import { DependencyNode, Recipe } from '../../../types';
import { 
  clearImportReference, 
  setImportReference,
  getImportReference
} from '../../../utils/nodeReferenceUtils';
import { findNodeById } from '../../../utils/treeUtils';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '../../../store';
import { 
  getRecipeByOutput, 
  getRecipesForItem
} from "../../../data/dbQueries";
import { calculateDependencyTree } from "../../../utils/calculateDependencyTree";
import { updateNodeProperties, setDependencies, setExternalImports, importNodeAction, removeNodeAction } from './dependencySlice';
import { calculateAccumulatedFromTree } from '../../../utils/calculateAccumulatedFromTree';
import { 
  AccumulatedNode 
} from "../../../utils/calculateAccumulatedFromTree";
import { findNodeConsumers, ConsumerInfo } from '../../../utils/consumptionUtils';
import { logger } from '../../../utils/logger';
import { 
  calculateChildProductionNeeds, 
  updateForcedProduction,
  AffectedNodeUpdate 
} from './productionUpdateLogic';

// Store the last known recipes for nodes that were converted to byproduct
// This will be used to restore the recipe when converting back to normal
// Use undefined instead of null for consistency with DependencyNode type
const nodeRecipeCache: Record<string, Recipe | undefined> = {};

// --- Define the expected Slice State Shape locally --- 
interface ImportExportDependencyState {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedDependencies: Record<string, AccumulatedNode>;
  errors: string[]; // Keep consistent with original type
}

// Helper function to find and replace a node in a tree by its uniqueId (mutable - use with Immer)
export const findAndReplaceNode = (tree: WritableDraft<DependencyNode>, nodeId: string, replacement: WritableDraft<DependencyNode>): boolean => {
  if (tree.uniqueId === nodeId) {
    logger.error("Cannot replace the root node using findAndReplaceNode");
    return false;
  }
  if (tree.children) {
    for (let i = 0; i < tree.children.length; i++) {
      if (tree.children[i].uniqueId === nodeId) {
        logger.info(`Replacing node ${nodeId} in tree ${tree.uniqueId}`);
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
  generateTreeId: (itemId: string) => string; // Pass the ID generator function
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
      generateTreeId,
    } = args;

    // Generate the tree ID upfront so it can be used for both the tree and children IDs
    const mainTreeId: string = generateTreeId(selectedItem);

    try {
      const state = getState();
      const existingTrees = state.dependencies.dependencyTrees;

      // 1. Calculate the basic structure for the new item
      const calculatedNewTree = await calculateDependencyTree(
        selectedItem, 
        0, // Start with 0 amount, let excess/imports drive it later?
           // Or should we pass an initial amount? Let's start with 0.
        selectedRecipeId, 
        {}, // Empty recipe map for initial calculation
        0, // depth
        [], // affected branches
        mainTreeId, // parentId - use tree ID to ensure children have proper unique IDs
        {}, // excess map
        {}, // import map
        existingTrees // Pass existing trees for context during calculation (e.g., nested imports)
      );

      if (!calculatedNewTree) {
        throw new Error("Initial tree calculation failed");
      }

      // Assign the tree ID and essential root properties
      calculatedNewTree.uniqueId = mainTreeId;
      calculatedNewTree.isRoot = true;
      calculatedNewTree.depth = 0;
      // Ensure recipe is attached if calculateDependencyTree found it
      if (!calculatedNewTree.recipe) {
      const rootRecipe = await getRecipeByOutput(selectedRecipeId);
          calculatedNewTree.recipe = rootRecipe;
      } // Might need availableRecipes too?

      // 

      // 2. Dispatch setDependencies for the new tree
      //    (Accumulated state is now handled within the reducer)
      // 
      await dispatch(setDependencies({ treeId: mainTreeId, tree: calculatedNewTree }));
      // 
      
      // Verify state immediately after setDependencies
      const stateAfterSetDep = getState();
      const addedTreeFromState = stateAfterSetDep.dependencies.dependencyTrees[mainTreeId];
      if (addedTreeFromState) {
          // 
            } else {
          // logger.error(`[Thunk/Calc&Import V2] CRITICAL: Tree ${mainTreeId} NOT FOUND in state immediately after setDependencies!`);
          // Still log critical errors
           logger.error(`[Thunk/Calc&Import V2] CRITICAL: Tree ${mainTreeId} NOT FOUND in state immediately after setDependencies!`);
      }

      // 3. Trigger Auto-Import for the children of the newly added tree
      // 
      try {
        await dispatch(autoImportNodeChildrenThunk(mainTreeId));
        // 
      } catch (err) {
        // Still log errors during dispatch
        logger.error(`[Thunk/Calc&Import V2] !!!!! Error during dispatch/execution of autoImportNodeChildrenThunk for ${mainTreeId}:`, err);
      }

      // 4. (Optional but Recommended) Recalculate amount for the main tree itself
      //    If it has excess applied via UI before full calculation
      // 
      await dispatch(recalculateAndUpdateRootAmountThunk({ rootNodeId: mainTreeId, externalDemandChange: undefined }));

      // --- Cleanup: Remove complex internal state management --- 
      // const initialTreesState = { ...getState().dependencies.dependencyTrees };
      // const newTreesCreated: Record<string, DependencyNode> = {};
      // const processedItemIds = new Set<string>(...);
      // const pendingCreations: Record<string, ...> = {};
      // const deferredByproducts = new Map<...>();
      // const createAndConvertTreeFn = ... // Removed complex recursive creation
      // const finalMainTree = await convertToImportTree(...) // Removed complex conversion
      // Loop dispatching finalTreesToDispatch = newTreesCreated // Removed
      // Post-creation checks might be handled within recalculateAmountThunk now

      // 
      // The actual list of root IDs will now be whatever is in the state
      const finalState = getState();
      const finalRootIds = Object.keys(finalState.dependencies.dependencyTrees);
      

      return { mainTreeId, newRootIds: finalRootIds };

              } catch (error) {
      // Still log top-level errors
      logger.error("[Thunk/Calc&Import V2] Error during simplified calculateAndAutoImportThunk:", error);
      // Return minimal info on error
      const finalState = getState(); 
      const finalRootIds = Object.keys(finalState.dependencies.dependencyTrees);
      return { mainTreeId, newRootIds: finalRootIds }; 
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
    const stateBeforeDelete = getState();
    const allTrees = stateBeforeDelete.dependencies.dependencyTrees;
    const nodeToDestroy = allTrees[nodeIdToDestroy];

    if (!nodeToDestroy) {
      // logger.info(`[Thunk/Destroy V2] Node ${nodeIdToDestroy} not found. Skipping.`);
      return;
    }

    // logger.info(`[Thunk/Destroy V2] Starting destruction for ${nodeIdToDestroy}`);
    // 1. Find nodes importing from this node BEFORE deleting it
    // logger.info(`[Thunk/Destroy V2] Finding nodes importing from ${nodeIdToDestroy}...`);
    const nodesToUnimport = await findNodeConsumers(nodeIdToDestroy, allTrees); 
    // logger.info(`[Thunk/Destroy V2] Found ${nodesToUnimport.length} nodes to unimport.`);

    // 2. Store original children BEFORE deleting
    const originalChildren = [...(nodeToDestroy.children || [])];
    // logger.info(`[Thunk/Destroy V2] Stored ${originalChildren.length} original children.`);

    // 3. Trigger UNIMPORT for nodes that were importing *FROM* the node being deleted
    //    Do this BEFORE deleting the node so the unimport logic can access its recipe.
    // logger.info(`[Thunk/Destroy V2] Dispatching unimport for ${nodesToUnimport.length} consumers...`);
    const unimportPromises = nodesToUnimport.map(consumerInfo => 
        dispatch(unimportNodeThunk(consumerInfo.consumerNodeId))
    );
    // Wait for unimports to finish their state updates BEFORE removing the node.
    // This keeps all cascading updates inside the caller's history transaction so
    // they are grouped into a single undo checkpoint instead of leaking as
    // separate entries after the transaction commits.
    await Promise.all(unimportPromises);

    // 4. Dispatch synchronous action to remove the node from state
    // logger.info(`[Thunk/Destroy V2] Dispatching removeNodeAction for ${nodeIdToDestroy}.`);
    dispatch(removeNodeAction(nodeIdToDestroy));

    // 5. Trigger dependency checks for the ORIGINAL children of the now-deleted node
    // logger.info(`[Thunk/Destroy V2] Triggering dependency checks for ${originalChildren.length} original children...`);
    for (const childNode of originalChildren) {
      if (childNode && childNode.uniqueId) {
          // Determine the actual root node to check (could be the child itself or its import target)
          let nodeIdToActuallyCheck = childNode.uniqueId;
          const importRef = getImportReference(childNode); // Check if the child was an import
          if (importRef?.targetTreeId) { 
              nodeIdToActuallyCheck = importRef.targetTreeId;
              // logger.info(`[Thunk/Destroy V2] Original child ${childNode.uniqueId} is an import. Checking its target root ${nodeIdToActuallyCheck}.`);
          }
          
          // Check if the target root still exists in the *current* state (after deletion)
          const targetNodeState = getState().dependencies.dependencyTrees[nodeIdToActuallyCheck];
          if (targetNodeState && targetNodeState.isRoot) {
              // logger.info(`[Thunk/Destroy V2] Dispatching requestDependencyCheckThunk for original child's target: ${nodeIdToActuallyCheck}`);
              // Use await here as these checks might trigger further destructions/unimports
              await dispatch(requestDependencyCheckThunk({ nodeIdToCheck: nodeIdToActuallyCheck, disconnectedConsumerId: nodeIdToDestroy }));
      } else {
              // logger.info(`[Thunk/Destroy V2] Target ${nodeIdToActuallyCheck} for original child ${childNode.uniqueId} no longer exists or isn't a root. Skipping check.`);
      }
      } else {
         // Still log warnings for unexpected data
         logger.warn(`[Thunk/Destroy V2] Invalid original child node structure found while cleaning up ${nodeIdToDestroy}. Skipping check.`);
    }
    }
    
    // logger.info(`[Thunk/Destroy V2] Finished destroying node: ${nodeIdToDestroy}`);
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
  // Prefix unused parameter with underscore
  async ({ nodeIdToCheck, disconnectedConsumerId: _disconnectedConsumerId }, { getState, dispatch }) => { 
    const state = getState();
    const nodeToCheck = state.dependencies.dependencyTrees[nodeIdToCheck];

    if (!nodeToCheck || !nodeToCheck.isRoot) { // Only check root nodes
      return;
    }

    let isStillNeeded = false;

    // 1. Check for manual excess
    if ((nodeToCheck.excess || 0) > 0) {
      isStillNeeded = true;
    }

    // 2. Check for other importers
    if (!isStillNeeded) {
      for (const tree of Object.values(state.dependencies.dependencyTrees)) {
        const findImporter = (node: DependencyNode): boolean => {
           // Skip the consumer that just disconnected this specific node instance
           // if (node.uniqueId === disconnectedConsumerId) return false; 
           // NOTE: This simple check might be insufficient if multiple nodes consume the same root

          const importRef = getImportReference(node);
          if (importRef?.targetTreeId === nodeIdToCheck) {
              // Check if this importer is the one that triggered the check
              // This check might be too simple - consider if the tree ID matters?
              // Let's assume for now any import link keeps it alive, besides the one just cut.
              // We need a more robust way to track consumers if this becomes an issue.
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
       if (!isStillNeeded) {
        //
       }
    }


    if (isStillNeeded) {
      await dispatch(recalculateAndUpdateRootAmountThunk({ rootNodeId: nodeIdToCheck, externalDemandChange: undefined }));
    } else {
      await dispatch(destroyNodeRecursiveThunk(nodeIdToCheck));
    }
  }
);

// --- Thunk for Checking and Converting Node Type --- 
export const checkAndConvertNodeTypeThunk = createAsyncThunk<
  string | undefined, // Return the ID of the node if converted B->N, else undefined
  string, // Argument: targetTreeId
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/checkAndConvertNodeType', // Renamed action type
  async (targetTreeId, { getState, dispatch }) => {
    const state = getState();
    const targetNode = state.dependencies.dependencyTrees[targetTreeId];

    if (!targetNode || !targetNode.isRoot) {
      return undefined; // Return undefined if no action taken
    }

    // --- Scenario 1: Convert Byproduct to Normal --- 
    if (targetNode.isByproduct && targetNode.amount > 0) { 
      
      // Try to use cached recipe first, fall back to default recipe if needed
      let recipeToUse = nodeRecipeCache[targetTreeId];
      
      if (!recipeToUse) {
        // Fall back to default recipe if no cached recipe available
      const defaultRecipe = await getRecipeByOutput(targetNode.id);
        if (defaultRecipe) {
          recipeToUse = defaultRecipe;
        }
      } else {
        // Remove from cache after using
        delete nodeRecipeCache[targetTreeId];
      }
      
      if (!recipeToUse) {
        // Still log errors
        logger.error(`[Thunk/Convert B->N] No recipe (cached or default) found for item ${targetNode.id}. Cannot convert byproduct.`);
        return undefined; // Return undefined on failure
      }
      
      // Validate that the recipe has an ID to avoid Redux state issues
      if (!recipeToUse.id) {
        // Still log errors
        logger.error(`[Thunk/Convert B->N] Recipe for ${targetTreeId} has no ID property. Cannot convert byproduct.`);
        return undefined;
      }
      
      // --- STEP 1: Update node properties (isByproduct, recipe) --- 
      const initialUpdateData: Partial<DependencyNode> = {
        isByproduct: false,
        recipe: recipeToUse,
      };
      await dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: initialUpdateData }));
      
      // --- STEP 2: Calculate and set children --- 
      try {
        const stateAfterUpdate = getState(); // Get the state *after* recipe update
        const recipeSelections = stateAfterUpdate.recipeSelections.selections;
        const dependencyTrees = stateAfterUpdate.dependencies.dependencyTrees;
        const externalImports = stateAfterUpdate.dependencies.externalImports;
        
        // Get the updated node state to use the correct amount for calculation
        const updatedNodeState = stateAfterUpdate.dependencies.dependencyTrees[targetTreeId];
        if (!updatedNodeState) {
           logger.error(`[Thunk/Convert B->N] Node ${targetTreeId} not found in state after initial update. Cannot calculate children.`);
           throw new Error(`Node ${targetTreeId} disappeared after initial update.`);
        }

        // Calculate *only* the children based on the recipe
        const calculatedNode = await calculateDependencyTree(
          updatedNodeState.id, 
          (updatedNodeState.amount || 0) + (updatedNodeState.excess || 0), // Total production = amount + excess
          recipeToUse.id, // Pass the correct recipe ID
          recipeSelections, 
          0, // Depth calculation might need adjustment if this isn't root
          [], // No affected branches needed for this specific recalculation
          targetTreeId, // Use tree ID as parentId so children have proper unique IDs
          {}, // Excess map might not be needed here, assuming root node calculation
          {}, // Empty import map
          dependencyTrees, // Pass existing trees for context
          [], // visited
          externalImports
        );
        
        if (!calculatedNode) {
          logger.error(`[Thunk/Convert B->N] calculateDependencyTree returned null for ${targetTreeId}`);
          return targetTreeId;
        }
        
        const newChildren = calculatedNode.children || [];
        
        // Dispatch another update to set the children
        await dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: { children: newChildren } }));
        
        // --- STEP 3: Trigger auto-import for the new children --- 
        await dispatch(autoImportNodeChildrenThunk(targetTreeId));
        
      } catch (error) {
        logger.error(`[Thunk/Convert B->N] Error during children calculation/update or auto-import dispatch for ${targetTreeId}:`, error);
        // Continue even if children update/import failed - we still converted the node
      }
      
      // Return the ID of the converted node
      return targetTreeId; 
      // --- End Revised Recalculation ---
    } 
    // --- Scenario 2: Convert Normal to Byproduct --- 
    else if (!targetNode.isByproduct && targetNode.amount < 0) {
      // Store the recipe in the cache before clearing it
      if (targetNode.recipe) {
        //logger.info(`[Thunk/Convert] Caching recipe ${targetNode.recipe.id} for ${targetTreeId} for potential future B->N conversion.`);
        // Ensure undefined is stored if recipe is undefined (though check prevents this)
        nodeRecipeCache[targetTreeId] = targetNode.recipe || undefined; 
      }

      // Store original children *before* clearing them
      const originalChildren = [...(targetNode.children || [])];

      const updatedNodeData: Partial<DependencyNode> = {
        isByproduct: true,
        recipe: undefined,
        children: [], // Clear children for byproduct
      };
      dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: updatedNodeData }));

      // Trigger dependency checks for former children
      for (const childNode of originalChildren) {
          // Check if the child exists before dispatching (it might have been removed concurrently)
          // Ensure childNode and uniqueId are valid before accessing/dispatching
          if (childNode && childNode.uniqueId) {
             // --- FIX: Check the target ROOT node, not the import node itself --- 
             let nodeIdToActuallyCheck = childNode.uniqueId;
             const importRef = getImportReference(childNode);
             if (importRef?.targetTreeId) {
                 nodeIdToActuallyCheck = importRef.targetTreeId;
             }
             // -------------------------------------------------------------------

             // Check if the node to check *still exists* in the state before dispatching
             const nodeState = getState().dependencies.dependencyTrees[nodeIdToActuallyCheck];
             if (nodeState) {
                  await dispatch(requestDependencyCheckThunk({ nodeIdToCheck: nodeIdToActuallyCheck, disconnectedConsumerId: targetTreeId }));
             }
          } else {
             logger.warn(`[Thunk/Convert] Invalid child node structure found while cleaning up ${targetTreeId}. Skipping check.`);
          }
      }
      // No specific return value needed here, as the side effect is the check dispatch
      return undefined; // Return undefined as no B->N conversion happened
    } 
    // --- Scenario 3: No Conversion Needed --- 
    else {
      return undefined; // Return undefined if no conversion occurred
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
    const clearedNode = clearImportReference(nodeToToggle);
    if (nodeToToggle.excess !== undefined && nodeToToggle.excess > 0) {
      clearedNode.excess = nodeToToggle.excess;
    }
    // Use local replaceNode (immutable version needed here as we replace the whole tree)
    const updatedSourceTree = replaceNode(sourceTree, nodeId, clearedNode);
    state.dependencyTrees[sourceTreeId] = updatedSourceTree;

    // Reduce amount in target tree
    if (targetTreeId && state.dependencyTrees[targetTreeId]) {
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
          targetTreeForUpdate.amount = 0;
        } else {
          targetTreeForUpdate.amount = totalRequiredAmount;
        }
        // TODO: Trigger checkAndConvertNodeTypeThunk(targetTreeId) externally
      }
    }
    // --- End Unimport Logic --- 
  } else {
    // --- Import logic --- 
    targetTreeForUpdate = state.dependencyTrees[targetTreeId];
    if (!targetTreeForUpdate) {
      targetTreeForUpdate = {
        id: nodeToToggle.id,
        amount: 0, // Start new trees at 0 amount
        uniqueId: targetTreeId,
        isRoot: true,
        children: []
      };
      state.dependencyTrees[targetTreeId] = targetTreeForUpdate;
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
    
    // --- Apply Amount Update --- 
    if (targetTreeForUpdate) {
      targetTreeForUpdate.amount = totalRequiredAmount;
      // TODO: Trigger checkAndConvertNodeTypeThunk(targetTreeId) externally AFTER this reducer completes
    } else {
      logger.error(`[Reducer] Target tree ${targetTreeId} could not be found or created during amount update.`);
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

// --- HELPER: Calculate nominal production rate for a root node ---
// Returns items per minute per machine at 100% speed
const calculateNominalRate = (node: DependencyNode): number => {
  if (!node.recipe) return 0;
  
  const recipe = node.recipe;
  if (recipe.time <= 0) return 0;
  
  // Find output amount for this item in the recipe
  const outputAmount = recipe.out?.[node.id] ?? 0;
  if (outputAmount <= 0) return 0;
  
  // Calculate cycles per minute and items per minute
  const cyclesPerMinute = 60 / recipe.time;
  const itemsPerMinute = outputAmount * cyclesPerMinute;
  
  // Note: We return raw items/min without machine speed multiplier for weighting purposes
  // The actual capacity will factor in machine count and multiplier separately
  return itemsPerMinute;
};

// --- HELPER: Calculate max capacity a root can provide (machineCount * nominalRate * multiplier - excess) ---
// Now reads directly from node properties (synced from Redux)
const calculateRootMaxCapacity = (root: DependencyNode): number => {
  const nominalRate = calculateNominalRate(root);
  const machineCount = root.machineCount ?? 1;
  const multiplier = root.machineMultiplier ?? 1;
  const excess = root.excess ?? 0;
  
  const totalCapacity = machineCount * multiplier * nominalRate;
  const availableForImport = totalCapacity - excess;
  
  logger.info(`[MaxCapacity] ${root.uniqueId}: machineCount=${machineCount}, multiplier=${multiplier}, nominalRate=${nominalRate}, excess=${excess}, available=${availableForImport}`);
  
  return Math.max(0, availableForImport);
};

// --- HELPER: Calculate current demand on a root from all importers ---
const calculateCurrentDemandOnRoot = (
  rootNodeId: string, 
  trees: Record<string, DependencyNode>
): number => {
  let totalDemand = 0;
  for (const tree of Object.values(trees)) {
    const findDemand = (node: DependencyNode): number => {
      let demand = 0;
      const importRef = getImportReference(node);
      if (importRef?.targetTreeId === rootNodeId) {
        demand += node.amount || 0;
      }
      if (node.children) {
        for (const child of node.children) {
          demand += findDemand(child);
        }
      }
      return demand;
    };
    totalDemand += findDemand(tree);
  }
  return totalDemand;
};

// --- HELPER: Find all roots producing a specific item ---
interface RootWithAvailability {
  root: DependencyNode;
  currentDemand: number;
  excess: number;
  nominalRate: number;       // Production rate per machine (for weighting)
  maxCapacity: number;       // Max this root can provide (capacity - excess)
  availableSupply: number;   // What's still available (maxCapacity - currentDemand from others)
}

const findAllRootsProducingItem = (
  itemId: string, 
  trees: Record<string, DependencyNode>,
  excludeByproducts: boolean = true
): RootWithAvailability[] => {
  const results: RootWithAvailability[] = [];
  
  for (const tree of Object.values(trees)) {
    if (!tree.isRoot || tree.id !== itemId) continue;
    if (excludeByproducts && tree.isByproduct) continue;
    
    const currentDemand = calculateCurrentDemandOnRoot(tree.uniqueId, trees);
    const excess = tree.excess || 0;
    const nominalRate = calculateNominalRate(tree);
    const maxCapacity = calculateRootMaxCapacity(tree);
    
    // Available supply = maxCapacity - what's already being imported from this root
    // Note: currentDemand is total demand from ALL importers, so we can't directly subtract
    // For initial distribution, availableSupply = maxCapacity
    const availableSupply = maxCapacity;
    
    results.push({
      root: tree,
      currentDemand,
      excess,
      nominalRate,
      maxCapacity,
      availableSupply
    });
  }
  
  return results;
};

// --- HELPER FUNCTION TO APPLY DISTRIBUTION PLAN ---
// Applies a distribution plan to import nodes, updating amounts and creating splits as needed
const applyDistributionPlan = async (
  child: DependencyNode,
  distributionPlan: { rootId: string; amount: number }[],
  importRef: { targetTreeId: string; targetNodeId: string },
  parentNodeId: string,
  dispatch: AppDispatch,
  getState: () => RootState
): Promise<void> => {
  const treeId = parentNodeId.split('-')[0] || parentNodeId;
  const currentTree = getState().dependencies.dependencyTrees[treeId];
  if (!currentTree) return;
  
  const parentNode = findNodeById(currentTree, parentNodeId);
  if (!parentNode) return;
  
  if (distributionPlan.length <= 1) {
    // Single target - update original import
    const targetRootId = distributionPlan.length === 1 ? distributionPlan[0].rootId : importRef.targetTreeId;
    
    // Update child's import reference if needed
    if (targetRootId !== importRef.targetTreeId) {
      await dispatch(updateNodeProperties({
        nodeId: child.uniqueId,
        updatedNode: { 
          importReference: { targetTreeId: targetRootId, targetNodeId: targetRootId }
        }
      }));
    }
    
    await dispatch(recalculateAndUpdateRootAmountThunk({
      rootNodeId: targetRootId,
      externalDemandChange: { importerNodeId: child.uniqueId, amount: distributionPlan.length === 1 ? distributionPlan[0].amount : 0 }
    }));
  } else {
    // Multiple targets - update first, create splits for others
    logger.info(`[ApplyDistribution] Creating ${distributionPlan.length} import splits for ${child.uniqueId}`);
    
    const firstSource = distributionPlan[0];
    
    // Update original child's amount and target
    await dispatch(updateNodeProperties({
      nodeId: child.uniqueId,
      updatedNode: { 
        amount: firstSource.amount,
        importReference: { targetTreeId: firstSource.rootId, targetNodeId: firstSource.rootId }
      }
    }));
    
    await dispatch(recalculateAndUpdateRootAmountThunk({
      rootNodeId: firstSource.rootId,
      externalDemandChange: { importerNodeId: child.uniqueId, amount: firstSource.amount }
    }));
    
    // Check if we already have split children from a previous redistribution
    const existingSplitIds = (parentNode.children || [])
      .filter(c => c.uniqueId.startsWith(`${child.uniqueId}-split-`))
      .map(c => c.uniqueId);
    
    // Remove old splits first
    if (existingSplitIds.length > 0) {
      const currentParent = getState().dependencies.dependencyTrees[treeId];
      if (currentParent) {
        const parentNodeNow = findNodeById(currentParent, parentNodeId);
        if (parentNodeNow) {
          const filteredChildren = (parentNodeNow.children || []).filter(
            c => !existingSplitIds.includes(c.uniqueId)
          );
          await dispatch(updateNodeProperties({
            nodeId: parentNodeId,
            updatedNode: { children: filteredChildren }
          }));
        }
      }
    }
    
    // Create new split children for remaining sources
    for (let i = 1; i < distributionPlan.length; i++) {
      const source = distributionPlan[i];
      const newChildId = `${child.uniqueId}-split-${i}-${Date.now()}`;
      
      const newChildNode: DependencyNode = {
        id: child.id,
        uniqueId: newChildId,
        amount: source.amount,
        depth: child.depth,
        isImport: true,
        importReference: { targetTreeId: source.rootId, targetNodeId: source.rootId },
        children: [],
        recipe: undefined,
      };
      
      // Add to parent
      const currentParentTree = getState().dependencies.dependencyTrees[treeId];
      if (currentParentTree) {
        const parentNodeNow = findNodeById(currentParentTree, parentNodeId);
        if (parentNodeNow) {
          const updatedChildren = [...(parentNodeNow.children || []), newChildNode];
          await dispatch(updateNodeProperties({
            nodeId: parentNodeId,
            updatedNode: { children: updatedChildren }
          }));
        }
      }
      
      await dispatch(recalculateAndUpdateRootAmountThunk({
        rootNodeId: source.rootId,
        externalDemandChange: { importerNodeId: newChildId, amount: source.amount }
      }));
      
      logger.info(`[ApplyDistribution] Created split ${newChildId} importing ${source.amount} from ${source.rootId}`);
    }
  }
};

// --- THUNK TO REDISTRIBUTE IMPORTS ACROSS MULTIPLE SOURCES ---
// Called when a parent node's production changes and its children need to redistribute imports
interface RedistributeImportsArgs {
  parentNodeId: string;  // The node whose children need redistribution
  treeId: string;        // The tree containing the parent
}

export const redistributeChildImportsThunk = createAsyncThunk<
  void,
  RedistributeImportsArgs,
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/redistributeChildImports',
  async ({ parentNodeId, treeId }, { getState, dispatch }) => {
    const state = getState();
    const trees = state.dependencies.dependencyTrees;
    const parentTree = trees[treeId];
    
    if (!parentTree) {
      logger.error(`[Redistribute] Tree ${treeId} not found`);
      return;
    }
    
    const parentNode = findNodeById(parentTree, parentNodeId);
    if (!parentNode || !parentNode.children) {
      return;
    }
    
    // Process each child that is an import node
    for (const child of parentNode.children) {
      const importRef = getImportReference(child);
      if (!importRef) continue; // Not an import node
      
      // Skip split children - they are managed by their original import node
      if (child.uniqueId.includes('-split-')) {
        logger.info(`[Redistribute] Skipping split child ${child.uniqueId} - managed by original`);
        continue;
      }
      
      const childAmount = child.amount || 0;
      
      // Handle cleanup when amount is 0 or less
      if (childAmount <= 0) {
        logger.info(`[Redistribute] Child ${child.uniqueId} has amount ${childAmount}, cleaning up split imports`);
        
        // Find any existing split children for this import
        const existingSplitIds = parentNode.children
          .filter(c => c.uniqueId.startsWith(`${child.uniqueId}-split-`))
          .map(c => c.uniqueId);
        
        // Clear demand on original import's target
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: importRef.targetTreeId,
          externalDemandChange: { importerNodeId: child.uniqueId, amount: 0 }
        }));
        
        // Clear demand on each split's target and remove split nodes
        if (existingSplitIds.length > 0) {
          const currentTree = getState().dependencies.dependencyTrees[treeId];
          if (currentTree) {
            const parentNodeNow = findNodeById(currentTree, parentNodeId);
            if (parentNodeNow) {
              for (const splitId of existingSplitIds) {
                const splitNode = parentNodeNow.children?.find(c => c.uniqueId === splitId);
                if (splitNode) {
                  const splitRef = getImportReference(splitNode);
                  if (splitRef) {
                    await dispatch(recalculateAndUpdateRootAmountThunk({
                      rootNodeId: splitRef.targetTreeId,
                      externalDemandChange: { importerNodeId: splitId, amount: 0 }
                    }));
                  }
                }
              }
              
              // Remove only split children from parent (keep original import node)
              const filteredChildren = (parentNodeNow.children || []).filter(
                c => !existingSplitIds.includes(c.uniqueId)
              );
              await dispatch(updateNodeProperties({
                nodeId: parentNodeId,
                updatedNode: { children: filteredChildren }
              }));
              logger.info(`[Redistribute] Removed ${existingSplitIds.length} split children during cleanup (kept original import)`);
            }
          }
        }
        
        continue;
      }
      
      // Find all roots producing this item
      const latestTrees = getState().dependencies.dependencyTrees;
      const allProducingRoots = findAllRootsProducingItem(child.id, latestTrees, true);
      
      if (allProducingRoots.length <= 1) {
        // Single source - just update the amount on the target
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: importRef.targetTreeId,
          externalDemandChange: { importerNodeId: child.uniqueId, amount: childAmount }
        }));
        continue;
      }
      
      // Multiple sources available - redistribute using production rate weights
      logger.info(`[Redistribute] Child ${child.uniqueId} (${child.id}) needs ${childAmount}, found ${allProducingRoots.length} sources`);
      
      // Calculate total weight (sum of all nominal rates)
      const totalWeight = allProducingRoots.reduce((sum, r) => sum + r.nominalRate, 0);
      
      if (totalWeight <= 0) {
        // Fallback to equal distribution if no rates available
        logger.warn(`[Redistribute] No nominal rates found, falling back to equal distribution`);
        const perRootShare = childAmount / allProducingRoots.length;
        const distributionPlan = allProducingRoots.map(rootInfo => ({
          rootId: rootInfo.root.uniqueId,
          amount: perRootShare
        }));
        await applyDistributionPlan(child, distributionPlan, importRef, parentNodeId, dispatch, getState);
        continue;
      }
      
      // Distribute based on production rate weights
      const distributionPlan: { rootId: string; amount: number }[] = [];
      for (const rootInfo of allProducingRoots) {
        const weight = rootInfo.nominalRate / totalWeight;
        const share = childAmount * weight;
        distributionPlan.push({ rootId: rootInfo.root.uniqueId, amount: share });
        logger.info(`[Redistribute] ${rootInfo.root.uniqueId} weight=${weight.toFixed(3)} (rate=${rootInfo.nominalRate}), share=${share.toFixed(2)}`);
      }
      
      // Apply the distribution
      if (distributionPlan.length <= 1) {
        // Single target - update original import
        const targetRootId = distributionPlan.length === 1 ? distributionPlan[0].rootId : importRef.targetTreeId;
        
        // Update child's import reference if needed
        if (targetRootId !== importRef.targetTreeId) {
          await dispatch(updateNodeProperties({
            nodeId: child.uniqueId,
            updatedNode: { 
              importReference: { targetTreeId: targetRootId, targetNodeId: targetRootId }
            }
          }));
        }
        
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: targetRootId,
          externalDemandChange: { importerNodeId: child.uniqueId, amount: childAmount }
        }));
      } else {
        // Multiple targets - update first, create splits for others
        logger.info(`[Redistribute] Creating ${distributionPlan.length} import splits for ${child.uniqueId}`);
        
        const firstSource = distributionPlan[0];
        
        // Update original child's amount and target
        await dispatch(updateNodeProperties({
          nodeId: child.uniqueId,
          updatedNode: { 
            amount: firstSource.amount,
            importReference: { targetTreeId: firstSource.rootId, targetNodeId: firstSource.rootId }
          }
        }));
        
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: firstSource.rootId,
          externalDemandChange: { importerNodeId: child.uniqueId, amount: firstSource.amount }
        }));
        
        // Check if we already have split children from a previous redistribution
        const existingSplitIds = parentNode.children
          .filter(c => c.uniqueId.startsWith(`${child.uniqueId}-split-`))
          .map(c => c.uniqueId);
        
        // Remove old splits first
        if (existingSplitIds.length > 0) {
          const currentParent = getState().dependencies.dependencyTrees[treeId];
          if (currentParent) {
            const parentNodeNow = findNodeById(currentParent, parentNodeId);
            if (parentNodeNow) {
              const filteredChildren = (parentNodeNow.children || []).filter(
                c => !existingSplitIds.includes(c.uniqueId)
              );
              await dispatch(updateNodeProperties({
                nodeId: parentNodeId,
                updatedNode: { children: filteredChildren }
              }));
            }
          }
        }
        
        // Create new split children for remaining sources
        for (let i = 1; i < distributionPlan.length; i++) {
          const source = distributionPlan[i];
          const newChildId = `${child.uniqueId}-split-${i}-${Date.now()}`;
          
          const newChildNode: DependencyNode = {
            id: child.id,
            uniqueId: newChildId,
            amount: source.amount,
            depth: child.depth,
            isImport: true,
            importReference: { targetTreeId: source.rootId, targetNodeId: source.rootId },
            children: [],
            recipe: undefined,
          };
          
          // Add to parent
          const currentParent = getState().dependencies.dependencyTrees[treeId];
          if (currentParent) {
            const parentNodeNow = findNodeById(currentParent, parentNodeId);
            if (parentNodeNow) {
              const updatedChildren = [...(parentNodeNow.children || []), newChildNode];
              await dispatch(updateNodeProperties({
                nodeId: parentNodeId,
                updatedNode: { children: updatedChildren }
              }));
            }
          }
          
          await dispatch(recalculateAndUpdateRootAmountThunk({
            rootNodeId: source.rootId,
            externalDemandChange: { importerNodeId: newChildId, amount: source.amount }
          }));
          
          logger.info(`[Redistribute] Created split ${newChildId} importing ${source.amount} from ${source.rootId}`);
        }
      }
      
      // Recalculate old target if we changed targets
      if (distributionPlan.length > 0 && distributionPlan[0].rootId !== importRef.targetTreeId) {
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: importRef.targetTreeId,
          externalDemandChange: undefined
        }));
      }
    }
  }
);

// --- THUNK TO SET IMPORT AMOUNT MANUALLY ---
// Used when user manually adjusts import amount via input or R/M buttons
interface SetImportAmountArgs {
  importNodeId: string;   // The import child node being adjusted
  parentNodeId: string;   // The parent node containing import children
  treeId: string;         // Tree containing the parent
  newAmount: number;      // New amount to import from this source
}

export const setImportAmountThunk = createAsyncThunk<
  void,
  SetImportAmountArgs,
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/setImportAmount',
  async ({ importNodeId, parentNodeId, treeId, newAmount }, { getState, dispatch }) => {
    const state = getState();
    const trees = state.dependencies.dependencyTrees;
    const tree = trees[treeId];
    
    if (!tree) {
      logger.error(`[SetImportAmount] Tree ${treeId} not found`);
      return;
    }
    
    const parentNode = findNodeById(tree, parentNodeId);
    if (!parentNode || !parentNode.children) {
      logger.error(`[SetImportAmount] Parent node ${parentNodeId} not found`);
      return;
    }
    
    // Find the import node being adjusted
    const importNode = parentNode.children.find(c => c.uniqueId === importNodeId);
    if (!importNode) {
      logger.error(`[SetImportAmount] Import node ${importNodeId} not found`);
      return;
    }
    
    const importRef = getImportReference(importNode);
    if (!importRef) {
      logger.error(`[SetImportAmount] Node ${importNodeId} is not an import node`);
      return;
    }
    
    // Calculate total demand from all import siblings (original + splits)
    const originalImportId = importNodeId.includes('-split-') 
      ? importNodeId.split('-split-')[0] 
      : importNodeId;
    
    const allImportSiblings = parentNode.children.filter(c => 
      c.uniqueId === originalImportId || c.uniqueId.startsWith(`${originalImportId}-split-`)
    );
    
    const totalDemand = allImportSiblings.reduce((sum, c) => sum + (c.amount || 0), 0);
    const currentAmount = importNode.amount || 0;
    const otherSiblingsAmount = totalDemand - currentAmount;
    
    // Calculate new total and what remains for redistribution
    const newTotal = otherSiblingsAmount + Math.max(0, newAmount);
    
    logger.info(`[SetImportAmount] Setting ${importNodeId} from ${currentAmount} to ${newAmount}. Total demand: ${totalDemand} -> ${newTotal}`);
    
    // Update this import node's amount
    await dispatch(updateNodeProperties({
      nodeId: importNodeId,
      updatedNode: { amount: Math.max(0, newAmount) }
    }));
    
    // Update target root
    await dispatch(recalculateAndUpdateRootAmountThunk({
      rootNodeId: importRef.targetTreeId,
      externalDemandChange: { importerNodeId: importNodeId, amount: Math.max(0, newAmount) }
    }));
    
    // Calculate remaining amount to redistribute among other sources
    const remainingForOthers = totalDemand - Math.max(0, newAmount);
    
    if (remainingForOthers > 0 && allImportSiblings.length > 1) {
      // Find other siblings and redistribute remaining amount proportionally
      const otherSiblings = allImportSiblings.filter(c => c.uniqueId !== importNodeId);
      const otherTotal = otherSiblings.reduce((sum, c) => sum + (c.amount || 0), 0);
      
      for (const sibling of otherSiblings) {
        const siblingRef = getImportReference(sibling);
        if (!siblingRef) continue;
        
        // Proportional redistribution
        const proportion = otherTotal > 0 ? (sibling.amount || 0) / otherTotal : 1 / otherSiblings.length;
        const newSiblingAmount = remainingForOthers * proportion;
        
        await dispatch(updateNodeProperties({
          nodeId: sibling.uniqueId,
          updatedNode: { amount: newSiblingAmount }
        }));
        
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: siblingRef.targetTreeId,
          externalDemandChange: { importerNodeId: sibling.uniqueId, amount: newSiblingAmount }
        }));
      }
    } else if (remainingForOthers <= 0 && allImportSiblings.length > 1) {
      // Set other siblings to 0
      const otherSiblings = allImportSiblings.filter(c => c.uniqueId !== importNodeId);
      for (const sibling of otherSiblings) {
        const siblingRef = getImportReference(sibling);
        if (!siblingRef) continue;
        
        await dispatch(updateNodeProperties({
          nodeId: sibling.uniqueId,
          updatedNode: { amount: 0 }
        }));
        
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: siblingRef.targetTreeId,
          externalDemandChange: { importerNodeId: sibling.uniqueId, amount: 0 }
        }));
      }
    }
  }
);

// --- THUNK TO RESET IMPORT TO ZERO ---
export const resetImportAmountThunk = createAsyncThunk<
  void,
  { importNodeId: string; parentNodeId: string; treeId: string },
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/resetImportAmount',
  async ({ importNodeId, parentNodeId, treeId }, { dispatch }) => {
    await dispatch(setImportAmountThunk({ 
      importNodeId, 
      parentNodeId, 
      treeId, 
      newAmount: 0 
    }));
  }
);

// --- THUNK TO MAX IMPORT (take as much as source can provide) ---
interface MaxImportAmountArgs {
  importNodeId: string;
  parentNodeId: string;
  treeId: string;
}

export const maxImportAmountThunk = createAsyncThunk<
  void,
  MaxImportAmountArgs,
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/maxImportAmount',
  async ({ importNodeId, parentNodeId, treeId }, { getState, dispatch }) => {
    const state = getState();
    const trees = state.dependencies.dependencyTrees;
    const tree = trees[treeId];
    
    if (!tree) return;
    
    const parentNode = findNodeById(tree, parentNodeId);
    if (!parentNode || !parentNode.children) return;
    
    // Find the import node
    const importNode = parentNode.children.find(c => c.uniqueId === importNodeId);
    if (!importNode) return;
    
    const importRef = getImportReference(importNode);
    if (!importRef) return;
    
    // Find the target root
    const targetRoot = trees[importRef.targetTreeId];
    if (!targetRoot) return;
    
    // Calculate max capacity this root can provide (reads from Redux node)
    const maxCapacity = calculateRootMaxCapacity(targetRoot);
    
    // Calculate total demand from all import siblings for the same item
    const originalImportId = importNodeId.includes('-split-') 
      ? importNodeId.split('-split-')[0] 
      : importNodeId;
    
    const allImportSiblings = parentNode.children.filter(c => 
      c.uniqueId === originalImportId || c.uniqueId.startsWith(`${originalImportId}-split-`)
    );
    
    const totalDemand = allImportSiblings.reduce((sum, c) => sum + (c.amount || 0), 0);
    
    // Max we can take = min(maxCapacity, totalDemand)
    // We take as much as we can from this source, up to total demand
    const maxTake = Math.min(maxCapacity, totalDemand);
    
    logger.info(`[MaxImport] ${importNodeId}: maxCapacity=${maxCapacity}, totalDemand=${totalDemand}, maxTake=${maxTake}`);
    
    await dispatch(setImportAmountThunk({
      importNodeId,
      parentNodeId,
      treeId,
      newAmount: maxTake
    }));
  }
);

// --- THUNK TO APPLY AUTO-IMPORT TO CHILDREN (Restored from 1ce0b34) ---
// ENHANCED: Now supports multi-source imports - distributing demand across multiple roots
export const autoImportNodeChildrenThunk = createAsyncThunk<
  void,
  string, // parentNodeId
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/autoImportNodeChildren',
  async (parentNodeId, { getState, dispatch }) => {
    const state = getState();
    const parentNode = state.dependencies.dependencyTrees[parentNodeId];
    const externalImports = state.dependencies.externalImports;

    if (!parentNode) {
      logger.error(`[Thunk/AutoImportChildren] Parent node ${parentNodeId} not found.`);
      return;
    }

    if (!parentNode.children || parentNode.children.length === 0) {
      return;
    }

    const childrenToProcess = parentNode.children ? [...parentNode.children] : []; // Safer copy

    const generateTreeId = (itemId: string) => `tree-${itemId}-${Date.now()}-${Math.floor(Math.random() * 1e7)}`;

    for (const child of childrenToProcess) {
      if (child.isImport || child.importReference) continue;

      // External imports: this item is sourced externally, no root needed
      if (externalImports[child.id]) {
        await dispatch(updateNodeProperties({
          nodeId: child.uniqueId,
          updatedNode: {
            isExternal: true,
            isImport: false,
            importReference: undefined,
            recipe: undefined,
            children: [],
          } as Partial<DependencyNode>,
        }));
        continue;
      }

      let targetTreeId: string | null = null;
      let existingRootFound = false;
      const trees = getState().dependencies.dependencyTrees; // Get latest trees

      // --- Handle Byproduct Children ---
      if (child.isByproduct) {
          // 1a. Find ANY Existing Root
          const existingRoot = Object.values(trees).find(t => t?.isRoot && t.id === child.id);
          if (existingRoot) {
              targetTreeId = existingRoot.uniqueId;
              existingRootFound = true;
          } else {
              // 2a. Create New BYPRODUCT Root if None Found
              const newRootId = generateTreeId(child.id);
              try {
                  // Create a minimal BYPRODUCT root structure
                  const newRootNode: DependencyNode = {
                      id: child.id,
                      uniqueId: newRootId,
                      amount: 0,
                      isRoot: true,
                      isByproduct: true,
                      recipe: undefined,
                      children: [],
                      depth: 0,
                      // Always fetch available recipes
                      availableRecipes: await getRecipesForItem(child.id), 
                  };
                  await dispatch(setDependencies({ treeId: newRootId, tree: newRootNode }));
                  if (!getState().dependencies.dependencyTrees[newRootId]) throw new Error("Byproduct root not found");
                  targetTreeId = newRootId;
              } catch (error) { logger.error(`[AutoImport] Failed BYPRODUCT root for ${child.id}:`, error); continue; }
          }
      } 
      // --- Handle Normal Children (ENHANCED for multi-source) ---
      else { 
          // Find ALL existing normal roots producing this item
          const latestTrees = getState().dependencies.dependencyTrees;
          const allProducingRoots = findAllRootsProducingItem(child.id, latestTrees, true);
          
          if (allProducingRoots.length > 0) {
            const requiredAmount = child.amount || 0;
            
            // Log multi-source info for debugging
            if (allProducingRoots.length > 1) {
              logger.info(`[AutoImport Multi-Source] Found ${allProducingRoots.length} roots producing ${child.id}, need ${requiredAmount}:`);
              allProducingRoots.forEach((r, idx) => {
                logger.info(`  [${idx}] ${r.root.uniqueId} (recipe: ${r.root.recipe?.id || 'none'}): currentDemand=${r.currentDemand}, excess=${r.excess}`);
              });
            }
            
            // Distribution strategy for multiple sources:
            // 1. First, use available excess from roots that have it
            // 2. Then distribute remaining demand proportionally across all roots
            let remainingToDistribute = requiredAmount;
            const distributionPlan: { rootId: string; amount: number }[] = [];
            
            // Phase 1: Use available excess from each root first
            for (const rootInfo of allProducingRoots) {
              if (remainingToDistribute <= 0) break;
              
              const excessAvailable = rootInfo.excess;
              if (excessAvailable > 0) {
                const takeFromExcess = Math.min(remainingToDistribute, excessAvailable);
                distributionPlan.push({ rootId: rootInfo.root.uniqueId, amount: takeFromExcess });
                remainingToDistribute -= takeFromExcess;
                logger.info(`[AutoImport Multi-Source] Using ${takeFromExcess} excess from ${rootInfo.root.uniqueId}, remaining: ${remainingToDistribute}`);
              }
            }
            
            // Phase 2: Distribute remaining demand equally across all roots
            if (remainingToDistribute > 0 && allProducingRoots.length > 0) {
              const perRootShare = remainingToDistribute / allProducingRoots.length;
              
              for (const rootInfo of allProducingRoots) {
                const existingEntry = distributionPlan.find(p => p.rootId === rootInfo.root.uniqueId);
                if (existingEntry) {
                  existingEntry.amount += perRootShare;
                } else {
                  distributionPlan.push({ rootId: rootInfo.root.uniqueId, amount: perRootShare });
                }
              }
              logger.info(`[AutoImport Multi-Source] Distributed remaining ${remainingToDistribute} equally (${perRootShare} each) across ${allProducingRoots.length} roots`);
            }
            
            // If only one target in distribution plan, use simple single-source logic
            if (distributionPlan.length <= 1) {
              targetTreeId = distributionPlan.length === 1 ? distributionPlan[0].rootId : allProducingRoots[0].root.uniqueId;
              existingRootFound = true;
            } else {
              // MULTI-SOURCE: Create additional child nodes for each source beyond the first
              logger.info(`[AutoImport Multi-Source] Creating distribution plan with ${distributionPlan.length} sources`);
              
              // Handle first source with the original child node
              const firstSource = distributionPlan[0];
              targetTreeId = firstSource.rootId;
              existingRootFound = true;
              
              // Update the original child's amount to only be what this source provides
              await dispatch(updateNodeProperties({ 
                nodeId: child.uniqueId, 
                updatedNode: { amount: firstSource.amount } 
              }));
              
              // Create additional child nodes for remaining sources
              for (let i = 1; i < distributionPlan.length; i++) {
                const source = distributionPlan[i];
                const newChildId = `${child.uniqueId}-split-${i}-${Date.now()}`;
                
                // Create a new child node that imports from this source
                const newChildNode: DependencyNode = {
                  id: child.id,
                  uniqueId: newChildId,
                  amount: source.amount,
                  depth: child.depth,
                  isImport: true,
                  importReference: { targetTreeId: source.rootId, targetNodeId: source.rootId },
                  children: [],
                  recipe: undefined,
                };
                
                // Add this new child to the parent
                const currentParent = getState().dependencies.dependencyTrees[parentNodeId];
                if (currentParent) {
                  const updatedChildren = [...(currentParent.children || []), newChildNode];
                  await dispatch(updateNodeProperties({
                    nodeId: parentNodeId,
                    updatedNode: { children: updatedChildren }
                  }));
                  
                  // Trigger recalculation for this target root
                  await dispatch(recalculateAndUpdateRootAmountThunk({
                    rootNodeId: source.rootId,
                    externalDemandChange: { importerNodeId: newChildId, amount: source.amount }
                  }));
                  
                  logger.info(`[AutoImport Multi-Source] Created split child ${newChildId} importing ${source.amount} from ${source.rootId}`);
                }
              }
            }
          } else {
            // No NORMAL roots, check for EXISTING BYPRODUCT root
            const existingByproductRoot = Object.values(latestTrees).find(
              t => t.isRoot && t.id === child.id && t.isByproduct
            );
            
            if (existingByproductRoot) {
                // Found BYPRODUCT root -> Convert it to NORMAL
                try {
                    await dispatch(checkAndConvertNodeTypeThunk(existingByproductRoot.uniqueId));
                    targetTreeId = existingByproductRoot.uniqueId;
                    existingRootFound = true;
                } catch (error) {
                    logger.error(`[Thunk/AutoImportChildren] Error during B->N conversion dispatch for ${existingByproductRoot.uniqueId}:`, error);
                    continue;
                }
            }
          }
          
          // Create New NORMAL Root if no existing roots found
          if (!existingRootFound) {
              const newRootId = generateTreeId(child.id);
              try {
                 // 1. Create node structure (amount starts at 0)
                  const defaultRecipe = await getRecipeByOutput(child.id);
                  // ALWAYS fetch all available recipes
                  const availableRecipes = await getRecipesForItem(child.id);
                  
                  const newRootNode: DependencyNode = {
                      id: child.id, uniqueId: newRootId, amount: 0, isRoot: true,
                      recipe: defaultRecipe, // Keep default recipe if found
                      children: [], depth: 0,
                      // Assign ALL fetched recipes
                      availableRecipes: availableRecipes, 
                  };
                  
                  // 2. Add the root to the state
                  await dispatch(setDependencies({ treeId: newRootId, tree: newRootNode }));
                  
                  // 3. Immediately link the *triggering child* to establish initial demand
                  // Use the amount from the child node in the loop's context
                  await dispatch(setNodeAsImportThunk({ 
                    childNodeId: child.uniqueId, 
                    targetRootId: newRootId, 
                    importingAmount: child.amount // Pass the trigger amount
                  }));
                  // This ^ call internally triggers recalculateAndUpdateRootAmountThunk(newRootId)

                  // 4. Get the updated state AFTER the link and initial recalc
                  const stateAfterLinkAndRecalc = getState();
                  const updatedNewRootNode = stateAfterLinkAndRecalc.dependencies.dependencyTrees[newRootId];
                  if (!updatedNewRootNode) {
                      logger.error(`New root ${newRootId} disappeared after initial link/recalc.`); // Simplified error
                      throw new Error(`New root ${newRootId} disappeared after initial link/recalc.`);
                  }
                  
                  // 5. Get the correct demand for children (total = amount + excess)
                  const demandForChildren = (updatedNewRootNode.amount || 0) + (updatedNewRootNode.excess || 0);

                  // 6. Calculate children using the correct demand
                  const calculatedChildren = await calculateDependencyTree(
                    updatedNewRootNode.id, 
                    demandForChildren, // <<< Use the correct demand
                    updatedNewRootNode.recipe?.id || null, 
                    stateAfterLinkAndRecalc.recipeSelections.selections, // Use latest selections
               0, [], newRootId, {}, {}, // Use newRootId as parentId
                stateAfterLinkAndRecalc.dependencies.dependencyTrees, // Pass latest trees
                [], // visited
                stateAfterLinkAndRecalc.dependencies.externalImports
                  ).then(node => node?.children || []);
                  
                  // 7. Add children to the root node
                  if (calculatedChildren.length > 0) {
                      await dispatch(updateNodeProperties({ nodeId: newRootId, updatedNode: { children: calculatedChildren }}));
                  }

                  // 8. Set target for subsequent steps (if any)
                  targetTreeId = newRootId;

                  // 9. RECURSION: Process the *children we just added* 
                  await dispatch(autoImportNodeChildrenThunk(newRootId));

              } catch (error) {
                  logger.error(`[AutoImport] Failed NORMAL root for ${child.id}:`, error);
                  continue;
              }
          }
      }
      
      // Ensure targetTreeId is set from the block above before the final linking step
      // <<< UNCOMMENT START >>>
      // 3. Set Import Reference (Common Logic for Both Byproduct & Normal Children)
      if (targetTreeId) {
        // Get the child node's current amount FROM THE STATE after any updates
        const latestState = getState();
        const latestParentNode = findNodeById(latestState.dependencies.dependencyTrees[parentNodeId], parentNodeId);
        const latestChildState = latestParentNode?.children?.find(c => c.uniqueId === child.uniqueId);
        const actualImportingAmount = latestChildState?.amount || 0;

        await dispatch(setNodeAsImportThunk({ 
          childNodeId: child.uniqueId, 
          targetRootId: targetTreeId, 
          importingAmount: actualImportingAmount
        }));
        // childrenModified = true; // No longer used
      }
      // <<< UNCOMMENT END >>>
    }
    
  }
); 

// Define Args Interface for Recalculate Thunk
interface RecalculateArgs {
  rootNodeId: string;
  // Optional: Provide the demand from a specific importer that just changed/connected
  externalDemandChange?: { 
    importerNodeId: string; // uniqueId of the node now importing
    amount: number;          // the amount this specific importer requires
  };
}

// --- THUNK TO RECALCULATE AND UPDATE ROOT NODE AMOUNT --- 
export const recalculateAndUpdateRootAmountThunk = createAsyncThunk<
  void, 
  RecalculateArgs, // Use the new args interface
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/recalculateAndUpdateRootAmount',
  async ({ rootNodeId, externalDemandChange }, { getState, dispatch }) => { // Destructure args
    const state = getState();
    const rootNode = state.dependencies.dependencyTrees[rootNodeId];

    if (!rootNode) { /* ... null check ... */ return; }
    if (!rootNode.isRoot) { /* ... root check ... */ return; }

    let newRequiredAmount = 0;
    const initialAmount = rootNode.amount;
    
    // 1. Find all current importers and sum their demands
    for (const tree of Object.values(state.dependencies.dependencyTrees)) {
        const findDemand = (node: DependencyNode): number => {
            let demand = 0;
            const importRef = getImportReference(node);
            if (importRef?.targetTreeId === rootNodeId) {
                let importerAmount = 0;
                // *** USE EXTERNAL DEMAND IF PROVIDED FOR THIS IMPORTER ***
                if (externalDemandChange && externalDemandChange.importerNodeId === node.uniqueId) {
                    importerAmount = externalDemandChange.amount;
                } else {
                    // Otherwise, read from state as before
                    importerAmount = node.amount || 0;
                }
                demand += importerAmount; 
            }
            // Recursively check children
            if (node.children) {
                for (const child of node.children) {
                    demand += findDemand(child);
                }
            }
            return demand;
        };
        newRequiredAmount += findDemand(tree);
    }


    // 3. Dispatch update if the amount has changed — OR always cascade when called
    //    after an import/unimport so that downstream nodes get recalculated even
    //    when the root amount was already set by a reducer (e.g. importNodeAction).
    {
        // Update the root node's amount
        dispatch(updateForcedProduction({ 
            nodeId: rootNodeId, 
            treeId: rootNodeId, 
            amount: newRequiredAmount 
        }));
        await Promise.resolve(); // Ensure state update completes
        
        // 4. Cascade updates to children
        // Get fresh state after root amount update
        const stateAfterRootUpdate = getState();
        const updatedRootNode = stateAfterRootUpdate.dependencies.dependencyTrees[rootNodeId];
        
        if (updatedRootNode) {
            // Calculate total production (amount + excess) for child calculations
            const totalProduction = (updatedRootNode.amount || 0) + (updatedRootNode.excess || 0);
            
            // Get child updates needed
            const childUpdates = calculateChildProductionNeeds(updatedRootNode, rootNodeId, totalProduction);
            
            // Recursively dispatch updates for children
            const cascadeChildUpdates = async (updates: AffectedNodeUpdate[]) => {
                for (const update of updates) {
                    // Update this child's amount
                    dispatch(updateForcedProduction({
                        nodeId: update.nodeId,
                        treeId: update.treeId,
                        amount: update.amount
                    }));
                    await Promise.resolve();
                    
                    // Check if this child has import reference - if so, recalculate that target
                    const freshState = getState();
                    const tree = freshState.dependencies.dependencyTrees[update.treeId];
                    if (tree) {
                        const childNode = findNodeById(tree, update.nodeId);
                        if (childNode) {
                            const childImportRef = getImportReference(childNode);
                            if (childImportRef?.targetTreeId) {
                                // This child imports from another tree - recalculate that target
                                await dispatch(recalculateAndUpdateRootAmountThunk({
                                    rootNodeId: childImportRef.targetTreeId,
                                    externalDemandChange: undefined
                                }));
                            } else if (childNode.children && childNode.children.length > 0) {
                                // Not an import - recurse into this child's children
                                const childTotalProduction = (childNode.amount || 0) + (childNode.excess || 0);
                                const grandchildUpdates = calculateChildProductionNeeds(childNode, update.treeId, childTotalProduction);
                                await cascadeChildUpdates(grandchildUpdates);
                            }
                        }
                    }
                }
            };
            
            await cascadeChildUpdates(childUpdates);
        }
        
        await dispatch(checkAndConvertNodeTypeThunk(rootNodeId));
    }
  }
); 

// --- THUNK TO SET A NODE AS AN IMPORT AND UPDATE TARGET AMOUNT --- 
interface SetNodeAsImportArgs {
  childNodeId: string;
  targetRootId: string;
  importingAmount: number; // Add the amount being imported
}

export const setNodeAsImportThunk = createAsyncThunk<
  void,
  SetNodeAsImportArgs, // Use updated interface
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/setNodeAsImport',
  async ({ childNodeId, targetRootId, importingAmount }, { getState, dispatch }) => { 

    // 1. Get current state to verify nodes exist (optional, but good practice)
    const state = getState();
    // We need to find the child node. This requires iterating or a lookup map.
    // For now, assume updateNodeProperties can find it by uniqueId across trees.
    const targetRootNode = state.dependencies.dependencyTrees[targetRootId];
    
    if (!targetRootNode) {
        // Still log errors
        logger.error(`[Thunk/SetImport] Target root node ${targetRootId} not found. Aborting.`);
        return;
    }

    // 2. Dispatch update for the child node
    const updatePayload: Partial<DependencyNode> = {
      importReference: { targetTreeId: targetRootId, targetNodeId: targetRootId },
      isImport: true,
      children: [],
      recipe: undefined,
      amount: importingAmount, // Ensure the child node's amount is also set correctly here!
      childrenVisible: true, // <<< ADD THIS LINE: Ensure children are visible after unimport
    };
    
    try {
        await dispatch(updateNodeProperties({ nodeId: childNodeId, updatedNode: updatePayload }));
    } catch (error) {
        // Still log errors
        logger.error(`[Thunk/SetImport] Error dispatching update for child ${childNodeId}:`, error);
        return; 
    }

    // 3. Trigger amount recalculation for the target root, passing the specific change
    try {
        await dispatch(recalculateAndUpdateRootAmountThunk({
            rootNodeId: targetRootId, 
            externalDemandChange: {
                importerNodeId: childNodeId, 
                amount: importingAmount
            }
        }));
    } catch (error) {
        // Still log errors
        logger.error(`[Thunk/SetImport] Error dispatching amount recalculation for ${targetRootId}:`, error);
    }
  }
); 

// --- HELPER: Find Node Anywhere in Trees ---
const findNodeInAnyTree = (trees: Record<string, DependencyNode>, nodeId: string): { node: DependencyNode; parentTreeId: string } | null => {
  for (const treeId in trees) {
    const tree = trees[treeId];
    const foundNode = findNodeById(tree, nodeId);
    if (foundNode) {
      return { node: foundNode, parentTreeId: treeId };
    }
  }
  return null;
};

// --- THUNK TO UNIMPORT A NODE --- 
export const unimportNodeThunk = createAsyncThunk<
  void, 
  string, // nodeIdToUnimport
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/unimportNode',
  async (nodeIdToUnimport, { getState, dispatch }) => {
    // logger.debug(`[Thunk/Unimport] Request to unimport node: ${nodeIdToUnimport}`);
    const state = getState();
    const trees = state.dependencies.dependencyTrees;
    const recipeSelections = state.recipeSelections.selections;
    const externalImports = state.dependencies.externalImports;
    
    // 1. Find the node to unimport and its context
    const nodeInfo = findNodeInAnyTree(trees, nodeIdToUnimport);
    if (!nodeInfo) {
      logger.warn(`[Thunk/Unimport] Node ${nodeIdToUnimport} not found.`);
      return;
    }
    const { node: nodeToUnimport, parentTreeId } = nodeInfo;
    
    // 2. Verify it's actually an import
    const importRef = getImportReference(nodeToUnimport);
    if (!importRef || !importRef.targetTreeId) {
      // logger.log(`[Thunk/Unimport] Node ${nodeIdToUnimport} is not an import. Skipping.`);
      return;
    }
    const targetTreeId = importRef.targetTreeId;
    const targetNode = trees[targetTreeId]; // Get the target node state

    if (!targetNode) {
      logger.error(`[Thunk/Unimport] Target node ${targetTreeId} not found.`);
      return;
    }

    // 3. Determine the recipe to restore FROM THE TARGET NODE
    let recipeToRestore: Recipe | undefined = undefined; 
    if (targetNode.recipe) { 
      recipeToRestore = targetNode.recipe;
      // logger.log(`[Thunk/Unimport] Restoring recipe ${recipeToRestore.id} from target ${targetTreeId}`);
    } else {
      // Fallback: If target had no recipe (should be rare for normal nodes), 
      // use default for the *unimporting* node's item ID as a safety net.
      logger.warn(`[Thunk/Unimport] Target node ${targetTreeId} had no recipe. Falling back to default for item ${nodeToUnimport.id}.`);
      try {
        const fetchedRecipe = await getRecipeByOutput(nodeToUnimport.id);
        recipeToRestore = fetchedRecipe || undefined;
        if (!recipeToRestore) {
           logger.error(`[Thunk/Unimport] Fallback failed: No default recipe found for item ${nodeToUnimport.id}. Cannot restore chain.`);
           return; 
        }
      } catch (error) {
        logger.error(`[Thunk/Unimport] Error fetching fallback default recipe for ${nodeToUnimport.id}:`, error);
        return;
      }
    }

    // 4. Calculate new children based on restored recipe and current amount
    let newChildren: DependencyNode[] = [];
    if (recipeToRestore) {
      try {
        // <<< ADD LOGGING HERE >>>
        logger.debug(`[Thunk/Unimport DEBUG] Calculating children for ${nodeIdToUnimport} (Item: ${nodeToUnimport.id})`);
        logger.debug(`  - Amount: ${nodeToUnimport.amount}`);
        logger.debug(`  - Depth: ${nodeToUnimport.depth ?? 0}`);
        logger.debug(`  - Recipe ID: ${recipeToRestore.id}`);
        // logger.debug(`  - Recipe Selections:`, recipeSelections); // Potentially verbose
        // logger.debug(`  - Trees Context:`, trees); // Very verbose
        
        const calculatedNode = await calculateDependencyTree(
          nodeToUnimport.id,
          nodeToUnimport.amount, 
          recipeToRestore.id,
          recipeSelections, 
          nodeToUnimport.depth ?? 0, 
          [], 
          nodeToUnimport.uniqueId, 
          {}, 
          {}, 
          trees,
          [], // visited
          externalImports
        );
        newChildren = calculatedNode?.children || [];
        
        // <<< ADD LOGGING HERE >>>
        logger.debug(`[Thunk/Unimport DEBUG] Calculation Result for ${nodeIdToUnimport}:`);
        logger.debug(`  - Calculated Node:`, calculatedNode); // Log the whole node
        logger.debug(`  - New Children Count: ${newChildren.length}`);
        if (newChildren.length > 0) {
           logger.debug(`  - First Child:`, newChildren[0]);
        }
        // <<< END LOGGING >>>

      } catch (error) {
        logger.error(`[Thunk/Unimport] Error calculating children for ${nodeIdToUnimport}:`, error);
      }
    }

    // 5. Dispatch update to restore the node
    const updatePayload: Partial<DependencyNode> = {
      isImport: false,
      importReference: undefined,
      recipe: recipeToRestore, // Use the determined recipe
      children: newChildren,
      childrenVisible: true, // <<< ADD THIS LINE: Ensure children are visible after unimport
    };
    // logger.log(`[Thunk/Unimport] Dispatching updateNodeProperties for ${nodeIdToUnimport}`);
    await dispatch(updateNodeProperties({ nodeId: nodeIdToUnimport, updatedNode: updatePayload }));

    // <<< ADD LOGGING HERE >>>
    const stateAfterUpdate = getState();
    const updatedNodeInfo = findNodeInAnyTree(stateAfterUpdate.dependencies.dependencyTrees, nodeIdToUnimport);
    logger.debug(`[Thunk/Unimport DEBUG] State after updateNodeProperties for ${nodeIdToUnimport}:`);
    if (updatedNodeInfo) {
        logger.debug(`  - Found Node:`, updatedNodeInfo.node);
        logger.debug(`  - Node Children Count: ${updatedNodeInfo.node.children?.length ?? 0}`);
        if ((updatedNodeInfo.node.children?.length ?? 0) > 0) {
            logger.debug(`  - First Child in State:`, updatedNodeInfo.node.children?.[0]);
        }
    } else {
        logger.debug(`  - Node ${nodeIdToUnimport} NOT FOUND in state after update!`);
    }
    // <<< END LOGGING >>>

    // 6. Trigger amount recalculation for the *target* tree
    await dispatch(recalculateAndUpdateRootAmountThunk({ 
        rootNodeId: targetTreeId, 
        externalDemandChange: undefined 
    }));
    
    // *** NEW STEP 6b: Trigger dependency check for the target tree ***
    await dispatch(requestDependencyCheckThunk({ 
        nodeIdToCheck: targetTreeId, 
        disconnectedConsumerId: nodeIdToUnimport 
    }));

    // 7. Trigger auto-import for the children of the *now unimported* node (REMOVED)
    /*
    if (newChildren.length > 0) {
      // logger.debug(`[Thunk/Unimport] Triggering auto-import for new children of ${nodeIdToUnimport}`);
      await dispatch(autoImportNodeChildrenThunk(nodeIdToUnimport));
    }
    */
    
    // logger.debug(`[Thunk/Unimport] Finished unimporting node: ${nodeIdToUnimport}`);
  }
);

// --- THUNK: TOGGLE EXTERNAL IMPORT FOR AN ITEM ---
interface ToggleExternalImportArgs {
  itemId: string;
  enable: boolean;
}

export const toggleExternalImportThunk = createAsyncThunk<
  void,
  ToggleExternalImportArgs,
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/toggleExternalImport',
  async ({ itemId, enable }, { getState, dispatch }) => {
    const state = getState();
    const trees = state.dependencies.dependencyTrees;

    if (enable) {
      // Find the root tree producing this item
      let rootTreeId: string | null = null;
      let rootNode: DependencyNode | null = null;
      for (const [treeId, tree] of Object.entries(trees)) {
        if (tree.isRoot && tree.id === itemId && !tree.isExternal) {
          rootTreeId = treeId;
          rootNode = tree;
          break;
        }
      }

      if (rootTreeId && rootNode) {
        // Collect target tree IDs from the root's children that are import nodes,
        // so we can trigger dependency checks after the root is removed.
        const childTargetTreeIds: string[] = [];
        const collectImportTargets = (node: DependencyNode) => {
          const importRef = getImportReference(node);
          if (importRef?.targetTreeId) {
            childTargetTreeIds.push(importRef.targetTreeId);
          }
          node.children?.forEach(collectImportTargets);
        };
        rootNode.children?.forEach(collectImportTargets);

        // Store original children for dependency checks after removal
        const originalChildren = [...(rootNode.children || [])];

        // Find ALL consumers importing from this root across all trees
        const consumers = await findNodeConsumers(rootTreeId, trees);

        // Convert each consumer's import node to an external terminal node
        for (const { consumerNodeId } of consumers) {
          const consumerNodeInfo = findNodeInAnyTree(trees, consumerNodeId);
          if (!consumerNodeInfo) continue;

          await dispatch(updateNodeProperties({
            nodeId: consumerNodeId,
            updatedNode: {
              isImport: false,
              importReference: undefined,
              importedFrom: undefined,
              isExternal: true,
              recipe: undefined,
              children: [],
              excess: 0,
              machineCount: undefined,
              machineMultiplier: undefined,
            },
          }));
        }

        // Remove the root tree
        dispatch(removeNodeAction(rootTreeId));

        // Trigger dependency checks on target trees that lost an importer
        // (both the root's child import targets and any consumers of the root).
        // This cascades reduced demand down through the full dependency chain.
        const allTargetIds = new Set(childTargetTreeIds);
        for (const targetId of allTargetIds) {
          await dispatch(requestDependencyCheckThunk({
            nodeIdToCheck: targetId,
            disconnectedConsumerId: rootTreeId,
          }));
        }

        // Also trigger checks on original children that may be orphaned roots
        for (const childNode of originalChildren) {
          if (childNode?.uniqueId) {
            let checkId = childNode.uniqueId;
            const childImportRef = getImportReference(childNode);
            if (childImportRef?.targetTreeId) {
              checkId = childImportRef.targetTreeId;
            }
            const childRoot = getState().dependencies.dependencyTrees[checkId];
            if (childRoot?.isRoot) {
              await dispatch(requestDependencyCheckThunk({
                nodeIdToCheck: checkId,
                disconnectedConsumerId: rootTreeId,
              }));
            }
          }
        }
      }

      dispatch(setExternalImports({ itemId, value: true }));
    } else {
      // Find all external terminal nodes for this item across all trees
      const externalNodes: { node: DependencyNode; treeId: string }[] = [];
      for (const [treeId, tree] of Object.entries(trees)) {
        const findExternal = (node: DependencyNode) => {
          if (node.id === itemId && node.isExternal) {
            externalNodes.push({ node, treeId });
          }
          node.children?.forEach(findExternal);
        };
        findExternal(tree);
      }

      if (externalNodes.length === 0) {
        dispatch(setExternalImports({ itemId, value: false }));
        return;
      }

      // Get default recipe for the item
      const recipe = await getRecipeByOutput(itemId);
      if (!recipe) {
        logger.error(`[ExternalImport] No default recipe for ${itemId}`);
        return;
      }

      // Create a new root tree
      const totalDemand = externalNodes.reduce((sum, { node }) => sum + (node.amount || 0), 0);
      const newRootId = `${itemId}-${Date.now()}-external-restore`;

      const calculatedRoot = await calculateDependencyTree(
        itemId, 0, recipe.id, {}, 0, [], newRootId, {}, {}, trees
      );

      if (calculatedRoot) {
        calculatedRoot.uniqueId = newRootId;
        calculatedRoot.isRoot = true;
        calculatedRoot.amount = totalDemand;

        // Add the new root to the state
        dispatch(setDependencies({ treeId: newRootId, tree: calculatedRoot }));

        // Convert each external node to an import node pointing to the new root
        for (const { node } of externalNodes) {
          await dispatch(updateNodeProperties({
            nodeId: node.uniqueId,
            updatedNode: {
              isExternal: false,
              importReference: { targetTreeId: newRootId, targetNodeId: newRootId },
              isImport: true,
              importedFrom: newRootId,
              children: [],
            },
          }));
        }

        // Recalculate the new root's amount from all imports and cascade to children
        await dispatch(recalculateAndUpdateRootAmountThunk({
          rootNodeId: newRootId,
          externalDemandChange: undefined,
        }));

        // Trigger auto-import for the new root's children
        await dispatch(autoImportNodeChildrenThunk(newRootId));
      }

      dispatch(setExternalImports({ itemId, value: false }));
    }
  }
); 