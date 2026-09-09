import { Recipe } from '../../types';
import { CycleGroup } from './cycleDetector';
import { logger } from '../logger';

/** A single variable in the cycle's linear system */
export interface CycleVariable {
  itemId: string;
  recipeId: string;
  /** Demand from outside the cycle */
  externalDemand: number;
  /** Total requirement including internal recirculation */
  grossRequirement: number;
  /** What must be supplied externally (after subtracting recycled input) */
  netRequirement: number;
  /** Amount flowing back within the cycle */
  recirculated: number;
  /** Recipe cycles per minute for this item's recipe */
  cyclesPerMinute: number;
}

/** Result of solving a cycle */
export interface CycleResolution {
  /** Whether the solver converged within tolerance */
  converged: boolean;
  /** Number of iterations taken */
  iterations: number;
  /** Resolved variables for each item in the cycle */
  variables: CycleVariable[];
  /** Final convergence error (max delta between last two iterations) */
  tolerance: number;
}

/** Metadata attached to a resolved cyclic node in the dependency tree */
export interface CycleResolutionMeta {
  /** ID of the cycle group this node belongs to */
  cycleGroupId: string;
  /** Gross (total) requirement before accounting for recirculation */
  grossRequirement: number;
  /** Net external requirement (what the user must supply) */
  netRequirement: number;
  /** Amount recirculated within the cycle */
  recirculated: number;
  /** Whether the solver converged */
  converged: boolean;
  /** Item IDs involved in this cycle */
  involvedItems: string[];
}

/**
 * Solve a multi-recipe cycle using iterative fixed-point relaxation.
 *
 * The algorithm works by:
 * 1. Starting with only external demands (flows within the cycle = 0).
 * 2. For each item in the cycle, computing how many recipe cycles are needed
 *    to meet external demand + internal demand from other cycle recipes.
 * 3. Computing the byproducts of those recipe cycles, which feed back as
 *    inputs to other cycle recipes.
 * 4. Repeating until all flows stabilize (change < tolerance).
 *
 * @param cycleGroup - The detected cycle group to solve
 * @param externalDemands - External demand per item (from outside the cycle)
 * @param recipeSelections - User's recipe choices (itemId → recipeId)
 * @param recipes - Map of recipeId → Recipe for lookup
 * @param maxIterations - Maximum iterations before giving up (default: 50)
 * @param tolerance - Convergence threshold (default: 0.001)
 */
export function solveCycle(
  cycleGroup: CycleGroup,
  externalDemands: Record<string, number>,
  recipeSelections: Record<string, string>,
  recipes: Map<string, Recipe>,
  maxIterations: number = 50,
  tolerance: number = 0.001
): CycleResolution {
  const itemIds = Array.from(cycleGroup.itemIds);

  // Step 1: Determine which recipe each item in the cycle uses.
  // Prefer user's selection; fall back to first recipe in the cycle that produces this item.
  const itemRecipes = new Map<string, Recipe>();
  for (const itemId of itemIds) {
    let recipe: Recipe | undefined;

    // Check user selection first
    const selectedRecipeId = recipeSelections[itemId];
    if (selectedRecipeId && cycleGroup.recipeIds.has(selectedRecipeId)) {
      recipe = recipes.get(selectedRecipeId);
    }

    // Fall back to first cycle recipe that produces this item
    if (!recipe) {
      for (const recipeId of cycleGroup.recipeIds) {
        const candidate = recipes.get(recipeId);
        if (candidate && candidate.out[itemId] !== undefined) {
          recipe = candidate;
          break;
        }
      }
    }

    if (recipe) {
      itemRecipes.set(itemId, recipe);
    } else {
      logger.warn(`[CycleSolver] No recipe found for item ${itemId} in cycle ${cycleGroup.id}`);
    }
  }

  // Step 2: Initialize flow state — track how much of each item is produced per minute
  // internalSupply[itemId] = amount of itemId produced as a byproduct within the cycle
  const internalSupply: Record<string, number> = {};
  // totalDemand[itemId] = external demand + internal demand from other cycle recipes
  const totalDemand: Record<string, number> = {};
  // production[itemId] = how much of this item's recipe runs (items/min of main product)
  const production: Record<string, number> = {};

  for (const itemId of itemIds) {
    internalSupply[itemId] = 0;
    totalDemand[itemId] = externalDemands[itemId] || 0;
    production[itemId] = 0;
  }

  // Step 3: Iterate until convergence
  let converged = false;
  let iterations = 0;
  let maxDelta = Infinity;

  while (iterations < maxIterations && !converged) {
    iterations++;
    maxDelta = 0;

    // For each item in the cycle, calculate how much we need to produce
    for (const itemId of itemIds) {
      const recipe = itemRecipes.get(itemId);
      if (!recipe) continue;

      const outputAmount = recipe.out[itemId] || 1;
      const cycleTime = recipe.time || 1;
      const cyclesPerMinute = 60 / cycleTime;
      const outputPerMinute = outputAmount * cyclesPerMinute;

      // Total demand = external demand + demand from other cycle items that consume this item
      const extDemand = externalDemands[itemId] || 0;
      let intDemand = 0;

      // Check which other cycle items consume this item as input
      for (const otherItemId of itemIds) {
        if (otherItemId === itemId) continue;
        const otherRecipe = itemRecipes.get(otherItemId);
        if (!otherRecipe || !otherRecipe.in[itemId]) continue;

        // How much of this item does the other recipe consume per cycle?
        const inputAmountPerCycle = otherRecipe.in[itemId];
        const otherOutputAmount = otherRecipe.out[otherItemId] || 1;
        const otherCycleTime = otherRecipe.time || 1;
        const otherCyclesPerMinute = 60 / otherCycleTime;

        // How many cycles of the other recipe run per minute?
        const otherProduction = production[otherItemId] || 0;
        const otherCyclesNeeded = otherProduction / (otherOutputAmount * otherCyclesPerMinute);

        intDemand += inputAmountPerCycle * otherCyclesNeeded * otherCyclesPerMinute;
      }

      const newTotalDemand = extDemand + intDemand;

      // How much do we need to produce? Subtract internal supply (byproducts from other recipes)
      const netNeeded = Math.max(0, newTotalDemand - (internalSupply[itemId] || 0));

      const oldProduction = production[itemId] || 0;
      const newProduction = netNeeded;

      const delta = Math.abs(newProduction - oldProduction);
      maxDelta = Math.max(maxDelta, delta);

      production[itemId] = newProduction;
      totalDemand[itemId] = newTotalDemand;
    }

    // After updating all productions, recalculate internal supply (byproducts)
    for (const itemId of itemIds) {
      internalSupply[itemId] = 0;
    }

    for (const itemId of itemIds) {
      const recipe = itemRecipes.get(itemId);
      if (!recipe) continue;

      const outputAmount = recipe.out[itemId] || 1;
      const cycleTime = recipe.time || 1;
      const cyclesPerMinute = 60 / cycleTime;

      // How many cycles of this recipe run?
      const cyclesNeeded = production[itemId] / (outputAmount * cyclesPerMinute);

      // Check byproducts — other cycle items produced by this recipe
      for (const [outItemId, outAmount] of Object.entries(recipe.out)) {
        if (outItemId === itemId) continue; // Skip the main product
        if (cycleGroup.itemIds.has(outItemId)) {
          internalSupply[outItemId] += outAmount * cyclesNeeded * cyclesPerMinute;
        }
      }
    }

    converged = maxDelta < tolerance;
  }

  if (!converged) {
    logger.warn(`[CycleSolver] Failed to converge for cycle ${cycleGroup.id} after ${iterations} iterations (maxDelta=${maxDelta})`);
  } else {
    logger.info(`[CycleSolver] Cycle ${cycleGroup.id} converged in ${iterations} iterations`);
  }

  // Step 4: Build result variables
  const variables: CycleVariable[] = itemIds.map(itemId => {
    const recipe = itemRecipes.get(itemId);
    const extDemand = externalDemands[itemId] || 0;
    const prod = production[itemId] || 0;
    const internal = internalSupply[itemId] || 0;
    const intDemand = (totalDemand[itemId] || 0) - extDemand;
    const cycleTime = recipe?.time || 1;
    const cyclesPerMinute = 60 / cycleTime;

    return {
      itemId,
      recipeId: recipe?.id || '',
      externalDemand: extDemand,
      grossRequirement: prod + internal,
      netRequirement: prod,
      recirculated: Math.max(internal, intDemand), // Amount flowing between nodes in the cycle
      cyclesPerMinute,
    };
  });

  return {
    converged,
    iterations,
    variables,
    tolerance: maxDelta,
  };
}

/**
 * Build a CycleResolutionMeta object for attaching to a DependencyNode.
 */
export function buildCycleResolutionMeta(
  cycleGroup: CycleGroup,
  resolution: CycleResolution,
  itemId: string
): CycleResolutionMeta {
  const variable = resolution.variables.find(v => v.itemId === itemId);
  return {
    cycleGroupId: cycleGroup.id,
    grossRequirement: variable?.grossRequirement ?? 0,
    netRequirement: variable?.netRequirement ?? 0,
    recirculated: variable?.recirculated ?? 0,
    converged: resolution.converged,
    involvedItems: Array.from(cycleGroup.itemIds),
  };
}
