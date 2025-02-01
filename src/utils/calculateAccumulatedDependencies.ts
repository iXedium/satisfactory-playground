import { db } from "../data/dexieDB";

export interface AccumulatedDependency {
  id: string;
  amount: number;
  isByproduct?: boolean;
}

const visitedNodes = new Set<string>();
const processCount: Record<string, number> = {}; // ✅ Track occurrences

export const calculateAccumulatedDependencies = async (
  itemId: string,
  amount: number,
  results: Record<string, number> = {},
  visitedNodes: Set<string> = new Set()
): Promise<Record<string, number>> => {
  if (visitedNodes.has(itemId)) {
    console.warn(`⚠️ Circular dependency detected: ${itemId}, skipping.`);
    return results;
  }
  visitedNodes.add(itemId);

  console.log(`🔍 Accumulating dependencies for ${itemId}`);

  const recipe = await db.getRecipeByOutput(itemId);
  if (!recipe) {
    results[itemId] = (results[itemId] || 0) + amount;
    return results;
  }

  console.log(`✅ Recipe Found: ${recipe.name}`);

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // ✅ Process only required inputs (ignore byproducts)
  await Promise.all(
    Object.entries(recipe.in).map(async ([inputItem, inputAmount]) => {
      const totalRequired = (inputAmount ?? 0) * cyclesNeeded;
      results[inputItem] = (results[inputItem] || 0) + totalRequired;
      await calculateAccumulatedDependencies(inputItem, totalRequired, results, visitedNodes);
    })
  );

  return results;
};




