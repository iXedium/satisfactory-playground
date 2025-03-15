import { getRecipeById, getRecipeByOutput, getRecipesForItem } from "../data/dbQueries";
const logPerf = (label, start) => {
    const elapsed = performance.now() - start;
    // console.log(`[${new Date().toISOString()}] ${label}: ${elapsed.toFixed(2)}ms`);
};
export const calculateDependencyTree = async (itemId, amount, rootRecipeId, recipeMap = {}, // Add recipe map parameter
depth = 0, affectedBranches = [], parentId = '', // Add parentId parameter
excessMap = {} // Add excessMap parameter
) => {
    const start = performance.now();
    // console.log(`[${new Date().toISOString()}] Starting tree calculation for ${itemId}`);
    // Create unique ID that includes parent path
    const nodeId = parentId ? `${parentId}-${itemId}-${depth}` : `${itemId}-${depth}`;
    // Only check if current node or its children are affected
    // Remove parent check since changes don't affect upstream
    const isAffected = affectedBranches.some(b => b.nodeId === nodeId || // Direct match
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
    // Get available recipes for this item
    const availableRecipes = await getRecipesForItem(itemId);
    let recipe;
    // Check recipe map first, then fallback to root recipe or default
    if (recipeMap[nodeId]) {
        recipe = await getRecipeById(recipeMap[nodeId]);
    }
    else if (depth === 0 && rootRecipeId) {
        recipe = await getRecipeById(rootRecipeId);
    }
    else {
        recipe = await getRecipeByOutput(itemId);
    }
    if (!recipe) {
        return {
            id: itemId,
            amount,
            uniqueId: nodeId,
            availableRecipes,
            children: [],
            excess: excessMap[nodeId] || 0 // Add excess from map
        };
    }
    const outputAmount = recipe.out[itemId] ?? 1;
    const cyclesNeeded = (amount + (excessMap[nodeId] || 0)) / outputAmount; // Add excess to required amount
    // Pass recipeMap to child calculations
    const children = await Promise.all(Object.entries(recipe.in).map(([inputItem, inputAmount]) => calculateDependencyTree(inputItem, (inputAmount ?? 0) * cyclesNeeded, null, recipeMap, depth + 1, affectedBranches, nodeId, // Pass current nodeId as parent
    excessMap // Pass excessMap to child calculations
    )));
    // ✅ Add byproducts but do NOT process them
    const byproducts = Object.entries(recipe.out)
        .filter(([outputItem]) => outputItem !== itemId) // ✅ Ensure only byproducts
        .map(([outputItem, outputAmount]) => ({
        id: outputItem,
        amount: -(outputAmount * cyclesNeeded), // ✅ Negative production rate
        uniqueId: `${nodeId}-${outputItem}-${depth}`, // Include parent path
        isByproduct: true,
        children: [],
        excess: 0 // Add default excess
    })); // Cast to DependencyNode
    const result = {
        id: itemId,
        amount,
        uniqueId: nodeId,
        isRoot: depth === 0,
        selectedRecipeId: recipe.id,
        availableRecipes,
        children: [...children, ...byproducts], // ✅ Include byproducts without processing them
        excess: excessMap[nodeId] || 0 // Add excess from map
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
const countNodes = (node) => {
    let count = 1;
    node.children?.forEach(child => count += countNodes(child));
    return count;
};
const getTreeDepth = (node) => {
    if (!node.children?.length)
        return 1;
    return 1 + Math.max(...node.children.map(getTreeDepth));
};
// Add simple cache functions
const nodeCache = new Map();
const getNodeFromCache = async (nodeId) => {
    return nodeCache.get(nodeId) || null;
};
const cacheNode = async (nodeId, node) => {
    nodeCache.set(nodeId, node);
};
// Add cache clearing function
const clearNodeFromCache = async (nodeId) => {
    nodeCache.delete(nodeId);
};
