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
  if (amount === 1) { // ✅ Log only for first level
    console.log(`🔍 Accumulating dependencies for ${itemId}`);
  }


  const recipe = await db.recipes.where("out").equals(itemId).first(); // ✅ Query Dexie

  if (!recipe) {
    results[itemId] = (results[itemId] || 0) + amount;
    return results;
  }


  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // Accumulate all inputs (await recursive calls)
  await Promise.all(
    Object.entries(recipe.in).map(async ([inputItem, inputAmount]) => {
      const totalRequired = (inputAmount ?? 0) * cyclesNeeded;
      results[inputItem] = (results[inputItem] || 0) + totalRequired;
      await calculateAccumulatedDependencies(inputItem, totalRequired, results); // ✅ Ensure full resolution
    })
  );

  // Handle byproducts (subtracting from total needs)
  for (const [byproduct, byproductAmount] of Object.entries(recipe.out)) {
    if (byproduct !== itemId) {
      const totalProduced = byproductAmount * cyclesNeeded;
      results[byproduct] = (results[byproduct] || 0) - totalProduced; // ✅ Reduce required amount
    }
  }

  return results;
};
