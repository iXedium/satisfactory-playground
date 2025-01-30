import { RootState } from "../store";

export interface AccumulatedDependency {
  id: string;
  amount: number;
}

export const calculateAccumulatedDependencies = (
  itemId: string,
  amount: number,
  state: RootState,
  results: Record<string, number> = {}
): Record<string, number> => {
  const recipe = state.data.recipes.find((r) => r.out[itemId]);

  if (!recipe) {
    // If no recipe exists, assume it's a raw material
    results[itemId] = (results[itemId] || 0) + amount;
    return results;
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // Accumulate all inputs
  for (const [inputItem, inputAmount] of Object.entries(recipe.in)) {
    const totalRequired = (inputAmount ?? 0) * cyclesNeeded;
    results[inputItem] = (results[inputItem] || 0) + totalRequired;

    // Recursively process dependencies
    calculateAccumulatedDependencies(inputItem, totalRequired, state, results);
  }

  return results;
};
