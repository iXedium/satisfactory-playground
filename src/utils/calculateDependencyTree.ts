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
  originalAmount?: number;
}

const logPerf = (label: string, start: number) => {
  const elapsed = performance.now() - start;
  // console.log(`[${new Date().toISOString()}] ${label}: ${elapsed.toFixed(2)}ms`);
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
  // console.log(`[${new Date().toISOString()}] Starting tree calculation for ${itemId}`);

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
      return cachedNode;
    }
  }

  // Clear cache for affected node
  if (isAffected) {
    await clearNodeFromCache(nodeId);
  }

  // Check if this node should be an import
  if (importMap[nodeId]) {
    // For import nodes, create a minimal node with just the required info
    return {
      id: itemId,
      amount,
      uniqueId: nodeId,
      isImport: true,
      importedFrom: importMap[nodeId].targetTreeId,
      children: [],
      excess: excessMap[nodeId] || 0
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
      excess: excessMap[nodeId] || 0
    };
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  // Preserve excess value from excessMap for this node
  const nodeExcess = excessMap[nodeId] || 0;
  // Use excess in calculation but don't modify the original excess value
  const cyclesNeeded = (amount + nodeExcess) / outputAmount;

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
    excess: nodeExcess // Use the preserved excess value
  };

  // Store result in cache
  await cacheNode(nodeId, result);

  // console.log(`[${new Date().toISOString()}] Tree calculation complete`, {
  //   nodeCount: countNodes(result),
  //   depth: getTreeDepth(result)
  // });
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
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(getTreeDepth));
};

// Add simple cache functions
const nodeCache = new Map<string, DependencyNode>();

const getNodeFromCache = async (nodeId: string): Promise<DependencyNode | null> => {
  return nodeCache.get(nodeId) || null;
};

const cacheNode = async (nodeId: string, node: DependencyNode): Promise<void> => {
  nodeCache.set(nodeId, node);
};

// Add cache clearing function
const clearNodeFromCache = async (nodeId: string): Promise<void> => {
  nodeCache.delete(nodeId);
};

