/**
 * MachineCalculationService
 * 
 * Responsible for calculating machine requirements, efficiency, and related values.
 * This service encapsulates the machine-related business logic.
 */

import { Recipe, Machine, MachineCalculationResult } from '../../types/core';
import { getRecipeById, getMachineForRecipe } from '../../data/dbQueries';
import { memoize } from '../cache/cacheService';

// Memoize database queries for better performance
const memoizedGetMachine = memoize(
  async (recipeId: string) => getMachineForRecipe(recipeId),
  (recipeId) => `machine-${recipeId}`
);

const memoizedGetRecipe = memoize(
  async (recipeId: string) => getRecipeById(recipeId),
  (recipeId) => `recipe-${recipeId}`
);

/**
 * Calculate the number of machines needed for a recipe
 * 
 * @param itemId - The ID of the item being produced
 * @param amount - The amount to produce per minute
 * @param recipeId - The recipe ID to use
 * @param excess - Additional amount to produce (excess)
 * @param machineMultiplier - Machine efficiency multiplier (overclocking)
 * @returns Promise resolving to machine count and related info
 */
export async function calculateMachines(
  itemId: string,
  amount: number,
  recipeId: string,
  excess: number = 0,
  machineMultiplier: number = 1
): Promise<MachineCalculationResult> {
  try {
    // Get recipe and machine data
    const [recipe, machine] = await Promise.all([
      memoizedGetRecipe(recipeId),
      memoizedGetMachine(recipeId)
    ]);

    if (!recipe || !machine) {
      throw new Error(`Recipe or machine not found for ${recipeId}`);
    }

    // Calculate nominal production rate
    const outputAmount = recipe.out[itemId] || 1;
    const cyclesPerMinute = 60 / recipe.time;
    const itemsPerMinute = outputAmount * cyclesPerMinute;
    const productionRatePerMachine = itemsPerMinute * machine.speed * machineMultiplier;

    // Calculate machines needed
    const totalNeeded = amount + excess;
    const machineCount = Math.ceil(totalNeeded / productionRatePerMachine);
    
    // Calculate efficiency
    const totalCapacity = machineCount * productionRatePerMachine;
    const efficiency = (totalNeeded / totalCapacity) * 100;
    
    // Calculate power consumption
    const powerPerMachine = calculatePowerConsumption(machine, machineMultiplier);
    const totalPower = powerPerMachine * machineCount;

    return {
      machineCount,
      efficiency,
      machineType: machine.id,
      powerConsumption: totalPower
    };
  } catch (error) {
    console.error('Error calculating machines:', error);
    return {
      machineCount: 1,
      efficiency: 100,
      machineType: 'unknown',
      powerConsumption: 0
    };
  }
}

/**
 * Calculate the power consumption for a machine with the given multiplier
 * 
 * @param machine - The machine data
 * @param multiplier - The efficiency multiplier (overclocking)
 * @returns The power consumption in MW
 */
export function calculatePowerConsumption(machine: Machine, multiplier: number): number {
  // Power scales with the 1.6 power of the clock speed
  // This is a simplified formula based on the game's mechanics
  const powerScaling = Math.pow(multiplier, 1.6);
  return machine.usage * powerScaling;
}

/**
 * Calculate the optimal machine count for 100% efficiency
 * 
 * @param amount - Amount to produce
 * @param excess - Excess production
 * @param nominalRate - Production rate per machine
 * @param multiplier - Machine multiplier
 * @returns The optimal machine count
 */
export function calculateOptimalMachines(
  amount: number,
  excess: number,
  nominalRate: number,
  multiplier: number
): number {
  const totalNeeded = amount + excess;
  return Math.ceil(totalNeeded / (nominalRate * multiplier));
}

/**
 * Calculate the excess needed for 100% efficiency
 * 
 * @param amount - Amount to produce
 * @param machineCount - Number of machines
 * @param nominalRate - Production rate per machine
 * @param multiplier - Machine multiplier
 * @returns The excess needed for 100% efficiency
 */
export function calculateExcessForEfficiency(
  amount: number,
  machineCount: number,
  nominalRate: number,
  multiplier: number
): number {
  const totalCapacity = machineCount * nominalRate * multiplier;
  return Math.max(0, totalCapacity - amount);
}

/**
 * Get nominal production rate for a recipe and machine
 * 
 * @param recipeId - The recipe ID
 * @param itemId - The output item ID
 * @returns Promise resolving to the nominal production rate
 */
export async function getNominalProductionRate(
  recipeId: string,
  itemId: string
): Promise<number> {
  try {
    const [recipe, machine] = await Promise.all([
      memoizedGetRecipe(recipeId),
      memoizedGetMachine(recipeId)
    ]);

    if (!recipe || !machine) {
      return 0;
    }

    const outputAmount = recipe.out[itemId] || 1;
    const cyclesPerMinute = 60 / recipe.time;
    return outputAmount * cyclesPerMinute * machine.speed;
  } catch (error) {
    console.error('Error calculating nominal rate:', error);
    return 0;
  }
} 