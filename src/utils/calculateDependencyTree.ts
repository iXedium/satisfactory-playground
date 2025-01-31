import { db } from "../data/dexieDB";

export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  children?: DependencyNode[];
}

let nodeCounter = 0;

export const calculateDependencyTree = async (
  itemId: string,
  amount: number
): Promise<DependencyNode> => {
  const recipe = await db.recipes.where("out").equals(itemId).first(); // ✅ Query Dexie

  if (!recipe) {
    return {
      id: itemId,
      amount,
      uniqueId: `${itemId}-${nodeCounter++}`,
      children: [],
    };
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // Retrieve dependencies dynamically
  const children: DependencyNode[] = [];
  for (const [inputItem, inputAmount] of Object.entries(recipe.in)) {
    const childNode = await calculateDependencyTree(
      inputItem,
      (inputAmount ?? 0) * cyclesNeeded
    );
    children.push(childNode);
  }

  // Handle byproducts
  const byproducts = Object.entries(recipe.out)
    .filter(([outputItem]) => outputItem !== itemId)
    .map(([outputItem, outputAmount]) => ({
      id: outputItem,
      amount: -(outputAmount * cyclesNeeded), // ✅ Negative value for byproducts
      uniqueId: `${outputItem}-${nodeCounter++}`,
      isByproduct: true,
      children: [],
    }));

  return {
    id: itemId,
    amount,
    uniqueId: `${itemId}-${nodeCounter++}`,
    isRoot: true,
    children: [...children, ...byproducts],
  };
};
