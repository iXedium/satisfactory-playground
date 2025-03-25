import { Recipe } from "../data/dexieDB";
import { getRecipeById, getRecipeByOutput, getRecipesForItem } from "../data/dbQueries";
import { NodePath } from "./treeDiffing";

export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  isImport?: boolean;
  selectedRecipeId?: string;
  availableRecipes?: Recipe[];
  children?: DependencyNode[];
  excess: number;
  originalChildren?: DependencyNode[];
  importedFrom?: string;
  
  // New reference-based import system properties
  importReference?: {
    targetTreeId: string;
    targetNodeId: string;
  };
  childrenVisible?: boolean; // Default to true, set to false for imported nodes
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
  importMap: Record<string, { targetTreeId: string, amount: number }> = {} // Track imported nodes
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
      // Even for cached nodes, we need to update amounts if they're imports
      if (cachedNode.isImport && importMap[nodeId]) {
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

  // Check if this node should be an import
  const importInfo = importMap[nodeId];
  if (importInfo) {
    // For import nodes, create a node with updated amount but preserved import relationship
    const nodeExcess = excessMap[itemId] || excessMap[nodeId] || 0;
    
    // Log import node details for debugging
    console.debug(`Creating import node: ${itemId}, amount=${amount}, excess=${nodeExcess}, from=${importInfo.targetTreeId}`);
    
    // Check if this node exists in the cache and get important properties to preserve
    const cachedNode = await getNodeFromCache(nodeId);
    
    // Initialize from cache or generate new
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
        nodeExcess,
        recipeMap[nodeId]
      );
      
      console.log(`[IMPORT DEBUG] Generated ${originalChildren.length} original children for import node ${itemId}:`, 
        JSON.stringify(originalChildren)
      );
    }
    
    // Create the import node with original children preserved
    const importNode = {
      id: itemId,
      amount, // Use the new calculated amount
      uniqueId: nodeId,
      isImport: true,
      importedFrom: importInfo.targetTreeId,
      children: [], // Import nodes don't have children
      excess: nodeExcess,
      originalChildren // Store the original children for restoration when unimporting
    };
    
    // Ensure correct selectedRecipeId is preserved from cache or set to default
    if (cachedNode && cachedNode.selectedRecipeId) {
      importNode.selectedRecipeId = cachedNode.selectedRecipeId;
    } else if (recipeMap[nodeId]) {
      importNode.selectedRecipeId = recipeMap[nodeId];
    }
    
    // Cache this node to ensure original children are preserved in future recalculations
    await cacheNode(nodeId, importNode);
    
    return importNode;
  }

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

  // Pass recipeMap and importMap to child calculations
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
        importMap
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
  originalChildren: any[]
): { id: string; amount: number; hasChildren: boolean; childrenIds?: string[]; children?: any[] }[] => {
  console.log(`[RESTORE DEBUG] Restoring original children for node: ${nodeId}`);
  
  if (!originalChildren || originalChildren.length === 0) {
    console.log(`[RESTORE DEBUG] No original children found to restore`);
    return [];
  }
  
  console.log(`[RESTORE DEBUG] Current amount for propagation: ${currentAmount}`);
  
  // Create a deep clone to avoid mutating the original data
  const updatedChildren = JSON.parse(JSON.stringify(originalChildren));
  
  // Log the original children before updating
  console.log(`[RESTORE DEBUG] Original children before updating amounts: ${JSON.stringify(updatedChildren.map(child => ({
    id: child.id,
    amount: child.amount,
    hasChildren: child.hasChildren || false,
    childrenIds: child.childrenIds || []
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
    updatedChildren.forEach((child: any) => {
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
  console.log(`[RESTORE DEBUG] Updated children after propagating amounts: ${JSON.stringify(updatedChildren.map(child => ({
    id: child.id,
    amount: child.amount,
    hasChildren: child.hasChildren || false,
    childrenIds: child.childrenIds || []
  })))}`);
  
  return updatedChildren;
};

// Helper functions to analyze tree
const countNodes = (node: DependencyNode): number => {
  let count = 1;
  node.children?.forEach(child => count += countNodes(child));
  return count;
};

const getTreeDepth = (node: DependencyNode): number => {
  if (!node.children || node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(getTreeDepth));
};

export const storeOriginalChildren = async (
  itemId: string,
  amount: number,
  excessAmount: number = 0,
  recipeId?: string
): Promise<{ id: string; amount: number; hasChildren: boolean; childrenIds: string[] }[]> => {
  try {
    // Normalize item ID for consistent lookups
    const normalizedItemId = itemId.includes('-') ? itemId.replace(/-/g, '_') : itemId;
    
    // Find the recipe for this item
    const recipe = recipeId 
      ? await getRecipeById(recipeId)
      : await getRecipeByOutput(normalizedItemId);
    
    if (!recipe) {
      console.log(`[IMPORT DEBUG] No recipe found for ${normalizedItemId}, returning empty originalChildren`);
      return [];
    }
    
    console.log(`[IMPORT DEBUG] Calculating original children for ${normalizedItemId} with amount ${amount} and excess ${excessAmount}`);
    
    // Calculate how many cycles of the recipe we need
    const effectiveAmount = amount + excessAmount; // Include excess in calculation
    const outputAmount = recipe.out?.[normalizedItemId] || 1;
    const cyclesNeeded = Math.ceil(effectiveAmount / outputAmount);
    
    console.log(`[IMPORT DEBUG] ${normalizedItemId}: effectiveAmount=${effectiveAmount}, outputAmount=${outputAmount}, cyclesNeeded=${cyclesNeeded}`);

    // If the amount is 0, ensure we at least create children with the minimal recipe amounts
    // This is critical for nodes created with 0 amount initially
    const scaleFactor = effectiveAmount <= 0 ? 1 : cyclesNeeded;
    
    // Calculate child amounts
    const originalChildren = await Promise.all(
      Object.entries(recipe.in || {}).map(async ([childId, childAmount]) => {
        // Normalize child ID to underscore format for consistency
        const normalizedChildId = childId.includes('-') ? childId.replace(/-/g, '_') : childId;
        
        const actualChildAmount = (childAmount || 1) * scaleFactor;
        console.log(`[IMPORT DEBUG] Adding original child ${normalizedChildId} with amount ${actualChildAmount}`);
        
        // Recursively get children of children
        const childrenOfChild = await storeOriginalChildren(normalizedChildId, actualChildAmount);
        const hasChildren = childrenOfChild.length > 0;
        const childrenIds = childrenOfChild.map(child => child.id);
        
        return {
          id: normalizedChildId,
          amount: actualChildAmount,
          hasChildren,
          childrenIds,
          children: hasChildren ? childrenOfChild : undefined
        };
      })
    );
    
    console.log(`[IMPORT DEBUG] Calculated ${originalChildren.length} original children for ${normalizedItemId}: ${JSON.stringify(originalChildren.map(child => ({
      id: child.id,
      amount: child.amount,
      hasChildren: child.hasChildren,
      childrenIds: child.childrenIds
    })))}`);
    
    return originalChildren;
  } catch (error) {
    console.error(`Error calculating original children for ${itemId}:`, error);
    return [];
  }
};

