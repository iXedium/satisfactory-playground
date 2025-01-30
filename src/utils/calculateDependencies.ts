import { RootState } from "../store";

export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string; // ✅ Ensure uniqueness
  children?: DependencyNode[];
}

let nodeCounter = 0; // ✅ Use a counter to generate unique IDs

export const calculateDependencyTree = (
  itemId: string,
  amount: number,
  state: RootState
): DependencyNode => {
  const recipe = state.data.recipes.find((r) => r.out[itemId]);

  if (!recipe) {
    // If no recipe exists, assume it's a raw material
    return { id: itemId, amount, uniqueId: `${itemId}-${nodeCounter++}`, children: [] };
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // Recursively calculate sub-dependencies
  const children = Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
    calculateDependencyTree(inputItem, (inputAmount ?? 0) * cyclesNeeded, state)
  );

  return {
    id: itemId,
    amount,
    uniqueId: `${itemId}-${nodeCounter++}`, // ✅ Ensure unique ID
    children,
  };
};
