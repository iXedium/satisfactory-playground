import { Recipe } from "../types";
import { getRecipeById, getRecipeByOutput, getRecipesForItem } from "../data";
import { NodePath } from "./treeDiffing";
import { isNodeImporting } from "./nodeReferenceUtils";
import { DependencyNode } from "../types";
// Import cache functions
import { 
  getNodeFromCache, 
  cacheNode, 
  clearNodeFromCache, 
  // clearNodeCache, // Only import if needed directly here
} from "./treeCalculationCache"; 
// Import createImportNode
import { createImportNode } from "./importNodeLogic"; 
// Import tree utils
import { findNodeById, findNodeByIdInAllTrees } from "./treeUtils"; 

// FindNodeById likely comes from calculateDependencyTree itself or should be imported correctly
// Let's assume it should be defined locally for now, uncommenting the local version
// import { findNodeById } from "./index"; // Comment out index import

export const calculateDependencyTree = async (
  itemId: string,
  amount: number,
  rootRecipeId: string | null,
  recipeMap: Record<string, string> = {},
  depth: number = 0,
  affectedBranches: NodePath[] = [],
  parentId: string = '',
  excessMap: Record<string, number> = {},
  importMap: Record<string, { targetTreeId: string, amount: number }> = {}, // Legacy import system - will be deprecated
  dependencyTrees?: Record<string, DependencyNode> // Access to all trees for import references
): Promise<DependencyNode> => {
  // const start = performance.now(); // Remove perf logging for now

  // Create unique ID that includes parent path
  const nodeId = parentId ? `${parentId}-${itemId}-${depth}` : `${itemId}-${depth}`;

  // Only check if current node or its children are affected
  const isAffected = affectedBranches.some(b => 
    b.nodeId === nodeId || // Direct match
    b.nodeId.startsWith(`${nodeId}-`) // Child nodes only
  );

  if (!isAffected && affectedBranches.length > 0) {
    const cachedNode = await getNodeFromCache(nodeId);
    if (cachedNode) {
      // Use new reference-based check for importing nodes
      if (isNodeImporting(cachedNode)) {
        // For import nodes, update the amount but preserve the import reference
        return {
          ...cachedNode,
          amount, // Use the new amount
          excess: excessMap[itemId] || excessMap[nodeId] || 0
        };
      }
      return cachedNode;
    }
  }

  // Clear cache for affected node
  if (isAffected) {
    await clearNodeFromCache(nodeId);
  }

  // CRITICAL FIX: For nodes with multiple paths to imports, we need to check
  // across ALL trees in dependencyTrees to see if this nodeId already exists
  // and has an import reference. This ensures nested imports are properly handled.
  if (dependencyTrees) {
    // Use imported findNodeByIdInAllTrees
    const existingNode = await findNodeByIdInAllTrees(nodeId, dependencyTrees); 
    if (existingNode && isNodeImporting(existingNode)) {
      console.debug(`[NESTED IMPORT/REF] Found existing import node ${nodeId}`);
      return await createImportNode(
        existingNode, itemId, amount, nodeId, excessMap[itemId] || excessMap[nodeId] || 0,
        recipeMap[nodeId], undefined, existingNode
      );
    } 
  }
  
  // 2. For backward compatibility, check legacy importMap
  const importInfo = importMap[nodeId];
  if (importInfo) {
    const targetTreeId = importInfo.targetTreeId;
    return await createImportNode(
      null, // No existing node with reference
      itemId,
      amount,
      nodeId,
      excessMap[itemId] || excessMap[nodeId] || 0,
      recipeMap[nodeId],
      targetTreeId,
      undefined
    );
  }

  // If not an import node, proceed with normal calculation
  
  // Get available recipes for this item
  const availableRecipes = await getRecipesForItem(itemId);
  
  let recipe: Recipe | undefined;

  // Check recipe map first, then fallback to root recipe or default
  if (recipeMap[nodeId]) {
    recipe = await getRecipeById(recipeMap[nodeId]);
  } else if (depth === 0 && rootRecipeId) {
    recipe = await getRecipeById(rootRecipeId);
  } else {
    recipe = await getRecipeByOutput(itemId);
  }

  if (!recipe) {
    return { 
      id: itemId, 
      amount, 
      uniqueId: nodeId,
      availableRecipes,
      children: [],
      excess: excessMap[itemId] || excessMap[nodeId] || 0
    };
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = (amount + (excessMap[itemId] || excessMap[nodeId] || 0)) / outputAmount;

  // Pass dependencyTrees to child calculations for import references
  const children = await Promise.all(
    Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
      calculateDependencyTree(
        inputItem, 
        (inputAmount ?? 0) * cyclesNeeded, 
        null, 
        recipeMap,
        depth + 1,
        affectedBranches,
        nodeId,
        excessMap,
        importMap,
        dependencyTrees
      )
    )
  );

  // Add byproducts but do NOT process them
  const byproducts = Object.entries(recipe.out)
    .filter(([outputItem]) => outputItem !== itemId)
    .map(([outputItem, outputAmount]) => ({
      id: outputItem,
      amount: -(Number(outputAmount) * cyclesNeeded), // Ensure calculation uses number
      uniqueId: `${nodeId}-${outputItem}-${depth}`,
      isByproduct: true,
      children: [],
      excess: 0,
      selectedRecipeId: undefined, // Explicitly add optional field
      availableRecipes: [] // Explicitly add optional field
    } as DependencyNode));

  const result: DependencyNode = {
    id: itemId,
    amount,
    uniqueId: nodeId,
    isRoot: depth === 0,
    recipe: recipe,
    availableRecipes,
    children: [...children, ...byproducts],
    excess: excessMap[itemId] || excessMap[nodeId] || 0
  };

  // Store result in cache
  await cacheNode(nodeId, result);
  // logPerf('Total tree calculation', start); // Removed perf logging

  return result;
};

// Helper function to create consistent import nodes
// const createImportNode = async (
//   existingImportNode: DependencyNode | null,
//   itemId: string,
//   amount: number,
//   nodeId: string,
//   excess: number,
//   selectedRecipeId?: string,
//   legacyTargetTreeId?: string, // Only used for legacy import system
//   nodeWithReference?: DependencyNode // Node with reference from findNodeWithReference
// ): Promise<DependencyNode> => {
//   // Fetch the actual recipe object if an ID is provided
//   const recipeObj = selectedRecipeId ? await getRecipeById(selectedRecipeId) : undefined;
//
//   if (existingImportNode && existingImportNode.importReference) {
//     return {
//       ...existingImportNode,
//       id: itemId,
//       amount: amount,
//       uniqueId: nodeId,
//       excess: excess,
//       recipe: recipeObj,
//       children: [], // Explicitly set empty children array
//       isImport: true, // Support legacy system
//       // Preserve existing originalChildren or create new ones
//       originalChildren: existingImportNode.originalChildren || await storeOriginalChildren(itemId, amount, excess, recipeObj),
//       // Keep the original import reference
//       importReference: existingImportNode.importReference
//     };
//   }
//
//   const originalChildren = await storeOriginalChildren(itemId, amount, excess, recipeObj);
//   
//   // New import node or legacy fallback
//   const isLegacy = !!legacyTargetTreeId;
//   
//   if (isLegacy) {
//     return {
//       id: itemId,
//       amount: amount,
//       uniqueId: nodeId,
//       excess: excess,
//       recipe: recipeObj,
//       children: [], // Explicitly set empty children array
//       isImport: true, // Support legacy system
//       importedFrom: legacyTargetTreeId, // Legacy support
//       // Store original children for restoration later
//       originalChildren: originalChildren,
//       // New reference-based import system with legacy information
//       importReference: {
//         targetTreeId: legacyTargetTreeId!,
//         targetNodeId: ''  // Will be corrected by the dependency slice
//       }
//     };
//   } else if (nodeWithReference) {
//     return {
//       id: itemId,
//       amount: amount,
//       uniqueId: nodeId,
//       excess: excess,
//       recipe: recipeObj,
//       children: [], // Explicitly set empty children array
//       isImport: true, // Support legacy system
//       // Store original children for restoration later
//       originalChildren: originalChildren,
//       importReference: {
//         targetTreeId: nodeWithReference.uniqueId.split('-')[0] || '',
//         targetNodeId: nodeWithReference.uniqueId || ''
//       }
//     };
//   }
//   
//   // Fallback with empty reference (should not happen in practice)
//   return {
//     id: itemId,
//     amount: amount,
//     uniqueId: nodeId,
//     excess: excess,
//     recipe: recipeObj,
//     children: [], // Explicitly set empty children array
//     isImport: true, // Support legacy system
//     // Store original children for restoration later
//     originalChildren: originalChildren,
//     importReference: {
//       targetTreeId: '',
//       targetNodeId: ''
//     }
//   };
// };

// Helper function to restore original children when unimporting
// export const restoreOriginalChildren = (
//   nodeId: string,
//   currentAmount: number,
//   originalChildren: DependencyNode[]
// ): DependencyNode[] => {
//   console.log(`[RESTORE DEBUG] Restoring original children for node: ${nodeId}`);
//   
//   if (!originalChildren || originalChildren.length === 0) {
//     console.log(`[RESTORE DEBUG] No original children found to restore`);
//     return [];
//   }
//   
//   console.log(`[RESTORE DEBUG] Current amount for propagation: ${currentAmount}`);
//   
//   // Create a deep clone to avoid mutating the original data
//   const updatedChildren = JSON.parse(JSON.stringify(originalChildren));
//   
//   // Log the original children before updating
//   console.log(`[RESTORE DEBUG] Original children before updating amounts: ${JSON.stringify(updatedChildren.map((child: DependencyNode) => ({
//     id: child.id,
//     amount: child.amount,
//     hasChildren: child.children && child.children.length > 0,
//     childrenIds: child.children?.map(c => c.id) || []
//   })))}`);
//   
//   // If there are children to restore, update their amounts based on the current amount
//   if (updatedChildren.length > 0) {
//     console.log(`[RESTORE DEBUG] Found ${updatedChildren.length} original children to restore`);
//     
//     // Calculate scaling factor
//     // If the original amount was 0, use a 1:1 ratio (don't divide by zero)
//     let scaleFactor = 1;
//     const originalTotalAmount = originalChildren.reduce((sum, child) => sum + (child.amount || 0), 0);
//     
//     if (originalTotalAmount > 0) {
//       scaleFactor = currentAmount / originalTotalAmount;
//     } else {
//       // If all original children had 0 amount, use current amount directly
//       scaleFactor = currentAmount;
//     }
//     
//     console.log(`[RESTORE DEBUG] Scaling factor: ${scaleFactor}, original total: ${originalTotalAmount}, current: ${currentAmount}`);
//     
//     // Update all children amounts
//     updatedChildren.forEach((child: DependencyNode) => {
//       // Ensure child has normalized ID
//       if (child.id.includes('-')) {
//         child.id = child.id.replace(/-/g, '_');
//       }
//       
//       const originalAmount = child.amount || 0;
//       // Scale amounts - ensure we have at least the current amount divided by children count
//       // when original amounts were all zero
//       let newAmount;
//       if (originalTotalAmount > 0) {
//         newAmount = Math.max(Math.round(originalAmount * scaleFactor), 0);
//       } else {
//         // Distribute equally if original amounts were all zero
//         newAmount = Math.ceil(currentAmount / updatedChildren.length);
//       }
//       
//       console.log(`[RESTORE DEBUG] Updated child ${child.id} amount: ${originalAmount} -> ${newAmount}`);
//       
//       child.amount = newAmount;
//       
//       // Recursively restore children of children if they exist
//       if (child.children && child.children.length > 0) {
//         child.children = restoreOriginalChildren(child.id, newAmount, child.children);
//       }
//     });
//   }
//   
//   // Log the updated children after propagating amounts
//   console.log(`[RESTORE DEBUG] Updated children after propagating amounts: ${JSON.stringify(updatedChildren.map((child: DependencyNode) => ({
//     id: child.id,
//     amount: child.amount,
//     hasChildren: child.children && child.children.length > 0,
//     childrenIds: child.children?.map(c => c.id) || []
//   })))}`);
//   
//   return updatedChildren;
// };

// Helper functions to analyze tree - exported to avoid linter errors
// export const countNodes = (node: DependencyNode): number => {
//   let count = 1;
//   node.children?.forEach(child => count += countNodes(child));
//   return count;
// };
//
// export const getTreeDepth = (node: DependencyNode): number => {
//   if (!node.children || node.children.length === 0) return 0;
//   return 1 + Math.max(...node.children.map(getTreeDepth));
// };

// Helper function to calculate and store the original children for an import node
// export async function storeOriginalChildren(
//   itemId: string,
//   amount: number,
//   excess: number = 0, 
//   recipe?: Recipe
// ): Promise<DependencyNode[]> {
//   // Use the provided recipe object directly
//   if (!recipe) {
//     // Fetch recipe if not provided (though createImportNode should provide it)
//     recipe = await getRecipeByOutput(itemId); 
//     if (!recipe) return [];
//   }
//   
//   const outputAmount = recipe.out[itemId] ?? 1;
//   const cyclesNeeded = (amount + excess) / outputAmount;
//   
//   // Calculate children without using import references
//   const children = await Promise.all(
//     Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
//       calculateDependencyTree(
//         inputItem,
//         (inputAmount ?? 0) * cyclesNeeded,
//         null,
//         {}, // Empty recipe map for original children
//         0, // Reset depth for clarity
//         [], // No affected branches
//         '', // No parent ID
//         {}, // No excess map
//         {} // No import map - crucial to avoid circular imports
//       )
//     )
//   );
//   
//   return children;
// }

// Helper to find a node with the given ID in any tree
// async function findNodeWithReference(
//   nodeId: string,
//   dependencyTrees: Record<string, DependencyNode>
// ): Promise<DependencyNode | null> {
//   for (const treeId in dependencyTrees) {
//     const node = findNodeInTree(dependencyTrees[treeId], nodeId);
//     if (node) {
//       return node;
//     }
//   }
//   return null;
// }

// Helper to find a node by its uniqueId in a dependency tree
// function findNodeInTree(node: DependencyNode, nodeId: string): DependencyNode | null {
//   if (node.uniqueId === nodeId) {
//     return node;
//   }
//   
//   // Check children
//   if (node.children && node.children.length > 0) {
//     for (const child of node.children) {
//       const foundNode = findNodeInTree(child, nodeId);
//       if (foundNode) {
//         return foundNode;
//       }
//     }
//   }
//   
//   // Also check originalChildren for import nodes
//   if (node.originalChildren && node.originalChildren.length > 0) {
//     for (const child of node.originalChildren) {
//       const foundNode = findNodeInTree(child, nodeId);
//       if (foundNode) {
//         return foundNode;
//       }
//     }
//   }
//   
//   return null;
// }

// Restore local function definition
// export const findNodeById = (tree: DependencyNode, nodeId: string): DependencyNode | null => {
//   if (tree.uniqueId === nodeId) {
//     return tree;
//   }
//   
//   if (tree.children) {
//     for (const child of tree.children) {
//       const found = findNodeById(child, nodeId);
//       if (found) {
//         return found;
//       }
//     }
//   }
//   
//   return null;
// };
