/**
 * useCalculator Hook
 * 
 * Custom hook for managing calculator state and performing calculations.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getRecipesForItem, getItemById, getMachineForRecipe } from '../data/dbQueries';
import { Item, Recipe, Machine } from '../types/core';

interface CalculatorInput {
  itemId: string;
  recipeId: string;
  productionRate: number;
}

interface ResourceRequirement {
  itemId: string;
  name: string;
  amount: number;
  isRawMaterial: boolean;
}

interface MachineRequirement {
  machineId: string;
  machineName: string;
  count: number;
  efficiency: number;
  powerConsumption: number;
}

interface CalculatorResult {
  resources: ResourceRequirement[];
  machines: MachineRequirement[];
  totalPower: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for calculator functionality
 */
export default function useCalculator(initialInput?: Partial<CalculatorInput>) {
  // State for user inputs
  const [itemId, setItemId] = useState<string>(initialInput?.itemId || '');
  const [recipeId, setRecipeId] = useState<string>(initialInput?.recipeId || '');
  const [productionRate, setProductionRate] = useState<number>(initialInput?.productionRate || 0);
  
  // State for data
  const [item, setItem] = useState<Item | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [machine, setMachine] = useState<Machine | null>(null);
  
  // State for loading and errors
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load item data when itemId changes
  useEffect(() => {
    if (!itemId) {
      setItem(null);
      setAvailableRecipes([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    Promise.all([
      getItemById(itemId),
      getRecipesForItem(itemId)
    ])
      .then(([fetchedItem, fetchedRecipes]) => {
        setItem(fetchedItem || null);
        setAvailableRecipes(fetchedRecipes || []);
        
        // If we have recipes but no selected recipe, select the first one
        if (fetchedRecipes && fetchedRecipes.length > 0 && !recipeId) {
          setRecipeId(fetchedRecipes[0].id);
        }
      })
      .catch(err => {
        console.error('Error fetching item data:', err);
        setError('Failed to fetch item data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [itemId]);
  
  // Load recipe data when recipeId changes
  useEffect(() => {
    if (!recipeId) {
      setRecipe(null);
      setMachine(null);
      return;
    }
    
    // Set the selected recipe from available recipes
    const selectedRecipe = availableRecipes.find(r => r.id === recipeId) || null;
    setRecipe(selectedRecipe);
    
    // Load the machine for this recipe
    if (selectedRecipe) {
      getMachineForRecipe(selectedRecipe.id)
        .then(fetchedMachine => {
          setMachine(fetchedMachine || null);
        })
        .catch(err => {
          console.error('Error fetching machine data:', err);
          setError('Failed to fetch machine data');
        });
    }
  }, [recipeId, availableRecipes]);
  
  // Calculate resource requirements
  const resourceRequirements = useMemo((): ResourceRequirement[] => {
    if (!recipe || !productionRate) return [];
    
    return Object.entries(recipe.in || {}).map(([ingredientId, amount]) => {
      // Calculate ingredient amount based on production rate
      const scaledAmount = (amount / (recipe.out[itemId] || 1)) * productionRate;
      
      return {
        itemId: ingredientId,
        name: ingredientId, // This should be replaced with actual name from DB
        amount: scaledAmount,
        isRawMaterial: true // This would need actual logic to determine if it's a raw material
      };
    });
  }, [recipe, productionRate, itemId]);
  
  // Calculate machine requirements
  const machineRequirements = useMemo((): MachineRequirement[] => {
    if (!recipe || !machine || !productionRate) return [];
    
    // Calculate machine stats
    const outputAmount = recipe.out[itemId] || 1;
    const cyclesPerMinute = 60 / recipe.time;
    const itemsPerMinute = outputAmount * cyclesPerMinute;
    const productionPerMachine = itemsPerMinute * (machine.speed || 1);
    
    // Calculate how many machines we need
    const machineCount = Math.ceil(productionRate / productionPerMachine);
    
    // Calculate efficiency
    const efficiency = (productionRate / (machineCount * productionPerMachine)) * 100;
    
    // Calculate power consumption
    const powerPerMachine = machine.power || 0;
    const totalPower = powerPerMachine * machineCount;
    
    return [{
      machineId: machine.id,
      machineName: machine.name || 'Unknown Machine',
      count: machineCount,
      efficiency,
      powerConsumption: totalPower
    }];
  }, [recipe, machine, productionRate, itemId]);
  
  // Calculate total power consumption
  const totalPower = useMemo(() => {
    return machineRequirements.reduce((sum, machine) => sum + machine.powerConsumption, 0);
  }, [machineRequirements]);
  
  // Handler functions
  const handleItemSelect = useCallback((newItemId: string) => {
    setItemId(newItemId);
    setRecipeId(''); // Reset recipe when item changes
  }, []);
  
  const handleRecipeSelect = useCallback((newRecipeId: string) => {
    setRecipeId(newRecipeId);
  }, []);
  
  const handleProductionRateChange = useCallback((newRate: number) => {
    setProductionRate(newRate);
  }, []);
  
  return {
    // Input state
    itemId,
    recipeId,
    productionRate,
    
    // Data
    item,
    recipe,
    availableRecipes,
    machine,
    
    // Calculated results
    resourceRequirements,
    machineRequirements,
    totalPower,
    
    // Loading state
    isLoading,
    error,
    
    // Actions
    setItemId: handleItemSelect,
    setRecipeId: handleRecipeSelect,
    setProductionRate: handleProductionRateChange
  };
} 