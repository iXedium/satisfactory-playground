/**
 * useMachineCalculation Hook
 * 
 * Custom hook for managing machine-related calculations and state.
 * Provides a consistent interface for components to access machine information.
 */

import { useState, useEffect, useCallback } from 'react';
import { MachineCalculationResult } from '../types/core';
import {
  calculateMachines,
  calculateOptimalMachines,
  calculateExcessForEfficiency,
  getNominalProductionRate
} from '../services/calculation/machineCalculationService';

interface UseMachineCalculationProps {
  itemId: string;
  amount: number;
  recipeId: string | undefined;
  excess?: number;
  machineCount?: number;
  machineMultiplier?: number;
}

interface UseMachineCalculationResult {
  machineData: MachineCalculationResult;
  isLoading: boolean;
  error: string | null;
  nominalRate: number;
  calculateOptimalCount: () => void;
  calculateMaxExcess: () => number;
  efficiency: number;
}

/**
 * Hook for calculating and managing machine-related data
 */
export function useMachineCalculation({
  itemId,
  amount,
  recipeId,
  excess = 0,
  machineCount = 1,
  machineMultiplier = 1
}: UseMachineCalculationProps): UseMachineCalculationResult {
  const [machineData, setMachineData] = useState<MachineCalculationResult>({
    machineCount: 1,
    efficiency: 100,
    machineType: '',
    powerConsumption: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nominalRate, setNominalRate] = useState(0);
  const [efficiency, setEfficiency] = useState(100);

  // Calculate machine data when inputs change
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!recipeId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the nominal production rate
        const rate = await getNominalProductionRate(recipeId, itemId);
        if (isMounted) setNominalRate(rate);
        
        // Calculate machine data
        const result = await calculateMachines(
          itemId,
          amount,
          recipeId,
          excess,
          machineMultiplier
        );
        
        if (isMounted) {
          setMachineData(result);
          setEfficiency(result.efficiency);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error calculating machine data:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [itemId, amount, recipeId, excess, machineCount, machineMultiplier]);

  /**
   * Calculate optimal machine count for 100% efficiency
   */
  const calculateOptimalCount = useCallback(() => {
    if (!recipeId || nominalRate === 0) return;
    
    const optimalCount = calculateOptimalMachines(
      amount,
      excess,
      nominalRate,
      machineMultiplier
    );
    
    return optimalCount;
  }, [amount, excess, nominalRate, machineMultiplier, recipeId]);

  /**
   * Calculate excess needed for 100% efficiency
   */
  const calculateMaxExcess = useCallback((): number => {
    if (!recipeId || nominalRate === 0) return 0;
    
    const excessNeeded = calculateExcessForEfficiency(
      amount,
      machineCount,
      nominalRate,
      machineMultiplier
    );
    
    return excessNeeded;
  }, [amount, machineCount, nominalRate, machineMultiplier, recipeId]);

  return {
    machineData,
    isLoading,
    error,
    nominalRate,
    calculateOptimalCount,
    calculateMaxExcess,
    efficiency
  };
}

export default useMachineCalculation; 