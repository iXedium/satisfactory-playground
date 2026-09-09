import { Recipe } from "../types";
import { getRecipeById, getRecipeByOutput, getRecipesForItem } from "../data";
import { NodePath } from "./treeDiffing";
import { isNodeImporting } from "./nodeReferenceUtils";
import { DependencyNode, Item } from "../types";
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
// Import logger
import { logger } from "./logger";
// Import cycle resolution utilities
import { 
  resolveSelfLoops,
  getCycleDetectionResult,
  getCycleGroupForItem,
  solveCycle,
  buildCycleResolutionMeta
} from "./cycleResolution";

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
  importMap: Record<string, { targetTreeId: string; amount: number }> = {},
  dependencyTrees?: Record<string, DependencyNode>,
  visited: string[] = [],
  externalImports?: Record<string, true>,
  activeCycleResolution?: any // Type will be CycleResolution | undefined
): Promise<DependencyNode | null> => {
  logger.verbose(`[calculateDependencyTree] ENTER: itemId=${itemId}, recipeArg=${rootRecipeId}, depth=${depth}`);

  // Determine the recipe ID that will be used for this node for cycle key
  let recipeIdForCycleKey: string | null = rootRecipeId; // For root or if explicitly passed
  if (depth > 0 || !rootRecipeId) { // For child nodes or if no rootRecipeId given
    if (recipeMap[parentId ? `${parentId}-${itemId}-${depth}` : `${itemId}-${depth}`]) {
      recipeIdForCycleKey = recipeMap[parentId ? `${parentId}-${itemId}-${depth}` : `${itemId}-${depth}`];
    } else {
      // If not in recipeMap, try to get default. If getRecipeByOutput is async, await it.
      // For simplicity in cycle key, we might use a placeholder or actual default recipe ID if readily available.
      // Let's use the itemId itself if no specific recipe is chosen yet for the child for the key.
      // The actual recipe resolution happens later.
      const tempRecipe = await getRecipeByOutput(itemId);
      recipeIdForCycleKey = tempRecipe ? tempRecipe.id : 'no_recipe';
    }
  }

  const visitedKey = `${itemId}_${recipeIdForCycleKey || 'any_recipe'}`;
  if (visited.includes(visitedKey)) {
    logger.warn(`[CIRCULAR DEPENDENCY] Detected for ${itemId} with effective recipe key ${visitedKey}. Depth: ${depth}. Resolving cycle...`);
    const availableRecipesForCyclic = await getRecipesForItem(itemId);
    
    let leafAmount = amount;
    if (activeCycleResolution) {
      const variable = activeCycleResolution.variables.find((v: any) => v.itemId === itemId);
      if (variable) {
        leafAmount = variable.recirculated; // For a back-edge leaf, the amount is the internally recirculated amount
      }
    }

    return {
      id: itemId,
      amount: leafAmount,
      uniqueId: parentId ? `${parentId}-${itemId}-${depth}` : `${itemId}-${depth}`,
      depth: depth,
      availableRecipes: availableRecipesForCyclic,
      children: [], // Internal cycle nodes aren't expanded further
      excess: excessMap[parentId ? `${parentId}-${itemId}-${depth}` : `${itemId}-${depth}`] || 0,
      isCyclicReference: true,
    };
  }
  const newVisited = [...visited, visitedKey];

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
  logger.verbose(`[calculateDependencyTree] RESOLVED: itemId=${itemId}, depth=${depth}, chosenRecipeId=${recipe ? recipe.id : 'none'}`);

  if (!recipe) {
    // Return node even if no recipe (e.g., raw resource)
    return {
      id: itemId,
      amount,
      uniqueId: nodeId,
      depth: depth, // Assign depth here too
      availableRecipes,
      children: [],
      excess: excessMap[itemId] || excessMap[nodeId] || 0,
    };
  }

  // --- Self-loop resolution: detect items in both recipe.in and recipe.out ---
  const selfLoopResult = resolveSelfLoops(recipe, itemId);
  const effectiveInputs = selfLoopResult.hasSelfLoops ? selfLoopResult.netInputs : recipe.in;
  const effectiveOutputs = selfLoopResult.hasSelfLoops ? selfLoopResult.netOutputs : recipe.out;

  if (selfLoopResult.hasSelfLoops) {
    logger.info(`[calculateDependencyTree] Self-loop detected in recipe ${recipe.id} for ${itemId}. ` +
      `Recirculated items: ${Object.keys(selfLoopResult.recirculatedItems).join(', ')}`);
  }

  // --- Multi-Recipe Cycle Resolution (Entry Point) ---
  const { result: cycleDetectionResult, recipesMap: globalRecipesMap } = await getCycleDetectionResult();
  const cycleGroup = getCycleGroupForItem(itemId, cycleDetectionResult);
  
  let currentCycleResolution = activeCycleResolution;
  let cycleMeta;
  let effectiveAmount = amount;

  if (cycleGroup) {
    if (!currentCycleResolution || currentCycleResolution.cycleGroupId !== cycleGroup.id) {
      // Entering a NEW cycle group!
      logger.info(`[calculateDependencyTree] Entering cycle group ${cycleGroup.id} at ${itemId}. Solving...`);
      currentCycleResolution = solveCycle(cycleGroup, { [itemId]: amount + (excessMap[itemId] || excessMap[nodeId] || 0) }, recipeMap, globalRecipesMap);
    }
    
    // We are inside an active cycle. Find our variable.
    const variable = currentCycleResolution.variables.find((v: any) => v.itemId === itemId);
    if (variable) {
      effectiveAmount = variable.grossRequirement;
      cycleMeta = buildCycleResolutionMeta(cycleGroup, currentCycleResolution, itemId);
    }
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded =
    (effectiveAmount + (excessMap[itemId] || excessMap[nodeId] || 0)) / outputAmount;

  // Pass dependencyTrees to child calculations for import references
  // Use effectiveInputs (self-loop adjusted) instead of raw recipe.in
  const childrenPromises = Object.entries(effectiveInputs).map(([inputItem, inputAmount]) => {
    const childAmount = (inputAmount ?? 0) * cyclesNeeded;

    // If this input is externally imported, return a terminal leaf node
    if (externalImports && externalImports[inputItem]) {
      return Promise.resolve({
        id: inputItem,
        amount: childAmount,
        uniqueId: `${nodeId}-${inputItem}-${depth + 1}`,
        depth: depth + 1,
        isExternal: true,
        children: [],
      } as DependencyNode);
    }

    return calculateDependencyTree(
      inputItem,
      childAmount,
      null, // Children determine their own recipe unless specified in recipeMap
      recipeMap,
      depth + 1,
      affectedBranches,
      nodeId, // current node's ID becomes parentId for children
      excessMap,
      importMap,
      dependencyTrees,
      newVisited, // Pass the newVisited array with the current node added
      externalImports,
      currentCycleResolution
    )
  });
  const childrenResults = await Promise.all(childrenPromises);
  const children = childrenResults.filter(child => child !== null) as DependencyNode[]; // Filter out nulls from cycles

  // Calculate byproducts using effectiveOutputs (excludes self-loop resolved items)
  const calculatedByproducts = Object.entries(effectiveOutputs)
    .filter(([outputItem]) => outputItem !== itemId)
    .map(
      ([outputItem, outputAmount]) => {
        const byproductAmount = -(Number(outputAmount) * cyclesNeeded);
        return {
          id: outputItem,
          amount: byproductAmount,
          uniqueId: `${nodeId}-${outputItem}-${depth}`, // Depth should likely be depth+1? No, byproducts are siblings.
          isByproduct: true,
          depth: depth + 1, // Byproducts are effectively 'children' in terms of hierarchy level
          children: [],
          excess: 0,
          selectedRecipeId: undefined, // Explicitly add optional field
          availableRecipes: [], // Explicitly add optional field
        } as DependencyNode;
      }
    );

  // --- Reconcile Byproducts with Normal Children ---
  const finalChildren: DependencyNode[] = [...children];
  const remainingByproducts: DependencyNode[] = [];

  calculatedByproducts.forEach(byproduct => {
    const correspondingChildIndex = finalChildren.findIndex(child => child.id === byproduct.id && !child.isByproduct); // Ensure it's a normal child

    if (correspondingChildIndex !== -1) {
      // Found a normal child for the same item: merge amounts
      const normalChild = finalChildren[correspondingChildIndex];
      console.debug(`[BYPRODUCT MERGE] Merging byproduct ${byproduct.id} (${byproduct.amount}) into normal child ${normalChild.id} (${normalChild.amount})`);
      // Ensure amounts are numbers before adding
      const currentAmount = Number(normalChild.amount) || 0;
      const byproductAmount = Number(byproduct.amount) || 0;
      normalChild.amount = currentAmount + byproductAmount;
      // Update the child in the array (though modifying in place works too)
      finalChildren[correspondingChildIndex] = normalChild;
    } else {
      // No corresponding normal child found, keep the byproduct
      remainingByproducts.push(byproduct);
    }
  });
  // --- End Reconciliation ---

  const result: DependencyNode = {
    id: itemId,
    amount: effectiveAmount,
    uniqueId: nodeId,
    depth: depth, // Assign depth here
    isRoot: depth === 0,
    recipe: recipe,
    availableRecipes,
    // Combine the modified children list and the remaining byproducts
    children: [...finalChildren, ...remainingByproducts],
    excess: excessMap[itemId] || excessMap[nodeId] || 0,
    ...(cycleMeta ? { cycleResolution: cycleMeta } : {})
  };

  // Store result in cache
  await cacheNode(nodeId, result);

  return result;
};
