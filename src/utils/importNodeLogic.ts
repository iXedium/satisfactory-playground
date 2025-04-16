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
 * Recursively traverses a dependency tree and converts child nodes to import nodes
 * if the 'Add as Imported' setting is enabled.
 * It will try to link to existing root trees or create new ones if necessary.
 */
export async function convertToImportTree(
  node: DependencyNode,
  initialTrees: Record<string, DependencyNode>,
  // Use the imported CreateTreeFunction type
  createTreeFn: CreateTreeFunction, 
  // Keep pendingCreations as a separate argument
  pendingCreations: Record<string, Promise<DependencyNode | null>> 
): Promise<DependencyNode> {
  
  // console.log(`[convertToImportTree ENTRY] Node: ${node.uniqueId || node.id}. Current known tree IDs: [${Object.keys(initialTrees).join(', ')}]`); // Removed Log

  if (node.children && node.children.length > 0) {
    node.children = await Promise.all(node.children.map(async (child) => {
      let processedChild = await convertToImportTree(child, initialTrees, createTreeFn, pendingCreations);

      if (!processedChild.isImport && !processedChild.importReference && !processedChild.isByproduct) {
        const itemIdToImport = processedChild.id;
        
        // --- Capture original depth before potential conversion --- 
        const originalChildDepth = processedChild.depth;
        // --- LOG: Check captured depth ---
        console.log(`[convertToImportTree] Child ${processedChild.uniqueId} (Item: ${itemIdToImport}) needs conversion. Captured original depth: ${originalChildDepth}`);
        // --------------------------------
        
        let targetTreeId: string | null = null;
        let createdNewTree = false;

        if (pendingCreations[itemIdToImport]) {
          // console.log(`[convertToImportTree] Node ${processedChild.uniqueId}: Found pending creation for ${itemIdToImport}. Awaiting...`); // Removed Log
          const resolvedPendingTree = await pendingCreations[itemIdToImport];
          if (resolvedPendingTree) {
              // console.log(`[convertToImportTree] Node ${processedChild.uniqueId}: Pending creation for ${itemIdToImport} resolved (Tree ID: ${resolvedPendingTree.uniqueId}). Checking initialTrees again.`); // Removed Log
              targetTreeId = resolvedPendingTree.uniqueId;
              if (!initialTrees[targetTreeId]) {
                 // console.warn(`[convertToImportTree] Node ${processedChild.uniqueId}: Pending creation resolved, but tree ${targetTreeId} not found in initialTrees map! Map keys: [${Object.keys(initialTrees).join(', ')}]`); // Removed Log
                 targetTreeId = Object.keys(initialTrees).find(id => initialTrees[id].id === itemIdToImport && !initialTrees[id].isImport && !initialTrees[id].importReference) || null;
              }
          } else {
             // console.error(`[convertToImportTree] Node ${processedChild.uniqueId}: Pending creation for ${itemIdToImport} resolved to null/failure.`); // Removed Log
          }
        }
        
        if (!targetTreeId) {
          targetTreeId = Object.keys(initialTrees).find(id => initialTrees[id].id === itemIdToImport && !initialTrees[id].isImport && !initialTrees[id].importReference) || null;
        }

        if (targetTreeId) {
          // console.log(`[convertToImportTree] Node ${processedChild.uniqueId}: Found existing target tree ${targetTreeId} for ${itemIdToImport}. Converting to import.`); // Removed Log
          processedChild = setImportReference(processedChild, targetTreeId, targetTreeId);
        } else {
          // console.log(`[convertToImportTree] Node ${processedChild.uniqueId}: No existing tree for ${itemIdToImport}. Calling createTreeFn...`); // Removed Log
          // No existing tree, call createTreeFn
          console.log(`[convertToImportTree] Calling createTreeFn for ${itemIdToImport} with originalDepth: ${originalChildDepth}`); // Log before call
          const creationPromise = createTreeFn(
            itemIdToImport, 
            0, 
            undefined, 
            undefined, 
            true, 
            originalChildDepth // Pass the captured original depth
          );
          // ---------------------------------------------
          pendingCreations[itemIdToImport] = creationPromise;
          
          const newTree = await creationPromise;
          createdNewTree = true;
          
          if (newTree) {
            initialTrees[newTree.uniqueId] = newTree;
            // console.log(`[convertToImportTree] Node ${processedChild.uniqueId}: createTreeFn successful (newTreeId: ${newTree.uniqueId}). Added to map. New map keys: [${Object.keys(initialTrees).join(', ')}]. Converting to import.`); // Removed Log
            processedChild = setImportReference(processedChild, newTree.uniqueId, newTree.uniqueId);
          } else {
            // console.error(`[convertToImportTree] Node ${processedChild.uniqueId}: createTreeFn failed for ${itemIdToImport}`); // Removed Log
          }
        }
      }

      return processedChild;
    }));
  }

  return node;
} 


