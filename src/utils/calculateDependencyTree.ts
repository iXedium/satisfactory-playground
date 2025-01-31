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
  console.log("Calculating Dependency Tree for:", itemId, "Amount:", amount); // ✅ Debugging

  const allRecipes = await db.recipes.toArray();

  // ✅ Only log recipe count instead of full data
  console.log(`🔍 Loaded ${allRecipes.length} Recipes from Dexie.`);

  // ✅ Only log when no recipe is found
  const recipe = allRecipes.find((r) => Object.keys(r.out).includes(itemId));
  if (!recipe) {
    console.warn(`⚠️ No recipe found for ${itemId}, assuming raw material.`);
    return {
      id: itemId,
      amount,
      uniqueId: `${itemId}-${nodeCounter++}`,
      children: [],
    };
  }
 else {
    console.log(`✅ Recipe Found: ${recipe.name}`);
  }

  if (amount === 1) { // ✅ Log only for the first level
    console.log(`🔍 Processing ${itemId} with amount ${amount}`);
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
