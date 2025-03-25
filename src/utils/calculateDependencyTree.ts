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
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`Creating import node: ${itemId}, amount=${amount}, excess=${nodeExcess}, from=${importInfo.targetTreeId}`);
    }
    
    return {
      id: itemId,
      amount, // Use the new calculated amount
      uniqueId: nodeId,
      isImport: true,
      importedFrom: importInfo.targetTreeId,
      children: [], // Import nodes don't have children
      excess: nodeExcess
    };
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

