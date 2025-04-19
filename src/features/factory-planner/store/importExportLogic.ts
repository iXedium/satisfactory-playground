/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { findNodeConsumers, ConsumerInfo } from '../../../utils/consumptionUtils';

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

    // 
    let mainTreeId: string | null = null;

    try {
      const state = getState();
      const existingTrees = state.dependencies.dependencyTrees;
      

      // 1. Calculate the basic structure for the new item
      // 
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
          // console.error(`[Thunk/Calc&Import V2] CRITICAL: Tree ${mainTreeId} NOT FOUND in state immediately after setDependencies!`);
          // Still log critical errors
           console.error(`[Thunk/Calc&Import V2] CRITICAL: Tree ${mainTreeId} NOT FOUND in state immediately after setDependencies!`);
      }

      // 3. Trigger Auto-Import for the children of the newly added tree
      // 
      try {
        await dispatch(autoImportNodeChildrenThunk(mainTreeId));
        // 
      } catch (err) {
        // Still log errors during dispatch
        console.error(`[Thunk/Calc&Import V2] !!!!! Error during dispatch/execution of autoImportNodeChildrenThunk for ${mainTreeId}:`, err);
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
    const stateBeforeDelete = getState();
    const allTrees = stateBeforeDelete.dependencies.dependencyTrees;
    const nodeToDestroy = allTrees[nodeIdToDestroy];

    if (!nodeToDestroy) {
      // console.log(`[Thunk/Destroy V2] Node ${nodeIdToDestroy} not found. Skipping.`);
      return;
    }

    // console.log(`[Thunk/Destroy V2] Starting destruction for ${nodeIdToDestroy}`);

    // 1. Find nodes importing from this node BEFORE deleting it
    // console.log(`[Thunk/Destroy V2] Finding nodes importing from ${nodeIdToDestroy}...`);
    const nodesToUnimport = await findNodeConsumers(nodeIdToDestroy, allTrees); 
    // console.log(`[Thunk/Destroy V2] Found ${nodesToUnimport.length} nodes to unimport.`);

    // 2. Store original children BEFORE deleting
    const originalChildren = [...(nodeToDestroy.children || [])];
    // console.log(`[Thunk/Destroy V2] Stored ${originalChildren.length} original children.`);

    // 3. Trigger UNIMPORT for nodes that were importing *FROM* the node being deleted
    //    Do this BEFORE deleting the node so the unimport logic can access its recipe.
    // console.log(`[Thunk/Destroy V2] Dispatching unimport for ${nodesToUnimport.length} consumers...`);
    const unimportPromises = nodesToUnimport.map(consumerInfo => 
        dispatch(unimportNodeThunk(consumerInfo.consumerNodeId))
    );
    // Wait for unimports to potentially finish their state updates? Might not be strictly necessary
    // await Promise.all(unimportPromises); 
    // Let's try dispatching without waiting first.

    // 4. Dispatch synchronous action to remove the node from state
    // console.log(`[Thunk/Destroy V2] Dispatching removeNodeAction for ${nodeIdToDestroy}.`);
    dispatch(removeNodeAction(nodeIdToDestroy));

    // 5. Trigger dependency checks for the ORIGINAL children of the now-deleted node
    // console.log(`[Thunk/Destroy V2] Triggering dependency checks for ${originalChildren.length} original children...`);
    for (const childNode of originalChildren) {
      if (childNode && childNode.uniqueId) {
          // Determine the actual root node to check (could be the child itself or its import target)
          let nodeIdToActuallyCheck = childNode.uniqueId;
          const importRef = getImportReference(childNode); // Check if the child was an import
          if (importRef?.targetTreeId) { 
              nodeIdToActuallyCheck = importRef.targetTreeId;
              // console.log(`[Thunk/Destroy V2] Original child ${childNode.uniqueId} is an import. Checking its target root ${nodeIdToActuallyCheck}.`);
          }
          
          // Check if the target root still exists in the *current* state (after deletion)
          const targetNodeState = getState().dependencies.dependencyTrees[nodeIdToActuallyCheck];
          if (targetNodeState && targetNodeState.isRoot) {
              // console.log(`[Thunk/Destroy V2] Dispatching requestDependencyCheckThunk for original child's target: ${nodeIdToActuallyCheck}`);
              // Use await here as these checks might trigger further destructions/unimports
              await dispatch(requestDependencyCheckThunk({ nodeIdToCheck: nodeIdToActuallyCheck, disconnectedConsumerId: nodeIdToDestroy }));
      } else {
              // console.log(`[Thunk/Destroy V2] Target ${nodeIdToActuallyCheck} for original child ${childNode.uniqueId} no longer exists or isn't a root. Skipping check.`);
      }
      } else {
         // Still log warnings for unexpected data
         console.warn(`[Thunk/Destroy V2] Invalid original child node structure found while cleaning up ${nodeIdToDestroy}. Skipping check.`);
    }
    }
    
    // console.log(`[Thunk/Destroy V2] Finished destroying node: ${nodeIdToDestroy}`);
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
        console.error(`[Thunk/Convert B->N] No recipe (cached or default) found for item ${targetNode.id}. Cannot convert byproduct.`);
        return undefined; // Return undefined on failure
      }
      
      // Validate that the recipe has an ID to avoid Redux state issues
      if (!recipeToUse.id) {
        // Still log errors
        console.error(`[Thunk/Convert B->N] Recipe for ${targetTreeId} has no ID property. Cannot convert byproduct.`);
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
        
        // Dispatch another update to set the children
        await dispatch(updateNodeProperties({ nodeId: targetTreeId, updatedNode: { children: newChildren } }));
        
        // --- STEP 3: Trigger auto-import for the new children --- 
        await dispatch(autoImportNodeChildrenThunk(targetTreeId));
        
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
      // Store the recipe in the cache before clearing it
      if (targetNode.recipe) {
        // console.log(`[Thunk/Convert] Caching recipe ${targetNode.recipe.id} for ${targetTreeId} for potential future B->N conversion.`);
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
             console.warn(`[Thunk/Convert] Invalid child node structure found while cleaning up ${targetTreeId}. Skipping check.`);
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
    const state = getState();
    const parentNode = state.dependencies.dependencyTrees[parentNodeId];

    if (!parentNode) {
      console.error(`[Thunk/AutoImportChildren] Parent node ${parentNodeId} not found.`);
      return;
    }

    if (!parentNode.children || parentNode.children.length === 0) {
      return;
    }

    const childrenToProcess = parentNode.children ? [...parentNode.children] : []; // Safer copy
    // let childrenModified = false; // Removed - no longer assigned

    // Need a local way to generate IDs if new roots are needed
    const generateTreeId = (itemId: string) => {
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000000);
      return `tree-${itemId}-${timestamp}-${randomSuffix}`;
    };

    for (const child of childrenToProcess) {
      // Skip if already an import or has a reference
      if (child.isImport || child.importReference) {
        continue;
      }
      
      let targetTreeId: string | null = null;
      let existingRootFound = false;
      
      // --- Handle Byproduct Children --- 
      if (child.isByproduct) {
          // 1a. Find ANY Existing Root (Normal or Byproduct)
          const existingRoot = Object.values(getState().dependencies.dependencyTrees).find(
              t => t.isRoot && t.id === child.id
          );
          if (existingRoot) {
              targetTreeId = existingRoot.uniqueId;
              existingRootFound = true;
          }
          
          // 2a. Create New BYPRODUCT Root if None Found
          if (!existingRootFound) {
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
                  
                  // Verify it exists
                  const stateAfterRootCreation = getState();
                  if (!stateAfterRootCreation.dependencies.dependencyTrees[newRootId]) {
                      throw new Error(`New byproduct root ${newRootId} not found after dispatch.`);
                  }
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
          // 1b. Find Existing NORMAL Root
          const existingNormalRoot = Object.values(getState().dependencies.dependencyTrees).find(
            t => t.isRoot && t.id === child.id && !t.isByproduct
          );
          if (existingNormalRoot) {
            targetTreeId = existingNormalRoot.uniqueId;
            existingRootFound = true;
          } else {
            // 2b. No NORMAL root, check for EXISTING BYPRODUCT root
            const existingByproductRoot = Object.values(getState().dependencies.dependencyTrees).find(
              t => t.isRoot && t.id === child.id && t.isByproduct
            );
            
            if (existingByproductRoot) {
                // 3b. Found BYPRODUCT root -> Convert it to NORMAL
                try {
                    // We need to wait for the conversion to fully complete, including its own child processing
                    await dispatch(checkAndConvertNodeTypeThunk(existingByproductRoot.uniqueId));
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
              const newRootId = generateTreeId(child.id);
              try {
                  // 1. Create node structure (amount starts at 0)
                  const defaultRecipe = await getRecipeByOutput(child.id);
                  const newRootNode: DependencyNode = {
                      id: child.id, uniqueId: newRootId, amount: 0, isRoot: true,
                      recipe: defaultRecipe, children: [], depth: 0, 
                      availableRecipes: defaultRecipe ? [defaultRecipe] : await getRecipesForItem(child.id),
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
                      console.error(`New root ${newRootId} disappeared after initial link/recalc.`); // Simplified error
                      throw new Error(`New root ${newRootId} disappeared after initial link/recalc.`);
                  }
                  
                  // 5. Get the correct demand for children
                  const demandForChildren = updatedNewRootNode.amount;

                  // 6. Calculate children using the correct demand
                  const calculatedChildren = await calculateDependencyTree(
                    updatedNewRootNode.id, 
                    demandForChildren, // <<< Use the correct demand
                    updatedNewRootNode.recipe?.id || null, 
                    stateAfterLinkAndRecalc.recipeSelections.selections, // Use latest selections
                    0, [], "", {}, {}, 
                    stateAfterLinkAndRecalc.dependencies.dependencyTrees // Pass latest trees
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
                  // Still log errors
                  console.error(`[Thunk/AICN V4] Failed to create new NORMAL root or process its children for ${child.id}:`, error);
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
    
    // 1. Add manual excess first
    const excessAmount = rootNode.excess || 0;
    newRequiredAmount += excessAmount;

    // 2. Find all current importers and sum their demands
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


    // 3. Dispatch update only if the amount has changed
    if (Math.abs(initialAmount - newRequiredAmount) > 1e-9) { // Use threshold for float comparison
        await dispatch(updateNodeProperties({
            nodeId: rootNodeId, 
            updatedNode: { amount: newRequiredAmount }
        }));
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
        console.error(`[Thunk/SetImport] Target root node ${targetRootId} not found. Aborting.`);
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
        console.error(`[Thunk/SetImport] Error dispatching update for child ${childNodeId}:`, error);
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
        console.error(`[Thunk/SetImport] Error dispatching amount recalculation for ${targetRootId}:`, error);
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
    // console.log(`[Thunk/Unimport] Request to unimport node: ${nodeIdToUnimport}`);
    const state = getState();
    const trees = state.dependencies.dependencyTrees;
    const recipeSelections = state.recipeSelections.selections;
    
    // 1. Find the node to unimport and its context
    const nodeInfo = findNodeInAnyTree(trees, nodeIdToUnimport);
    if (!nodeInfo) {
      console.warn(`[Thunk/Unimport] Node ${nodeIdToUnimport} not found.`);
      return;
    }
    const { node: nodeToUnimport, parentTreeId } = nodeInfo;
    
    // 2. Verify it's actually an import
    const importRef = getImportReference(nodeToUnimport);
    if (!importRef || !importRef.targetTreeId) {
      // console.log(`[Thunk/Unimport] Node ${nodeIdToUnimport} is not an import. Skipping.`);
      return;
    }
    const targetTreeId = importRef.targetTreeId;
    const targetNode = trees[targetTreeId]; // Get the target node state

    if (!targetNode) {
      console.error(`[Thunk/Unimport] Target node ${targetTreeId} not found.`);
      return;
    }

    // 3. Determine the recipe to restore FROM THE TARGET NODE
    let recipeToRestore: Recipe | undefined = undefined; 
    if (targetNode.recipe) { 
      recipeToRestore = targetNode.recipe;
      // console.log(`[Thunk/Unimport] Restoring recipe ${recipeToRestore.id} from target ${targetTreeId}`);
    } else {
      // Fallback: If target had no recipe (should be rare for normal nodes), 
      // use default for the *unimporting* node's item ID as a safety net.
      console.warn(`[Thunk/Unimport] Target node ${targetTreeId} had no recipe. Falling back to default for item ${nodeToUnimport.id}.`);
      try {
        const fetchedRecipe = await getRecipeByOutput(nodeToUnimport.id);
        recipeToRestore = fetchedRecipe || undefined;
        if (!recipeToRestore) {
           console.error(`[Thunk/Unimport] Fallback failed: No default recipe found for item ${nodeToUnimport.id}. Cannot restore chain.`);
           return; 
        }
      } catch (error) {
        console.error(`[Thunk/Unimport] Error fetching fallback default recipe for ${nodeToUnimport.id}:`, error);
        return;
      }
    }

    // 4. Calculate new children based on restored recipe and current amount
    let newChildren: DependencyNode[] = [];
    if (recipeToRestore) {
      try {
        // <<< ADD LOGGING HERE >>>
        console.log(`[Thunk/Unimport DEBUG] Calculating children for ${nodeIdToUnimport} (Item: ${nodeToUnimport.id})`);
        console.log(`  - Amount: ${nodeToUnimport.amount}`);
        console.log(`  - Depth: ${nodeToUnimport.depth ?? 0}`);
        console.log(`  - Recipe ID: ${recipeToRestore.id}`);
        // console.log(`  - Recipe Selections:`, recipeSelections); // Potentially verbose
        // console.log(`  - Trees Context:`, trees); // Very verbose
        
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
          trees 
        );
        newChildren = calculatedNode?.children || [];
        
        // <<< ADD LOGGING HERE >>>
        console.log(`[Thunk/Unimport DEBUG] Calculation Result for ${nodeIdToUnimport}:`);
        console.log(`  - Calculated Node:`, calculatedNode); // Log the whole node
        console.log(`  - New Children Count: ${newChildren.length}`);
        if (newChildren.length > 0) {
           console.log(`  - First Child:`, newChildren[0]);
        }
        // <<< END LOGGING >>>

      } catch (error) {
        console.error(`[Thunk/Unimport] Error calculating children for ${nodeIdToUnimport}:`, error);
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
    // console.log(`[Thunk/Unimport] Dispatching updateNodeProperties for ${nodeIdToUnimport}`);
    await dispatch(updateNodeProperties({ nodeId: nodeIdToUnimport, updatedNode: updatePayload }));

    // <<< ADD LOGGING HERE >>>
    const stateAfterUpdate = getState();
    const updatedNodeInfo = findNodeInAnyTree(stateAfterUpdate.dependencies.dependencyTrees, nodeIdToUnimport);
    console.log(`[Thunk/Unimport DEBUG] State after updateNodeProperties for ${nodeIdToUnimport}:`);
    if (updatedNodeInfo) {
        console.log(`  - Found Node:`, updatedNodeInfo.node);
        console.log(`  - Node Children Count: ${updatedNodeInfo.node.children?.length ?? 0}`);
        if ((updatedNodeInfo.node.children?.length ?? 0) > 0) {
            console.log(`  - First Child in State:`, updatedNodeInfo.node.children?.[0]);
        }
    } else {
        console.log(`  - Node ${nodeIdToUnimport} NOT FOUND in state after update!`);
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
      // console.log(`[Thunk/Unimport] Triggering auto-import for new children of ${nodeIdToUnimport}`);
      await dispatch(autoImportNodeChildrenThunk(nodeIdToUnimport));
    }
    */
    
    // console.log(`[Thunk/Unimport] Finished unimporting node: ${nodeIdToUnimport}`);
  }
); 

// --- THUNK TO SET A NODE AS AN IMPORT AND UPDATE TARGET AMOUNT ---