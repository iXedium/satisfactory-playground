import { db } from "../data/dexieDB";

export interface AccumulatedDependency {
  id: string;
  amount: number;
  isByproduct?: boolean;
}

export const calculateAccumulatedDependencies = async (
  itemId: string,
  amount: number,
  results: Record<string, number> = {}
): Promise<Record<string, number>> => {
  const recipe = await db.recipes.where("out").equals(itemId).first(); // ✅ Query Dexie

  if (!recipe) {
    results[itemId] = (results[itemId] || 0) + amount;
    return results;
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // Accumulate all inputs
  for (const [inputItem, inputAmount] of Object.entries(recipe.in)) {
    const totalRequired = (inputAmount ?? 0) * cyclesNeeded;
    results[inputItem] = (results[inputItem] || 0) + totalRequired;
    await calculateAccumulatedDependencies(inputItem, totalRequired, results);
  }

  // Handle byproducts (subtracting from total needs)
  for (const [byproduct, byproductAmount] of Object.entries(recipe.out)) {
    if (byproduct !== itemId) {
      const totalProduced = byproductAmount * cyclesNeeded;
      results[byproduct] = (results[byproduct] || 0) - totalProduced; // ✅ Reduce required amount
    }
  }

  return results;
};
