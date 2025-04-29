import { useState, useEffect, useMemo } from 'react';
import { Recipe } from '../../../types';

// Assuming Machine type is defined elsewhere or we define a minimal interface here
// Let's define a minimal one for clarity if not globally available easily
interface MachineData {
  id: string;
  speed: number;
}

interface UseItemNodeCalculationsProps {
  itemId: string;
  amount: number; // Target amount for the node
  excess: number; // Current excess value for this node
  machineCount: number;
  machineMultiplier: number;
  machine: MachineData | null; // Machine assigned to the selected recipe
  selectedRecipeId?: string;
  recipes?: Recipe[]; // Available recipes for the item
}

interface ItemNodeCalculationsResult {
  efficiency: number; // Percentage
  nominalRate: number; // Items per minute per machine at 100% clock speed
}

export const useItemNodeCalculations = ({
  itemId,
  amount,
  excess,
  machineCount,
  machineMultiplier,
  machine,
  selectedRecipeId,
  recipes = [],
}: UseItemNodeCalculationsProps): ItemNodeCalculationsResult => {

  const result = useMemo((): ItemNodeCalculationsResult => {
    let calculatedNominalRate = 0;
    let calculatedEfficiency = 0;

    if (machine && selectedRecipeId && recipes.length > 0) {
      const recipe = recipes.find((r) => r.id === selectedRecipeId);
      if (recipe) {
        // Ensure recipe.time is not zero to avoid division by zero
        if (recipe.time <= 0) {
          console.error(`Recipe ${recipe.id} has invalid time: ${recipe.time}`);
          // Return default values if recipe time is invalid
           return { efficiency: 0, nominalRate: 0 };
        }

        // Find the output amount for the specific itemId in the recipe
        // Use optional chaining and nullish coalescing for safety
        const outputAmount = recipe.out?.[itemId] ?? 0;

        // Calculate base items per minute for one machine at standard speed (1.0)
        const cyclesPerMinute = 60 / recipe.time;
        const itemsPerMinute = outputAmount * cyclesPerMinute;

        // Nominal rate = items/min * machine speed factor
        calculatedNominalRate = itemsPerMinute * machine.speed;

        // Total capacity considering machine count and clock speed (multiplier)
        const totalMachineCapacity =
          machineCount * machineMultiplier * calculatedNominalRate;

        // Calculate efficiency: needed / capacity
        // Needed amount includes the base amount plus any excess designated for this node
        const neededAmount = amount + excess;

        // Avoid division by zero if capacity is zero (e.g., 0 machines or 0 nominal rate)
        calculatedEfficiency = totalMachineCapacity > 0
          ? (neededAmount / totalMachineCapacity) * 100
          : 0; // If capacity is zero, efficiency is effectively zero (or could be Infinity if needed > 0, but 0 makes sense here)

      }
      // If recipe not found, nominalRate and efficiency remain 0
    }
    // If no machine or selected recipe, nominalRate and efficiency remain 0

    // Return the calculated values without rounding here.
    // Rounding can be done in the consuming component if needed for display.
    return {
       // Clamp efficiency between 0 and a reasonable upper bound if desired,
       // or let it exceed 100 to indicate overprovisioning. Let's allow > 100 for now.
      efficiency: calculatedEfficiency,
      nominalRate: calculatedNominalRate,
    };

  // Dependency array includes all inputs that affect the calculation
  }, [
    itemId,
    amount,
    excess,
    machineCount,
    machineMultiplier,
    machine,
    selectedRecipeId,
    recipes,
  ]);

  return result;
}; 