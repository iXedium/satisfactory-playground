import { createAction, PayloadAction } from '@reduxjs/toolkit';
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
import { updateNodeProperties, setDependencies } from './dependencySlice';
import { calculateAccumulatedFromTree } from '../../../utils/calculateAccumulatedFromTree';
import { 
  AccumulatedNode 
} from "../../../utils/calculateAccumulatedFromTree";

// Store the last known recipes for nodes that were converted to byproduct
// This will be used to restore the recipe when converting back to normal
const nodeRecipeCache: Record<string, Recipe> = {};

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

    console.log(`[Thunk/Calc&Import V2] Adding item: ${selectedItem} with recipe: ${selectedRecipeId}`);
    let mainTreeId: string | null = null;

    try {
      const state = getState();
      const existingTrees = state.dependencies.dependencyTrees;
      
      // --- DEBUG: Log state of existing trees BEFORE calculation ---
      console.log('[Thunk/Calc&Import V2] Existing tree keys:', Object.keys(existingTrees));
      const plateTreeKey = Object.keys(existingTrees).find(key => key.includes('iron-plate'));
      if (plateTreeKey) {
          const plateTree = existingTrees[plateTreeKey];
          console.log(`[Thunk/Calc&Import V2] --- START --- State of existing Plate tree (${plateTreeKey}):`, 
            JSON.stringify({ amount: plateTree.amount, excess: plateTree.excess, recipe: plateTree.recipe?.id, children: plateTree.children?.length })
          );
      } else {
          console.log('[Thunk/Calc&Import V2] --- START --- No existing Plate tree found.');
      }
      // ------------------------------------------------------------

      // 1. Calculate the basic structure for the new item
      console.log(`[Thunk/Calc&Import V2] Calculating base tree for ${selectedItem}...`);
      const calculatedNewTree = await calculateDependencyTree(
        selectedItem, 
        0, // Start with 0 amount, let excess/imports drive it later?
           // Or should we pass an initial amount? Let's start with 0.
        selectedRecipeId, 
        {}, // Empty recipe map for initial calculation
        0, // depth
        [], // affected branches
        "", // parentId
        {}, // excess map
        {}, // import map
        existingTrees // Pass existing trees for context during calculation (e.g., nested imports)
      );

      if (!calculatedNewTree) {
        throw new Error("Initial tree calculation failed");
      }

      // Assign a unique ID and essential root properties
      mainTreeId = generateTreeId(selectedItem);
      calculatedNewTree.uniqueId = mainTreeId;
      calculatedNewTree.isRoot = true;
      calculatedNewTree.depth = 0;
      // Ensure recipe is attached if calculateDependencyTree found it
      if (!calculatedNewTree.recipe) {
          const rootRecipe = await getRecipeByOutput(selectedRecipeId);
          calculatedNewTree.recipe = rootRecipe;
      } // Might need availableRecipes too?

      console.log(`[Thunk/Calc&Import V2] Calculated new tree structure with root ID: ${mainTreeId}`);

      // 2. Dispatch setDependencies for the new tree
      //    (Accumulated state is now handled within the reducer)
      console.log(`[Thunk/Calc&Import V2] Dispatching setDependencies for new main tree: ${mainTreeId}`);
      await dispatch(setDependencies({ treeId: mainTreeId, tree: calculatedNewTree }));
      console.log(`[Thunk/Calc&Import V2] setDependencies dispatched for ${mainTreeId}. Checking state...`);
      
      // Verify state immediately after setDependencies
      const stateAfterSetDep = getState();
      const addedTreeFromState = stateAfterSetDep.dependencies.dependencyTrees[mainTreeId];
      if (addedTreeFromState) {
          console.log(`[Thunk/Calc&Import V2] Verified tree ${mainTreeId} exists in state with ${addedTreeFromState.children?.length ?? 0} children before auto-import dispatch.`);
      } else {
          console.error(`[Thunk/Calc&Import V2] CRITICAL: Tree ${mainTreeId} NOT FOUND in state immediately after setDependencies!`);
      }

      // 3. Trigger Auto-Import for the children of the newly added tree
      console.log(`[Thunk/Calc&Import V2] >>>>> Dispatching autoImportNodeChildrenThunk for new root: ${mainTreeId}`);
      try {
        await dispatch(autoImportNodeChildrenThunk(mainTreeId));
        console.log(`[Thunk/Calc&Import V2] <<<<< Finished auto-import dispatch for ${mainTreeId}.`);
      } catch (err) {
        console.error(`[Thunk/Calc&Import V2] !!!!! Error during dispatch/execution of autoImportNodeChildrenThunk for ${mainTreeId}:`, err);
      }

      // 4. (Optional but Recommended) Recalculate amount for the main tree itself
      //    If it has excess applied via UI before full calculation
      console.log(`[Thunk/Calc&Import V2] Triggering final amount recalc for new root: ${mainTreeId}`);
      await dispatch(recalculateAndUpdateRootAmountThunk(mainTreeId));

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

      console.log(`[Thunk/Calc&Import V2] Finished adding item ${selectedItem}. Main Tree ID: ${mainTreeId}`);
      // The actual list of root IDs will now be whatever is in the state
      const finalState = getState();
      const finalRootIds = Object.keys(finalState.dependencies.dependencyTrees);
      
      // --- DEBUG: Log state of existing trees AFTER all updates --- 
      const finalExistingTrees = finalState.dependencies.dependencyTrees;
      console.log('[Thunk/Calc&Import V2] Final tree keys:', Object.keys(finalExistingTrees));
      const finalPlateTreeKey = Object.keys(finalExistingTrees).find(key => key.includes('iron-plate'));
      if (finalPlateTreeKey) {
          const finalPlateTree = finalExistingTrees[finalPlateTreeKey];
          console.log(`[Thunk/Calc&Import V2] --- END --- State of existing Plate tree (${finalPlateTreeKey}):`, 
             JSON.stringify({ amount: finalPlateTree.amount, excess: finalPlateTree.excess, recipe: finalPlateTree.recipe?.id, children: finalPlateTree.children?.length })
          );
      } else {
          console.log('[Thunk/Calc&Import V2] --- END --- No existing Plate tree found in final state.');
      }
      // -----------------------------------------------------------

      return { mainTreeId, newRootIds: finalRootIds };

    } catch (error) {
      console.error("[Thunk/Calc&Import V2] Error during simplified calculateAndAutoImportThunk:", error);
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
    console.log(`[Thunk/Destroy] Triggering dependency checks for ${childrenToCleanup.length} former children of ${nodeIdToDestroy}.`);
    for (const childNode of childrenToCleanup) {
      // Ensure childNode has a valid uniqueId before dispatching check
      if (childNode && childNode.uniqueId) {
         console.log(`[Thunk/Destroy] -> Checking child node: ${childNode.uniqueId} (Item: ${childNode.id})`);
         // --- FIX: Determine the actual root node to check --- 
         let nodeIdToActuallyCheck = childNode.uniqueId;
         const importRef = getImportReference(childNode);
         if (importRef?.targetTreeId) {
             nodeIdToActuallyCheck = importRef.targetTreeId;
             console.log(`[Thunk/Destroy] Child ${childNode.uniqueId} is an import. Checking target root ${nodeIdToActuallyCheck} instead.`);
         }
         // Check if the target is a root node before dispatching
         const targetNodeState = getState().dependencies.dependencyTrees[nodeIdToActuallyCheck];
         if (targetNodeState && targetNodeState.isRoot) {
             console.log(`[Thunk/Destroy] Dispatching requestDependencyCheckThunk for root: ${nodeIdToActuallyCheck}`);
             await dispatch(requestDependencyCheckThunk({ nodeIdToCheck: nodeIdToActuallyCheck, disconnectedConsumerId: nodeIdToDestroy }));
         } else {
             console.log(`[Thunk/Destroy] Target ${nodeIdToActuallyCheck} is not a root or not found. Skipping check.`);
         }
         // ---------------------------------------------------
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
    console.log(`[Thunk/Check] ===== Checking Node: ${nodeIdToCheck} (Disconnected Consumer: ${disconnectedConsumerId}) =====`);
    const state = getState();
    const nodeToCheck = state.dependencies.dependencyTrees[nodeIdToCheck];

    if (!nodeToCheck || !nodeToCheck.isRoot) { // Only check root nodes
      console.log(`[Thunk/Check] Node ${nodeToCheck} is not found or not a root. Skipping check.`);
      return;
    }

    let isStillNeeded = false;
    let reason = "";

    // 1. Check for manual excess
    if ((nodeToCheck.excess || 0) > 0) {
      console.log(`[Thunk/Check] -> Reason: Node ${nodeToCheck} has excess > 0.`);
      isStillNeeded = true;
      reason = "Has Excess";
    }

    // 2. Check for other importers
    if (!isStillNeeded) {
      console.log(`[Thunk/Check] -> Checking for other importers for ${nodeIdToCheck}...`);
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
              console.log(`[Thunk/Check] -> Reason: Still imported by ${node.uniqueId} in tree ${tree.uniqueId}.`);
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
           reason = "Has other importers";
           break; // Stop searching once one importer is found
         }
       }
       if (!isStillNeeded) {
         console.log(`[Thunk/Check] -> Reason: No excess and no other importers found.`);
         reason = "No demand";
       }
    }

    console.log(`[Thunk/Check] Determination for ${nodeIdToCheck}: Still Needed = ${isStillNeeded} (Reason: ${reason})`);

    if (isStillNeeded) {
      console.log(`[Thunk/Check] Node ${nodeIdToCheck} is still needed. Triggering amount recalculation.`);
      await dispatch(recalculateAndUpdateRootAmountThunk(nodeIdToCheck));
      console.log(`[Thunk/Check] Dispatched recalculateAndUpdateRootAmountThunk for ${nodeIdToCheck}.`);
    } else {
      console.log(`[Thunk/Check] Node ${nodeIdToCheck} is no longer needed. Triggering destruction.`);
      await dispatch(destroyNodeRecursiveThunk(nodeIdToCheck));
      console.log(`[Thunk/Check] Dispatched destroyNodeRecursiveThunk for ${nodeIdToCheck}.`);
    }
     console.log(`[Thunk/Check] ===== Finished Check for Node: ${nodeIdToCheck} =====`);
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
    // console.log(`[Thunk] checkAndConvertNodeTypeThunk called for ${targetTreeId}`);
    const state = getState();
    const targetNode = state.dependencies.dependencyTrees[targetTreeId];

    if (!targetNode || !targetNode.isRoot) {
      // console.log(`[Thunk] Node ${targetTreeId} not found or not a root node.`);
      return undefined; // Return undefined if no action taken
    }

    // --- Scenario 1: Convert Byproduct to Normal --- 
    if (targetNode.isByproduct && targetNode.amount > 0) { 
      console.log(`[Thunk/Convert B->N] Converting BYPRODUCT root ${targetTreeId} (amount: ${targetNode.amount}) to NORMAL.`);
      
      // Try to use cached recipe first, fall back to default recipe if needed
      let recipeToUse = nodeRecipeCache[targetTreeId];
      
      if (!recipeToUse) {
        // Fall back to default recipe if no cached recipe available
        const defaultRecipe = await getRecipeByOutput(targetNode.id);
        if (defaultRecipe) {
          recipeToUse = defaultRecipe;
          console.log(`[Thunk/Convert B->N] Using default recipe for ${targetTreeId} (no cache found): ${defaultRecipe.id}`);
        }
      } else {
        console.log(`[Thunk/Convert B->N] Using cached recipe for ${targetTreeId}: ${recipeToUse.id}`);
        // Remove from cache after using
        delete nodeRecipeCache[targetTreeId];
      }
      
      if (!recipeToUse) {
        console.error(`[Thunk/Convert B->N] No recipe (cached or default) found for item ${targetNode.id}. Cannot convert byproduct.`);
        return undefined; // Return undefined on failure
      }
      
      // Validate that the recipe has an ID to avoid Redux state issues
      if (!recipeToUse.id) {
        console.error(`[Thunk/Convert B->N] Recipe for ${targetTreeId} has no ID property. Cannot convert byproduct.`);
        return undefined;
      }
      
      // --- STEP 1: Update node properties (isByproduct, recipe) --- 
      console.log(`[Thunk/Convert B->N] Applying state change (recipe, isByproduct) for ${targetTreeId}.`);
      const initialUpdateData: Partial<DependencyNode> = {
        isByproduct: false,
        recipe: recipeToUse,
      };
      await dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: initialUpdateData }));
      console.log(`[Thunk/Convert B->N] Dispatched initial update for ${targetTreeId}.`);
      
      // --- STEP 2: Calculate and set children --- 
      try {
        console.log(`[Thunk/Convert B->N] Calculating new children for ${targetTreeId} using recipe ${recipeToUse.id}`);
        const stateAfterUpdate = getState(); // Get the state *after* recipe update
        const recipeSelections = stateAfterUpdate.recipeSelections.selections;
        const dependencyTrees = stateAfterUpdate.dependencies.dependencyTrees;
        
        // Get the updated node state to use the correct amount for calculation
        const updatedNodeState = stateAfterUpdate.dependencies.dependencyTrees[targetTreeId];
        if (!updatedNodeState) {
           console.error(`[Thunk/Convert B->N] Node ${targetTreeId} not found in state after initial update. Cannot calculate children.`);
           throw new Error(`Node ${targetTreeId} disappeared after initial update.`);
        }

        // Calculate *only* the children based on the recipe
        const calculatedNode = await calculateDependencyTree(
          updatedNodeState.id, 
          updatedNodeState.amount, // Use the node's *current* amount after potential update
          recipeToUse.id, // Pass the correct recipe ID
          recipeSelections, 
          0, // Depth calculation might need adjustment if this isn't root
          [], // No affected branches needed for this specific recalculation
          "", // No parent ID for root node calculation
          {}, // Excess map might not be needed here, assuming root node calculation
          {}, // Empty import map
          dependencyTrees // Pass existing trees for context
        );
        
        const newChildren = calculatedNode.children || [];
        console.log(`[Thunk/Convert B->N] Calculated ${newChildren.length} children.`);
        
        // Dispatch another update to set the children
        await dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: { children: newChildren } }));
        console.log(`[Thunk/Convert B->N] Dispatched children update for ${targetTreeId}.`);
        
        // --- STEP 3: Trigger auto-import for the new children --- 
        console.log(`[Thunk/Convert B->N] Dispatching autoImportNodeChildrenThunk for parent ${targetTreeId}.`);
        await dispatch(autoImportNodeChildrenThunk(targetTreeId));
        console.log(`[Thunk/Convert B->N] Finished auto-import dispatch for ${targetTreeId}.`);
        
      } catch (error) {
        console.error(`[Thunk/Convert B->N] Error during children calculation/update or auto-import dispatch for ${targetTreeId}:`, error);
        // Continue even if children update/import failed - we still converted the node
      }
      
      // Return the ID of the converted node
      return targetTreeId; 
      // --- End Revised Recalculation ---
    } 
    // --- Scenario 2: Convert Normal to Byproduct --- 
    else if (!targetNode.isByproduct && targetNode.amount < 0) {
      console.log(`[Thunk/Convert] Converting NORMAL root ${targetTreeId} (amount: ${targetNode.amount}) to BYPRODUCT.`);

      // Store the recipe in the cache before clearing it
      if (targetNode.recipe) {
        console.log(`[Thunk/Convert] Caching recipe ${targetNode.recipe.id} for ${targetTreeId} for potential future B->N conversion.`);
        nodeRecipeCache[targetTreeId] = targetNode.recipe;
      }

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
      // No specific return value needed here, as the side effect is the check dispatch
      return undefined; // Return undefined as no B->N conversion happened
    } 
    // --- Scenario 3: No Conversion Needed --- 
    else {
      // console.log(`[Thunk] Node ${targetTreeId} type does not need conversion (isByproduct: ${targetNode.isByproduct}, amount: ${targetNode.amount}).`);
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

// --- THUNK TO APPLY AUTO-IMPORT TO CHILDREN --- 
export const autoImportNodeChildrenThunk = createAsyncThunk<
  void,
  string, // parentNodeId
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/autoImportNodeChildren',
  async (parentNodeId, { getState, dispatch }) => {
    console.log(`[Thunk/AutoImportChildren] ***** EXECUTION STARTED for parent: ${parentNodeId} *****`);
    const state = getState();
    const parentNode = state.dependencies.dependencyTrees[parentNodeId];

    if (!parentNode) {
      console.error(`[Thunk/AutoImportChildren] Parent node ${parentNodeId} not found.`);
      return;
    }

    if (!parentNode.children || parentNode.children.length === 0) {
      console.log(`[Thunk/AutoImportChildren] Parent node ${parentNodeId} has no children to process.`);
      return;
    }

    const childrenToProcess = [...parentNode.children]; // Work on a copy
    let childrenModified = false;

    // Need a local way to generate IDs if new roots are needed
    const generateTreeId = (itemId: string) => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000000);
      return `tree-${itemId}-${timestamp}-${randomSuffix}`;
    };

    for (const child of childrenToProcess) {
      // Skip if already an import or has a reference
      if (child.isImport || child.importReference) {
        console.log(`[Thunk/AutoImportChildren] Skipping already imported child ${child.uniqueId}`);
        continue;
      }
      
      console.log(`[Thunk/AutoImportChildren] Processing child ${child.uniqueId} (Item: ${child.id}, isByproduct: ${!!child.isByproduct})`);
      let targetTreeId: string | null = null;
      let existingRootFound = false;
      
      // --- Handle Byproduct Children --- 
      if (child.isByproduct) {
          console.log(`[Thunk/AutoImportChildren] Child ${child.uniqueId} is a Byproduct.`);
          // 1a. Find ANY Existing Root (Normal or Byproduct)
          const existingRoot = Object.values(getState().dependencies.dependencyTrees).find(
              t => t.isRoot && t.id === child.id
          );
          if (existingRoot) {
              targetTreeId = existingRoot.uniqueId;
              existingRootFound = true;
              console.log(`[Thunk/AutoImportChildren] Found existing ${existingRoot.isByproduct ? 'BYPRODUCT' : 'NORMAL'} root ${targetTreeId} for byproduct item ${child.id}`);
          }
          
          // 2a. Create New BYPRODUCT Root if None Found
          if (!existingRootFound) {
              console.log(`[Thunk/AutoImportChildren] No existing root found for byproduct ${child.id}. Creating new BYPRODUCT root.`);
              const newRootId = generateTreeId(child.id);
              try {
                  // Create a minimal BYPRODUCT root structure
                  const newRootNode: DependencyNode = {
                      id: child.id,
                      uniqueId: newRootId,
                      amount: 0, // Byproduct roots start at 0, driven by input links
                      isRoot: true,
                      isByproduct: true, // Mark as byproduct root
                      recipe: undefined, // Byproduct roots don't produce via recipe
                      children: [], 
                      depth: 0, 
                      // availableRecipes: await getRecipesForItem(child.id), // Maybe not needed for byproduct roots?
                  };
                  
                  await dispatch(setDependencies({ treeId: newRootId, tree: newRootNode }));
                  console.log(`[Thunk/AutoImportChildren] Dispatched setDependencies for new BYPRODUCT root ${newRootId}`);
                  
                  // Verify it exists
                  const stateAfterRootCreation = getState();
                  if (!stateAfterRootCreation.dependencies.dependencyTrees[newRootId]) {
                      throw new Error(`New byproduct root ${newRootId} not found after dispatch.`);
                  }
                  console.log(`[Thunk/AutoImportChildren] Verified new BYPRODUCT root ${newRootId} exists in state.`);
                  targetTreeId = newRootId;
                  // No recursive call needed for byproduct roots as they have no recipe children
              } catch (error) {
                  console.error(`[Thunk/AutoImportChildren] Failed to create new BYPRODUCT root for ${child.id}:`, error);
                  continue; // Skip this child if root creation failed
              }
          }
      } 
      // --- Handle Normal Children --- 
      else { 
          console.log(`[Thunk/AutoImportChildren] Child ${child.uniqueId} is Normal.`);
          // 1b. Find Existing NORMAL Root
          const existingNormalRoot = Object.values(getState().dependencies.dependencyTrees).find(
            t => t.isRoot && t.id === child.id && !t.isByproduct
          );
          if (existingNormalRoot) {
            targetTreeId = existingNormalRoot.uniqueId;
            existingRootFound = true;
            console.log(`[Thunk/AutoImportChildren] Found existing NORMAL root ${targetTreeId} for item ${child.id}`);
          } else {
            // 2b. No NORMAL root, check for EXISTING BYPRODUCT root
            console.log(`[Thunk/AutoImportChildren] No NORMAL root found for ${child.id}. Checking for existing BYPRODUCT root...`);
            const existingByproductRoot = Object.values(getState().dependencies.dependencyTrees).find(
              t => t.isRoot && t.id === child.id && t.isByproduct
            );
            
            if (existingByproductRoot) {
                // 3b. Found BYPRODUCT root -> Convert it to NORMAL
                console.log(`[Thunk/AutoImportChildren] Found existing BYPRODUCT root ${existingByproductRoot.uniqueId}. Triggering B->N conversion.`);
                try {
                    // We need to wait for the conversion to fully complete, including its own child processing
                    await dispatch(checkAndConvertNodeTypeThunk(existingByproductRoot.uniqueId));
                    console.log(`[Thunk/AutoImportChildren] Conversion B->N for ${existingByproductRoot.uniqueId} should be complete. Using this as target.`);
                    targetTreeId = existingByproductRoot.uniqueId; // Use the ID of the (now converted) node
                    existingRootFound = true;
                } catch (error) {
                    console.error(`[Thunk/AutoImportChildren] Error during B->N conversion dispatch for ${existingByproductRoot.uniqueId}:`, error);
                    // If conversion fails, maybe we should stop? Or try creating a new normal one?
                    // For now, let's stop processing this child if conversion fails.
                    continue;
                }
            }
          }
          
          // 4b. Create New NORMAL Root if STILL None Found
          if (!existingRootFound) {
              console.log(`[Thunk/AutoImportChildren] No existing root (Normal or Byproduct) found for ${child.id}. Creating new NORMAL root.`);
              const newRootId = generateTreeId(child.id);
              try {
                  // Create a minimal NORMAL root structure
                  const defaultRecipe = await getRecipeByOutput(child.id);
                  const newRootNode: DependencyNode = {
                      id: child.id, uniqueId: newRootId, amount: 0, isRoot: true,
                      recipe: defaultRecipe, children: [], depth: 0, 
                      availableRecipes: defaultRecipe ? [defaultRecipe] : await getRecipesForItem(child.id),
                  };
                  await dispatch(setDependencies({ treeId: newRootId, tree: newRootNode }));
                  console.log(`[Thunk/AutoImportChildren] Dispatched setDependencies for new NORMAL root ${newRootId}`);
                  const stateAfterRootCreation = getState();
                  if (!stateAfterRootCreation.dependencies.dependencyTrees[newRootId]) {
                      throw new Error(`New normal root ${newRootId} not found after dispatch.`);
                  }
                  console.log(`[Thunk/AutoImportChildren] Verified new NORMAL root ${newRootId} exists in state.`);
                  console.log(`[Thunk/AutoImportChildren] Calculating children for new root ${newRootId}`);
                  const stateForChildCalc = getState();
                  const calculatedRootChildren = await calculateDependencyTree(
                    newRootNode.id, 0, newRootNode.recipe?.id || null, 
                    stateForChildCalc.recipeSelections.selections, 
                    0, [], "", {}, {}, stateForChildCalc.dependencies.dependencyTrees
                  ).then(node => node.children || []);
                  if (calculatedRootChildren.length > 0) {
                      console.log(`[Thunk/AutoImportChildren] Found ${calculatedRootChildren.length} children for new root ${newRootId}. Dispatching update.`);
                      await dispatch(updateNodeProperties({ nodeId: newRootId, updatedNode: { children: calculatedRootChildren }}));
                  } else {
                      console.log(`[Thunk/AutoImportChildren] New root ${newRootId} has no calculated children.`);
                  }
                  targetTreeId = newRootId;
                  console.log(`[Thunk/AutoImportChildren] >>>>> Dispatching RECURSIVE autoImportNodeChildrenThunk for new NORMAL root ${newRootId}`);
                  await dispatch(autoImportNodeChildrenThunk(newRootId));
                  console.log(`[Thunk/AutoImportChildren] <<<<< Finished RECURSIVE auto-import dispatch for ${newRootId}.`);
              } catch (error) {
                  console.error(`[Thunk/AutoImportChildren] Failed to create new NORMAL root or process its children for ${child.id}:`, error);
                  continue; 
              }
          }
      }

      // 3. Set Import Reference (Common Logic for Both Byproduct & Normal Children)
      if (targetTreeId) {
        console.log(`[Thunk/AutoImportChildren] Dispatching setNodeAsImportThunk for child ${child.uniqueId} -> target ${targetTreeId}`);
        await dispatch(setNodeAsImportThunk({ childNodeId: child.uniqueId, targetRootId: targetTreeId }));
        childrenModified = true;
      }
    }
    
    if (childrenModified) {
        console.log(`[Thunk/AutoImportChildren] Finished processing children for ${parentNodeId}. Some children were converted to imports.`);
    } else {
        console.log(`[Thunk/AutoImportChildren] Finished processing children for ${parentNodeId}. No changes needed.`);
    }
  }
); 

// --- THUNK TO RECALCULATE AND UPDATE ROOT NODE AMOUNT --- 
export const recalculateAndUpdateRootAmountThunk = createAsyncThunk<
  void, // No specific return value needed, side effect is dispatching update
  string, // rootNodeId to recalculate
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/recalculateAndUpdateRootAmount',
  async (rootNodeId, { getState, dispatch }) => {
    console.log(`[Thunk/RecalcAmount] ===== Recalculating Amount for Root: ${rootNodeId} =====`);
    const state = getState();
    const rootNode = state.dependencies.dependencyTrees[rootNodeId];

    if (!rootNode) {
      console.warn(`[Thunk/RecalcAmount] Root node ${rootNodeId} not found. Skipping recalculation.`);
      return;
    }
    
    if (!rootNode.isRoot) {
        console.warn(`[Thunk/RecalcAmount] Node ${rootNodeId} is not a root node. Skipping recalculation.`);
        return;
    }

    let newRequiredAmount = 0;
    const initialAmount = rootNode.amount;
    
    // 1. Add manual excess first
    const excessAmount = rootNode.excess || 0;
    newRequiredAmount += excessAmount;
    console.log(`[Thunk/RecalcAmount] -> Starting amount: ${newRequiredAmount} (from excess: ${excessAmount})`);

    // 2. Find all current importers and sum their demands
    console.log(`[Thunk/RecalcAmount] Finding importers for ${rootNodeId}...`);
    for (const tree of Object.values(state.dependencies.dependencyTrees)) {
        const findDemand = (node: DependencyNode): number => {
            let demand = 0;
            const importRef = getImportReference(node);
            if (importRef?.targetTreeId === rootNodeId) {
                // Use the amount of the node that is *importing*
                console.log(`[Thunk/RecalcAmount]   - Found importer: ${node.uniqueId} (Amount: ${node.amount || 0}) in tree ${tree.uniqueId}`);
                demand += node.amount || 0; 
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

    console.log(`[Thunk/RecalcAmount] -> Final Calculated Amount: ${newRequiredAmount}. (Current State Amount: ${initialAmount})`);

    // 3. Dispatch update only if the amount has changed
    if (initialAmount !== newRequiredAmount) {
        console.log(`[Thunk/RecalcAmount] -> Amount CHANGE detected (${initialAmount} !== ${newRequiredAmount}). Dispatching update.`);
        await dispatch(updateNodeProperties({
            nodeId: rootNodeId, 
            updatedNode: { amount: newRequiredAmount }
        }));
        console.log(`[Thunk/RecalcAmount] -> Dispatched updateNodeProperties.`);
        
        // IMPORTANT: After updating amount, we might need to re-check the node type
        // Example: Amount became negative -> Convert to Byproduct
        // Example: Byproduct amount became positive -> Convert to Normal
        console.log(`[Thunk/RecalcAmount] -> Re-checking node type for ${rootNodeId} after amount update.`);
        await dispatch(checkAndConvertNodeTypeThunk(rootNodeId)); 

    } else {
        console.log(`[Thunk/RecalcAmount] -> Amount UNCHANGED. No update needed.`);
    }
    console.log(`[Thunk/RecalcAmount] ===== Finished Amount Recalculation for Root: ${rootNodeId} =====`);
  }
); 

// --- THUNK TO SET A NODE AS AN IMPORT AND UPDATE TARGET AMOUNT --- 
interface SetNodeAsImportArgs {
  childNodeId: string;
  targetRootId: string;
}

export const setNodeAsImportThunk = createAsyncThunk<
  void,
  SetNodeAsImportArgs,
  { dispatch: AppDispatch; state: RootState }
>(
  'dependency/setNodeAsImport',
  async ({ childNodeId, targetRootId }, { getState, dispatch }) => {
    console.log(`[Thunk/SetImport] Setting node ${childNodeId} to import from ${targetRootId}`);

    // 1. Get current state to verify nodes exist (optional, but good practice)
    const state = getState();
    // We need to find the child node. This requires iterating or a lookup map.
    // For now, assume updateNodeProperties can find it by uniqueId across trees.
    const targetRootNode = state.dependencies.dependencyTrees[targetRootId];
    
    if (!targetRootNode) {
        console.error(`[Thunk/SetImport] Target root node ${targetRootId} not found. Aborting.`);
        return;
    }

    // 2. Dispatch update for the child node
    const updatePayload: Partial<DependencyNode> = {
      importReference: { targetTreeId: targetRootId, targetNodeId: targetRootId },
      isImport: true,
      children: [],
      recipe: undefined
    };
    
    try {
        await dispatch(updateNodeProperties({ nodeId: childNodeId, updatedNode: updatePayload }));
        console.log(`[Thunk/SetImport] Dispatched updateNodeProperties for child ${childNodeId}.`);
    } catch (error) {
        console.error(`[Thunk/SetImport] Error dispatching update for child ${childNodeId}:`, error);
        // Decide if we should still proceed with amount recalc
        return; // Maybe stop here if child update failed
    }

    // 3. Trigger amount recalculation for the target root
    console.log(`[Thunk/SetImport] Triggering amount recalculation for target root ${targetRootId}`);
    try {
        await dispatch(recalculateAndUpdateRootAmountThunk(targetRootId));
        console.log(`[Thunk/SetImport] Finished amount recalculation dispatch for ${targetRootId}.`);
    } catch (error) {
        console.error(`[Thunk/SetImport] Error dispatching amount recalculation for ${targetRootId}:`, error);
    }
  }
); 