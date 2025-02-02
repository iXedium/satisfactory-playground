import { db } from "../data/dexieDB";

export interface AccumulatedDependency {
  id: string;
  amount: number;
  isByproduct?: boolean;
}

const processCount: Record<string, number> = {}; // ✅ Track occurrences

export const calculateAccumulatedDependencies = async (
  itemId: string,
  amount: number,
  results: Record<string, number> = {},
  visitedNodes: Set<string> = new Set()
): Promise<Record<string, number>> => {
  

  const recipe = await db.getRecipeByOutput(itemId);
  if (!recipe) {
    results[itemId] = (results[itemId] || 0) + amount;
    return results;
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // Process all inputs
  await Promise.all(
    Object.entries(recipe.in).map(async ([inputItem, inputAmount]) => {
      const totalRequired = (inputAmount ?? 0) * cyclesNeeded;
      results[inputItem] = (results[inputItem] || 0) + totalRequired;
      await calculateAccumulatedDependencies(inputItem, totalRequired, results, visitedNodes);
    })
  );

  // Process all outputs (including byproducts)
  Object.entries(recipe.out).forEach(([outputItem, outputAmount]) => {
    if (outputItem !== itemId) { // Skip the main product as it's what we're trying to make
      const producedAmount = (outputAmount ?? 0) * cyclesNeeded;
      // Subtract byproduct amounts since they're being produced
      results[outputItem] = (results[outputItem] || 0) - producedAmount;
    }
  });

  return results;
};
