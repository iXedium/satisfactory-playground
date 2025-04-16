/* eslint-disable @typescript-eslint/no-unused-vars */
import { DependencyNode, Recipe } from "../types";
import { getRecipeById, getRecipeByOutput } from "../data";
import { setImportReference } from "./nodeReferenceUtils"; // Import setImportReference
// We need to import calculateDependencyTree to avoid circular dependency
// This might indicate a need for further refactoring later.
// For now, we use a dynamic import or pass it as an argument if needed.
// Let's assume calculateDependencyTree is available globally or passed for now.
// Alternatively, we could make storeOriginalChildren NOT rely on calculateDependencyTree
// if we can replicate its necessary logic without the full recursive call.

/* --- Remove unused placeholder --- 
declare var calculateDependencyTree: (
  itemId: string,
  amount: number,
  rootRecipeId: string | null,
  recipeMap?: Record<string, string>,
  depth?: number,
  affectedBranches?: any[],
  parentId?: string,
  excessMap?: Record<string, number>,
  importMap?: Record<string, any>,
  dependencyTrees?: Record<string, DependencyNode>
) => Promise<DependencyNode>;
*/

// Import the type for the creation function
import { CreateTreeFunction } from '../features/factory-planner/hooks/usePlannerTreeCalculation';

// Helper function to create consistent import nodes
export const createImportNode = async (
  existingImportNode: DependencyNode | null,
  itemId: string,
  amount: number,
  nodeId: string,
  excess: number,
  selectedRecipeId?: string,
  legacyTargetTreeId?: string, // Only used for legacy import system
  nodeWithReference?: DependencyNode // Node with reference from findNodeWithReference
): Promise<DependencyNode> => {
  const recipeObj = selectedRecipeId ? await getRecipeById(selectedRecipeId) : undefined;

  if (existingImportNode && existingImportNode.importReference) {
    // Preserve existing import reference and original children
    return {
      ...existingImportNode,
      id: itemId,
      amount: amount,
      uniqueId: nodeId,
      excess: excess,
      recipe: recipeObj,
      children: [], 
      isImport: true, 
      originalChildren: existingImportNode.originalChildren || await storeOriginalChildren(itemId, amount, excess, recipeObj),
      importReference: existingImportNode.importReference
    };
  }

  // If no existing node, calculate original children
  const originalChildren = await storeOriginalChildren(itemId, amount, excess, recipeObj);
  
  const isLegacy = !!legacyTargetTreeId;
  let importReference = { targetTreeId: '', targetNodeId: '' };

  if (isLegacy) {
    importReference = { targetTreeId: legacyTargetTreeId!, targetNodeId: '' }; // TargetNodeId corrected later
  } else if (nodeWithReference && nodeWithReference.importReference) {
    // If a node with a reference was found (likely from another tree), use its reference
    importReference = nodeWithReference.importReference;
  } else if (nodeWithReference) {
    // Fallback if nodeWithReference exists but lacks importReference (should be rare)
    // Construct reference based on nodeWithReference's uniqueId
    const parts = nodeWithReference.uniqueId.split('-');
    importReference = { targetTreeId: parts[0] || '', targetNodeId: nodeWithReference.uniqueId };
  }

  return {
    id: itemId,
    amount: amount,
    uniqueId: nodeId,
    excess: excess,
    recipe: recipeObj,
    children: [],
    isImport: true, // Keep for potential legacy compatibility
    originalChildren: originalChildren,
    importReference: importReference,
    ...(isLegacy && { importedFrom: legacyTargetTreeId }), // Add legacy prop only if relevant
  };
};

// Helper function to calculate and store the original children for an import node
export async function storeOriginalChildren(
  itemId: string,
  amount: number,
  excess: number = 0, 
  recipe?: Recipe
): Promise<DependencyNode[]> {
  if (!recipe) {
    recipe = await getRecipeByOutput(itemId); 
    if (!recipe) return [];
  }
  
  const outputAmount = recipe.out[itemId] ?? 1;
  // Avoid division by zero if outputAmount is somehow 0
  const cyclesNeeded = outputAmount > 0 ? (amount + excess) / outputAmount : 0;
  
  // Calculate children without using import references or further recursion depth
  // We need to construct the child nodes directly based on the recipe inputs
  const children: DependencyNode[] = [];
  for (const [inputItem, inputAmount] of Object.entries(recipe.in)) {
     const childAmount = (inputAmount ?? 0) * cyclesNeeded;
     // Create a simplified node structure representing the input requirement
     // We don't need a full recursive calculation here, just the direct inputs.
     // The uniqueId needs care - how to generate it without full parent context?
     // For now, use a simpler ID, assuming it's only for storage/comparison.
     children.push({
        id: inputItem,
        amount: childAmount,
        uniqueId: `original-${itemId}-${inputItem}`, // Simplified ID for stored children
        // Other properties like recipe, excess, etc., are not needed for stored children
        // availableRecipes, children, etc can be omitted or set to defaults
     });
  }

  // --- Original implementation using recursive calculateDependencyTree --- 
  // This creates a circular dependency and potentially recalculates too much.
  // Replaced with direct calculation above.
  /*
  const children = await Promise.all(
    Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
      calculateDependencyTree( // Problem: Circular dependency
        inputItem,
        (inputAmount ?? 0) * cyclesNeeded,
        null,
        {}, 0, [], '', {}, {}
      )
    )
  );
  */
  
  return children;
}

// Helper function to restore original children when unimporting
// This function seems self-contained and doesn't need calculateDependencyTree
export const restoreOriginalChildren = (
  nodeId: string, // ID of the node being restored
  currentAmount: number, // The amount the restored node now needs to produce
  originalChildren: DependencyNode[] // The stored original children
): DependencyNode[] => {
  console.log(`[RESTORE DEBUG] Restoring original children for node: ${nodeId}`);
  
  if (!originalChildren || originalChildren.length === 0) {
    console.log(`[RESTORE DEBUG] No original children found to restore`);
    return [];
  }
  
  console.log(`[RESTORE DEBUG] Current amount for propagation: ${currentAmount}`);
  
  // Create a deep clone to avoid mutating the stored original data
  const updatedChildren = JSON.parse(JSON.stringify(originalChildren)) as DependencyNode[];
  
  console.log(`[RESTORE DEBUG] Original children before updating amounts:`, updatedChildren.map(c => ({id: c.id, amount: c.amount})));
  
  // Calculate the total amount originally produced by the stored children
  // This represents the amount needed by the parent node when it *wasn't* imported.
  // let originalParentAmount = 0; // Removed unused variable
  // This requires knowing the original parent's recipe, which we don't have here.
  // We cannot reliably scale based on original children amounts alone.
  // Alternative: Scale based on the *ratio* of the original child amounts.
  
  const totalOriginalChildAmount = originalChildren.reduce((sum, child) => sum + (child.amount || 0), 0);

  updatedChildren.forEach((child: DependencyNode) => {
    const originalAmount = child.amount || 0;
    let newAmount = 0;
    if (totalOriginalChildAmount > 0) {
      // Scale based on proportion
      newAmount = (originalAmount / totalOriginalChildAmount) * currentAmount;
    } else if (updatedChildren.length > 0) {
      // If original amounts were zero, distribute current amount equally
      newAmount = currentAmount / updatedChildren.length;
    }
    
    // Assign potentially fractional amounts, maybe round later?
    child.amount = newAmount; 
    
    // Generate a new uniqueId for the restored child node
    // We need a parent context for a proper uniqueId. Pass parentId?
    // For now, use a placeholder format.
    child.uniqueId = `${nodeId}-restored-${child.id}`;

    // Crucially, restored children should NOT have import references
    delete child.isImport;
    delete child.importedFrom;
    delete child.importReference;
    delete child.originalChildren; // Avoid nesting originalChildren
    
    // Restored children might need their own children calculated later
    // For now, assume they become leaf nodes or are recalculated separately.
    child.children = []; 

    console.log(`[RESTORE DEBUG] Updated child ${child.id} (${child.uniqueId}) amount: ${originalAmount} -> ${newAmount}`);
  });
  
  console.log(`[RESTORE DEBUG] Updated children after propagating amounts:`, updatedChildren.map(c => ({id: c.id, amount: c.amount, uniqueId: c.uniqueId })));
  
  return updatedChildren;
}; 

/**
 * Utility function to convert an existing byproduct root node to a normal node
 * by replacing it with a fully recalculated node.
 * Modifies the workingInitialTrees map directly.
 *
 * @param targetTreeId - The uniqueId of the potential byproduct root tree.
 * @param workingInitialTrees - The map of tree roots being processed.
 * @param demandingChildNode - The child node triggering the potential conversion (for logging).
 * @param createTreeFn - The function to create a new, fully calculated tree node.
 * @returns Promise<boolean> - True if a conversion occurred, false otherwise.
 */
const convertByproductRootToNormal = async (
  targetTreeId: string,
  workingInitialTrees: Record<string, DependencyNode>,
  demandingChildNode: DependencyNode,
  createTreeFn: CreateTreeFunction // Use the imported type
): Promise<boolean> => {
  const targetTreeNode = workingInitialTrees[targetTreeId];

  if (!targetTreeNode) {
    console.error(`[convertByproductRootToNormal] Target node ${targetTreeId} not found!`); // Keep error
    return false;
  }

  if (!targetTreeNode.isByproduct) {
    return false;
  }

  console.log(`[convertByproductRootToNormal] Replacing byproduct root ${targetTreeId} (${targetTreeNode.id})...`); // Keep log
  try {
    const normalNode = await createTreeFn(
      targetTreeNode.id, 0, targetTreeId, null, false, targetTreeNode.originalDepth, false
    );

    if (normalNode) {
      workingInitialTrees[targetTreeId] = normalNode;
      console.log(`[convertByproductRootToNormal] Successfully replaced ${targetTreeId} with normal node.`); // Keep log
      return true;
    } else {
      console.error(`[convertByproductRootToNormal] createTreeFn failed for ${targetTreeId}.`); // Keep error
      return false;
    }
  } catch (error) {
    console.error(`[convertByproductRootToNormal] Error during createTreeFn call for ${targetTreeId}:`, error); // Keep error
    return false;
  }
};

/**
 * Recursively traverses a dependency tree and converts child nodes to import nodes
 * if the 'Add as Imported' setting is enabled.
 */
export async function convertToImportTree(
  node: DependencyNode | null,
  workingInitialTrees: Record<string, DependencyNode>,
  createTreeFn: CreateTreeFunction,
  pendingCreations: Record<string, Promise<DependencyNode | null>>
): Promise<DependencyNode | null> {
  if (!node) {
    return null;
  }

  if (node.children && node.children.length > 0) {
    const processedChildrenResults = await Promise.all(node.children.map(async (child) => {
      let processedChild = await convertToImportTree(
        child, workingInitialTrees, createTreeFn, pendingCreations
      );

      if (!processedChild) {
        return null;
      }

      if (!processedChild.isImport && !processedChild.importReference) {
        const itemIdToImport = processedChild.id;
        const originalChildDepth = processedChild.depth;
        const isChildByproduct = !!processedChild.isByproduct;
        let targetTreeId: string | null = null;

        if (itemIdToImport in pendingCreations) {
          const resolvedPendingTree = await pendingCreations[itemIdToImport];
          if (resolvedPendingTree) {
              targetTreeId = resolvedPendingTree.uniqueId;
              if (!workingInitialTrees[targetTreeId]) {
                 console.warn(`[convertToImportTree] Pending creation resolved, but tree ${targetTreeId} not found!`); // Keep warning
                 targetTreeId = Object.keys(workingInitialTrees).find(id => workingInitialTrees[id].id === itemIdToImport && !workingInitialTrees[id].isImport && !workingInitialTrees[id].importReference) || null;
              }
          } else {
             console.error(`[convertToImportTree] Pending creation for ${itemIdToImport} resolved to null.`); // Keep error
          }
        }
        
        if (!targetTreeId) {
          targetTreeId = Object.keys(workingInitialTrees).find(id => workingInitialTrees[id].id === itemIdToImport && !workingInitialTrees[id].isImport && !workingInitialTrees[id].importReference) || null;
        }

        if (targetTreeId) {
          if (!isChildByproduct) {
              await convertByproductRootToNormal(targetTreeId, workingInitialTrees, processedChild, createTreeFn);
          }
          processedChild = setImportReference(processedChild, targetTreeId, targetTreeId);

        } else {
          const creationPromise = createTreeFn(
            itemIdToImport, 0, undefined, undefined, true, originalChildDepth, isChildByproduct
          );
          pendingCreations[itemIdToImport] = creationPromise;
          const newTree = await creationPromise;
          if (newTree) {
            workingInitialTrees[newTree.uniqueId] = newTree;
            processedChild = setImportReference(processedChild, newTree.uniqueId, newTree.uniqueId);
          }
        }
      }
      return processedChild;
    }));
    node.children = processedChildrenResults.filter((child): child is DependencyNode => child !== null);
  }
  return node;
} 


