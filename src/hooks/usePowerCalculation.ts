/**
 * usePowerCalculation Hook
 * 
 * Custom hook for calculating and managing power consumption data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AccumulatedNode, DependencyNode } from '../types/core';
import { calculateAccumulatedFromTrees } from '../services/calculation/accumulatedViewService';
import { calculatePowerConsumption } from '../services/calculation/machineCalculationService';
import { getMachineForRecipe } from '../data/dbQueries';
import { formatPower } from '../utils/formatting';

interface PowerData {
  totalPower: number;
  formattedTotalPower: string;
  machinesByType: Record<string, { count: number; power: number }>;
  nodesPower: Record<string, number>;
}

interface UsePowerCalculationResult {
  powerData: PowerData;
  isLoading: boolean;
  error: string | null;
  getPowerForNode: (nodeId: string) => number;
  getMachinePowerForNode: (node: DependencyNode) => number;
  refreshPowerData: () => void;
}

/**
 * Hook for calculating and managing power consumption data
 */
export function usePowerCalculation(): UsePowerCalculationResult {
  const trees = useSelector((state: RootState) => state.dependencies.dependencyTrees);
  const machineCountMap = useSelector((state: RootState) => state.machines.machineCount);
  const machineMultiplierMap = useSelector((state: RootState) => state.machines.machineMultiplier);
  
  const [powerData, setPowerData] = useState<PowerData>({
    totalPower: 0,
    formattedTotalPower: '0 MW',
    machinesByType: {},
    nodesPower: {}
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Calculate power consumption for a node
   */
  const getMachinePowerForNode = useCallback((node: DependencyNode): number => {
    if (!node.recipeId) return 0;
    
    try {
      // Get the machine for this recipe
      const machine = getMachineForRecipe(node.recipeId);
      if (!machine) return 0;
      
      // Get machine count and multiplier
      const count = machineCountMap[node.uniqueId] || 0;
      const multiplier = machineMultiplierMap[node.uniqueId] || 1;
      
      // Calculate power consumption
      return calculatePowerConsumption(machine, count, multiplier);
    } catch (err) {
      console.error('Error calculating power for node:', err);
      return 0;
    }
  }, [machineCountMap, machineMultiplierMap]);
  
  /**
   * Get power consumption for a specific node by ID
   */
  const getPowerForNode = useCallback((nodeId: string): number => {
    return powerData.nodesPower[nodeId] || 0;
  }, [powerData.nodesPower]);
  
  /**
   * Calculate power data from all trees
   */
  const calculatePowerData = useCallback(() => {
    try {
      // Get all nodes from all trees
      const accumulatedNodes: AccumulatedNode[] = calculateAccumulatedFromTrees(trees);
      
      // Initialize power data
      const machinesByType: Record<string, { count: number; power: number }> = {};
      const nodesPower: Record<string, number> = {};
      let totalPower = 0;
      
      // Process each node
      for (const node of Object.values(trees).flatMap(getAllNodesInTree)) {
        if (!node.recipeId) continue;
        
        // Get the machine for this recipe
        const machine = getMachineForRecipe(node.recipeId);
        if (!machine) continue;
        
        // Get machine count and multiplier
        const count = machineCountMap[node.uniqueId] || 0;
        const multiplier = machineMultiplierMap[node.uniqueId] || 1;
        
        // Calculate power consumption
        const power = calculatePowerConsumption(machine, count, multiplier);
        
        // Store power for this node
        nodesPower[node.uniqueId] = power;
        
        // Add to total power
        totalPower += power;
        
        // Add to machines by type
        if (!machinesByType[machine.name]) {
          machinesByType[machine.name] = { count: 0, power: 0 };
        }
        machinesByType[machine.name].count += count;
        machinesByType[machine.name].power += power;
      }
      
      // Update power data state
      setPowerData({
        totalPower,
        formattedTotalPower: formatPower(totalPower),
        machinesByType,
        nodesPower
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculating power consumption');
    }
  }, [trees, machineCountMap, machineMultiplierMap]);
  
  /**
   * Traverse a tree and get all nodes
   */
  function getAllNodesInTree(tree: DependencyNode): DependencyNode[] {
    const nodes: DependencyNode[] = [tree];
    
    for (const child of tree.children) {
      nodes.push(...getAllNodesInTree(child));
    }
    
    return nodes;
  }
  
  /**
   * Force refresh of power data
   */
  const refreshPowerData = useCallback(() => {
    setIsLoading(true);
    calculatePowerData();
    setIsLoading(false);
  }, [calculatePowerData]);
  
  // Calculate power data when dependencies change
  useEffect(() => {
    setIsLoading(true);
    calculatePowerData();
    setIsLoading(false);
  }, [calculatePowerData]);
  
  return {
    powerData,
    isLoading,
    error,
    getPowerForNode,
    getMachinePowerForNode,
    refreshPowerData
  };
}

export default usePowerCalculation;