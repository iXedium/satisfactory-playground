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
import { findNodeByIdInAllTrees } from "./treeUtils";

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
  parentId: string = "",
  excessMap: Record<string, number> = {},
  importMap: Record<string, { targetTreeId: string; amount: number }> = {}, // Legacy import system - will be deprecated
  dependencyTrees?: Record<string, DependencyNode> // Access to all trees for import references
): Promise<DependencyNode> => {
  // const start = performance.now(); // Remove perf logging for now

  // Create unique ID that includes parent path
  const nodeId = parentId
    ? `${parentId}-${itemId}-${depth}`
    : `${itemId}-${depth}`;

  // Only check if current node or its children are affected
  const isAffected = affectedBranches.some(
    (b) =>
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
          excess: excessMap[itemId] || excessMap[nodeId] || 0,
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
        existingNode,
        itemId,
        amount,
        nodeId,
        excessMap[itemId] || excessMap[nodeId] || 0,
        recipeMap[nodeId],
        undefined,
        existingNode
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
    // Return node even if no recipe (e.g., raw resource)
    return {
      id: itemId,
      amount,
      uniqueId: nodeId,
      depth: depth, // Correct depth assignment
      availableRecipes,
      children: [],
      excess: excessMap[itemId] || excessMap[nodeId] || 0,
    };
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded =
    (amount + (excessMap[itemId] || excessMap[nodeId] || 0)) / outputAmount;

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
    .map(
      ([outputItem, outputAmount]) => {
        const byproductAmount = -(Number(outputAmount) * cyclesNeeded);
        // Create the byproduct node object
        const byproductNode: DependencyNode = {
          id: outputItem,
          amount: byproductAmount, 
          uniqueId: `${nodeId}-${outputItem}-${depth}`, // ID uses parent depth
          depth: depth, // Byproduct exists at the SAME depth as its parent
          isByproduct: true,
          children: [],
          excess: 0,
          recipe: undefined, // Byproducts don't have a recipe themselves
          availableRecipes: [], 
          isRoot: false, // Byproducts are never roots initially
          // Ensure other optional fields are handled if needed by type definition
        };
        return byproductNode;
      }
    );

  const result: DependencyNode = {
    id: itemId,
    amount,
    uniqueId: nodeId,
    depth: depth, 
    isRoot: depth === 0,
    recipe: recipe,
    availableRecipes,
    children: [...children, ...byproducts],
    excess: excessMap[itemId] || excessMap[nodeId] || 0,
  };

  // Store result in cache
  await cacheNode(nodeId, result);
  // logPerf('Total tree calculation', start); // Removed perf logging

  return result;
};
