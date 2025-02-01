import { db } from "../data/dexieDB";

export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  children?: DependencyNode[];
}

const MAX_DEPTH = 200;
let nodeCounter = 0;

const processCount: Record<string, number> = {}; // ✅ Track occurrences

const MAX_CALLS = 100; // ✅ Prevent excessive recursion
let totalCalls = 0;

const maxDepthPerItem: Record<string, number> = {}; // ✅ Track depth per item
const MAX_DEPTH_PER_ITEM = 50; // ✅ Prevent infinite recursion for any single item

export const calculateDependencyTree = async (
  itemId: string,
  amount: number,
  depth: number = 0
): Promise<DependencyNode> => {
  console.log(`🔍 Processing ${itemId}, Depth: ${depth}`);

  const recipe = await db.getRecipeByOutput(itemId);
  if (!recipe) {
    return { id: itemId, amount, uniqueId: `${itemId}-${depth}`, children: [] };
  }

  console.log(`✅ Recipe Found: ${recipe.name}`);

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // ✅ Only process main inputs (skip byproducts)
  const children = await Promise.all(
    Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
      calculateDependencyTree(inputItem, (inputAmount ?? 0) * cyclesNeeded, depth + 1)
    )
  );

  // ✅ Add byproducts but do NOT process them
  const byproducts = Object.entries(recipe.out)
    .filter(([outputItem]) => outputItem !== itemId) // ✅ Ensure only byproducts
    .map(([outputItem, outputAmount]) => ({
      id: outputItem,
      amount: -(outputAmount * cyclesNeeded), // ✅ Negative production rate
      uniqueId: `${outputItem}-${depth}`,
      isByproduct: true,
      children: [],
    }));

  return {
    id: itemId,
    amount,
    uniqueId: `${itemId}-${depth}`,
    isRoot: depth === 0,
    children: [...children, ...byproducts], // ✅ Include byproducts without processing them
  };
};





// export const calculateDependencyTree = async (
//   itemId: string,
//   amount: number,
//   depth: number = 0
// ): Promise<DependencyNode> => {
//   if (depth === 0) {
//     Object.keys(processCount).forEach((key) => delete processCount[key]); // ✅ Reset count for new calculations
//     console.log("🔄 Reset process count for new calculation.");
//   }

//   processCount[itemId] = (processCount[itemId] || 0) + 1;

//   console.log(`🔍 Processing ${itemId}, Depth: ${depth}, Count: ${processCount[itemId]}`);

//   const recipe = await db.getRecipeByOutput(itemId);
//   if (!recipe) {
//     return { id: itemId, amount, uniqueId: `${itemId}-${depth}`, children: [] };
//   }

//   const outputAmount = recipe.out[itemId] ?? 1;
//   const cyclesNeeded = amount / outputAmount;

//   const children = await Promise.all(
//     Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
//       calculateDependencyTree(inputItem, (inputAmount ?? 0) * cyclesNeeded, depth + 1)
//     )
//   );

//   return {
//     id: itemId,
//     amount,
//     uniqueId: `${itemId}-${depth}`,
//     children,
//   };
// };

