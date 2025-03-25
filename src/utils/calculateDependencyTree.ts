import { Recipe } from "../data/dexieDB";
import { getRecipeById, getRecipeByOutput, getRecipesForItem } from "../data/dbQueries";
import { NodePath } from "./treeDiffing";
import { isNodeImporting, ImportReference } from "./nodeReferenceUtils";

export interface DependencyNode {
  // Core required properties
  id: string;
  amount: number;
  uniqueId: string;
  excess: number;
  children?: DependencyNode[];
  
  // Recipe-related properties
  selectedRecipeId?: string;
  availableRecipes?: Recipe[];
  
  // Node type flags
  isRoot?: boolean;
  isByproduct?: boolean;
  
  // Legacy import system properties (deprecated)
  /** @deprecated Use importReference instead */
  isImport?: boolean;
  /** @deprecated Use importReference instead */
  importedFrom?: string;
  /** @deprecated Will be phased out in favor of storing in Redux */
  originalChildren?: DependencyNode[];
  
  // New reference-based import system properties
  importReference?: ImportReference;
  childrenVisible?: boolean; // Default to true, set to false for imported nodes
  
  // Recipe selection storage for import/unimport
  originalRecipeId?: string;
}

// Cache for memoizing tree calculations
export const nodeCache = new Map<string, DependencyNode>();

const getNodeFromCache = async (nodeId: string): Promise<DependencyNode | null> => {
  return nodeCache.get(nodeId) || null;
};

const cacheNode = async (nodeId: string, node: DependencyNode) => {
  nodeCache.set(nodeId, node);
};

const clearNodeFromCache = async (nodeId: string) => {
  nodeCache.delete(nodeId);
};

export const clearNodeCache = () => {
  nodeCache.clear();
};

const logPerf = (label: string, start: number) => {
  const duration = performance.now() - start;
  if (duration > 100) {
    console.debug(`[PERF] ${label} took ${Math.round(duration)}ms`);
  }
};

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
  const start = performance.now();

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

  // 1. First check new reference system via dependency trees
  if (dependencyTrees) {
    const nodeWithReference = await findNodeWithReference(nodeId, dependencyTrees);
    if (nodeWithReference && isNodeImporting(nodeWithReference)) {
      return createImportNode(
        nodeWithReference,
        itemId,
        amount,
        nodeId,
        excessMap[itemId] || excessMap[nodeId] || 0,
        recipeMap[nodeId]
      );
    }
  }
  
  // 2. For backward compatibility, check legacy importMap
  const importInfo = importMap[nodeId];
  if (importInfo) {
    const targetTreeId = importInfo.targetTreeId;
    return createImportNode(
      null, // No existing node with reference
      itemId,
      amount,
      nodeId,
      excessMap[itemId] || excessMap[nodeId] || 0,
      recipeMap[nodeId],
      targetTreeId
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
      amount: -(outputAmount * cyclesNeeded),
      uniqueId: `${nodeId}-${outputItem}-${depth}`,
      isByproduct: true,
      children: [],
      excess: 0
    } as DependencyNode));

  const result: DependencyNode = {
    id: itemId,
    amount,
    uniqueId: nodeId,
    isRoot: depth === 0,
    selectedRecipeId: recipe.id,
    availableRecipes,
    children: [...children, ...byproducts],
    excess: excessMap[itemId] || excessMap[nodeId] || 0
  };

  // Store result in cache
  await cacheNode(nodeId, result);

  logPerf('Total tree calculation', start);

  return result;
};

// Helper function to create an import node with proper reference
async function createImportNode(
  existingNode: DependencyNode | null,
  itemId: string,
  amount: number,
  nodeId: string,
  excess: number = 0,
  recipeId?: string,
  legacyTargetTreeId?: string // For backward compatibility
): Promise<DependencyNode> {
  // Log import node details for debugging
  console.debug(`Creating import node: ${itemId}, amount=${amount}`);
  
  // Get node from cache if it exists and we don't have an existing node
  const cachedNode = existingNode || await getNodeFromCache(nodeId);
  let originalChildren;
  
  if (cachedNode && cachedNode.originalChildren && cachedNode.originalChildren.length > 0) {
    console.log(`[IMPORT DEBUG] Using cached original children for ${itemId}`);
    // Deep clone to avoid reference issues
    originalChildren = JSON.parse(JSON.stringify(cachedNode.originalChildren));
  } else {
    // Calculate original children using our storeOriginalChildren function
    originalChildren = await storeOriginalChildren(
      itemId,
      amount > 0 ? amount : 1, // Use at least 1 for amount to ensure we get proper children
      excess,
      recipeId
    );
    
    console.log(`[IMPORT DEBUG] Generated ${originalChildren.length} original children for import node ${itemId}`);
  }
  
  // Extract target tree ID from either existing node or legacy system
  let targetTreeId = '';
  if (existingNode && existingNode.importReference) {
    targetTreeId = existingNode.importReference.targetTreeId;
  } else if (existingNode && existingNode.importedFrom) {
    targetTreeId = existingNode.importedFrom;
  } else if (legacyTargetTreeId) {
    targetTreeId = legacyTargetTreeId;
  }
  
  if (!targetTreeId) {
    console.warn('[IMPORT WARNING] No target tree ID found for import node');
  }
  
  // Create node with both legacy and new import reference system properties
  const importNode: DependencyNode = {
    id: itemId,
    amount,
    uniqueId: nodeId,
    // New system properties (primary)
    importReference: {
      targetTreeId,
      targetNodeId: 'root' // Default to root for now
    },
    childrenVisible: false, // Hide children for import nodes
    excess: excess,
    originalChildren, // Keep for now, but will be phased out
    children: [], // Import nodes don't have active children
    // Legacy properties (deprecated)
    isImport: true,
    importedFrom: targetTreeId,
  };
  
  // Ensure correct selectedRecipeId is preserved from existing node, cache, or set to default
  if (existingNode && existingNode.selectedRecipeId) {
    importNode.selectedRecipeId = existingNode.selectedRecipeId;
  } else if (cachedNode && cachedNode.selectedRecipeId) {
    importNode.selectedRecipeId = cachedNode.selectedRecipeId;
  } else if (recipeId) {
    importNode.selectedRecipeId = recipeId;
  }
  
  // Preserve availableRecipes if they exist
  if (existingNode && existingNode.availableRecipes) {
    importNode.availableRecipes = existingNode.availableRecipes;
  } else if (cachedNode && cachedNode.availableRecipes) {
    importNode.availableRecipes = cachedNode.availableRecipes;
  }
  
  // Cache this node to ensure original children are preserved in future recalculations
  await cacheNode(nodeId, importNode);
  
  return importNode;
}

// Helper function to find a node by its unique ID
export const findNodeById = (tree: DependencyNode, nodeId: string): DependencyNode | null => {
  if (tree.uniqueId === nodeId) {
    return tree;
  }
  
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeById(child, nodeId);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

// Helper function to restore original children when unimporting
export const restoreOriginalChildren = (
  nodeId: string,
  currentAmount: number,
  originalChildren: DependencyNode[]
): DependencyNode[] => {
  console.log(`[RESTORE DEBUG] Restoring original children for node: ${nodeId}`);
  
  if (!originalChildren || originalChildren.length === 0) {
    console.log(`[RESTORE DEBUG] No original children found to restore`);
    return [];
  }
  
  console.log(`[RESTORE DEBUG] Current amount for propagation: ${currentAmount}`);
  
  // Create a deep clone to avoid mutating the original data
  const updatedChildren = JSON.parse(JSON.stringify(originalChildren));
  
  // Log the original children before updating
  console.log(`[RESTORE DEBUG] Original children before updating amounts: ${JSON.stringify(updatedChildren.map((child: DependencyNode) => ({
    id: child.id,
    amount: child.amount,
    hasChildren: child.children && child.children.length > 0,
    childrenIds: child.children?.map(c => c.id) || []
  })))}`);
  
  // If there are children to restore, update their amounts based on the current amount
  if (updatedChildren.length > 0) {
    console.log(`[RESTORE DEBUG] Found ${updatedChildren.length} original children to restore`);
    
    // Calculate scaling factor
    // If the original amount was 0, use a 1:1 ratio (don't divide by zero)
    let scaleFactor = 1;
    const originalTotalAmount = originalChildren.reduce((sum, child) => sum + (child.amount || 0), 0);
    
    if (originalTotalAmount > 0) {
      scaleFactor = currentAmount / originalTotalAmount;
    } else {
      // If all original children had 0 amount, use current amount directly
      scaleFactor = currentAmount;
    }
    
    console.log(`[RESTORE DEBUG] Scaling factor: ${scaleFactor}, original total: ${originalTotalAmount}, current: ${currentAmount}`);
    
    // Update all children amounts
    updatedChildren.forEach((child: DependencyNode) => {
      // Ensure child has normalized ID
      if (child.id.includes('-')) {
        child.id = child.id.replace(/-/g, '_');
      }
      
      const originalAmount = child.amount || 0;
      // Scale amounts - ensure we have at least the current amount divided by children count
      // when original amounts were all zero
      let newAmount;
      if (originalTotalAmount > 0) {
        newAmount = Math.max(Math.round(originalAmount * scaleFactor), 0);
      } else {
        // Distribute equally if original amounts were all zero
        newAmount = Math.ceil(currentAmount / updatedChildren.length);
      }
      
      console.log(`[RESTORE DEBUG] Updated child ${child.id} amount: ${originalAmount} -> ${newAmount}`);
      
      child.amount = newAmount;
      
      // Recursively restore children of children if they exist
      if (child.children && child.children.length > 0) {
        child.children = restoreOriginalChildren(child.id, newAmount, child.children);
      }
    });
  }
  
  // Log the updated children after propagating amounts
  console.log(`[RESTORE DEBUG] Updated children after propagating amounts: ${JSON.stringify(updatedChildren.map((child: DependencyNode) => ({
    id: child.id,
    amount: child.amount,
    hasChildren: child.children && child.children.length > 0,
    childrenIds: child.children?.map(c => c.id) || []
  })))}`);
  
  return updatedChildren;
};

// Helper functions to analyze tree - exported to avoid linter errors
export const countNodes = (node: DependencyNode): number => {
  let count = 1;
  node.children?.forEach(child => count += countNodes(child));
  return count;
};

export const getTreeDepth = (node: DependencyNode): number => {
  if (!node.children || node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(getTreeDepth));
};

// Helper function to calculate and store the original children for an import node
export async function storeOriginalChildren(
  itemId: string,
  amount: number,
  excess: number = 0, 
  recipeId?: string
): Promise<DependencyNode[]> {
  // Get recipe for this item
  let recipe: Recipe | undefined;
  
  if (recipeId) {
    recipe = await getRecipeById(recipeId);
  } else {
    recipe = await getRecipeByOutput(itemId);
  }
  
  if (!recipe) {
    return []; // No recipe means no children
  }
  
  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = (amount + excess) / outputAmount;
  
  // Calculate children without using import references
  const children = await Promise.all(
    Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
      calculateDependencyTree(
        inputItem,
        (inputAmount ?? 0) * cyclesNeeded,
        null,
        {}, // Empty recipe map for original children
        0, // Reset depth for clarity
        [], // No affected branches
        '', // No parent ID
        {}, // No excess map
        {} // No import map - crucial to avoid circular imports
      )
    )
  );
  
  return children;
}

// Helper to find a node with the given ID in any tree
async function findNodeWithReference(
  nodeId: string,
  dependencyTrees: Record<string, DependencyNode>
): Promise<DependencyNode | null> {
  for (const treeId in dependencyTrees) {
    const node = findNodeInTree(dependencyTrees[treeId], nodeId);
    if (node) {
      return node;
    }
  }
  return null;
}

// Helper to find a node by its uniqueId in a dependency tree
function findNodeInTree(node: DependencyNode, nodeId: string): DependencyNode | null {
  if (node.uniqueId === nodeId) {
    return node;
  }
  
  // Check children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const foundNode = findNodeInTree(child, nodeId);
      if (foundNode) {
        return foundNode;
      }
    }
  }
  
  // Also check originalChildren for import nodes
  if (node.originalChildren && node.originalChildren.length > 0) {
    for (const child of node.originalChildren) {
      const foundNode = findNodeInTree(child, nodeId);
      if (foundNode) {
        return foundNode;
      }
    }
  }
  
  return null;
}

