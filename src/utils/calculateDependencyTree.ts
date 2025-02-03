import { Recipe } from "../data/dexieDB";
import { getRecipeById, getRecipeByOutput, getRecipesForItem } from "../data/dbQueries";
import { NodePath } from "./treeDiffing";

export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  selectedRecipeId?: string;
  availableRecipes?: Recipe[];
  children?: DependencyNode[];
}

export const calculateDependencyTree = async (
  itemId: string,
  amount: number,
  rootRecipeId: string | null,
  recipeMap: Record<string, string> = {},  // Add recipe map parameter
  depth: number = 0,
  affectedBranches: NodePath[] = []
): Promise<DependencyNode> => {
  // console.log("calculateDependencyTree called:", { itemId, amount, rootRecipeId, recipeMap, depth, affectedBranches });

  const nodeId = `${itemId}-${depth}`; // Create consistent node ID

  // Only use cache if the node is NOT in affected branches
  if (affectedBranches.length > 0 && 
      !affectedBranches.find(b => b.nodeId === nodeId) && 
      !affectedBranches.find(b => b.nodeId.startsWith(nodeId))) {
    const existingNode = await getNodeFromCache(nodeId);
    if (existingNode) {
      return existingNode;
    }
  }

  // Force clear cache for affected nodes
  if (affectedBranches.find(b => b.nodeId === nodeId)) {
    await clearNodeFromCache(nodeId);
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
      children: [] 
    };
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // Pass recipeMap to child calculations
  const children = await Promise.all(
    Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
      calculateDependencyTree(
        inputItem, 
        (inputAmount ?? 0) * cyclesNeeded, 
        null, 
        recipeMap,
        depth + 1,
        affectedBranches
      )
    )
  );

  // ✅ Add byproducts but do NOT process them
  const byproducts = Object.entries(recipe.out)
    .filter(([outputItem]) => outputItem !== itemId) // ✅ Ensure only byproducts
    .map(([outputItem, outputAmount]) => ({
      id: outputItem,
      amount: -(outputAmount * cyclesNeeded), // ✅ Negative production rate
      uniqueId: `${outputItem}-${depth}`,
      isByproduct: true,
      children: [],
    }));

  const result = {
    id: itemId,
    amount,
    uniqueId: nodeId,
    isRoot: depth === 0,
    selectedRecipeId: recipe.id,
    availableRecipes,
    children: [...children, ...byproducts], // ✅ Include byproducts without processing them
  };

  // Store result in cache
  await cacheNode(nodeId, result);
  return result;
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
