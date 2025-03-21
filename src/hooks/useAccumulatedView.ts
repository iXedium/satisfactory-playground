/**
 * useAccumulatedView Hook
 * 
 * Custom hook for managing the accumulated view of resources across dependency trees.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AccumulatedNode } from '../types/core';
import { 
  calculateAccumulatedFromTrees,
  filterAccumulatedNodes,
  mergeAccumulatedWithMachines
} from '../services/calculation/accumulatedViewService';

interface AccumulatedViewOptions {
  showByproducts?: boolean;
  minAmount?: number;
  filterItemIds?: string[];
}

interface UseAccumulatedViewProps {
  options?: AccumulatedViewOptions;
}

interface UseAccumulatedViewResult {
  accumulatedNodes: AccumulatedNode[];
  isLoading: boolean;
  error: string | null;
  updateOptions: (newOptions: Partial<AccumulatedViewOptions>) => void;
  refreshAccumulatedView: () => void;
}

/**
 * Hook for managing accumulated view data
 */
export function useAccumulatedView({
  options: initialOptions = {}
}: UseAccumulatedViewProps = {}): UseAccumulatedViewResult {
  const trees = useSelector((state: RootState) => state.dependencies.dependencyTrees);
  const machineCountMap = useSelector((state: RootState) => state.machines.machineCount);
  const machineMultiplierMap = useSelector((state: RootState) => state.machines.machineMultiplier);
  
  const [accumulatedNodes, setAccumulatedNodes] = useState<AccumulatedNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AccumulatedViewOptions>(initialOptions);
  
  /**
   * Update the filter options
   */
  const updateOptions = useCallback((newOptions: Partial<AccumulatedViewOptions>) => {
    setOptions(prevOptions => ({
      ...prevOptions,
      ...newOptions
    }));
  }, []);
  
  /**
   * Calculate the accumulated view from the trees
   */
  const calculateAccumulatedView = useCallback(() => {
    try {
      // Calculate accumulated nodes from all trees
      const calculatedNodes = calculateAccumulatedFromTrees(trees);
      
      // Merge with machine data
      const nodesWithMachines = mergeAccumulatedWithMachines(
        calculatedNodes,
        machineCountMap,
        machineMultiplierMap
      );
      
      // Apply filters
      const filteredNodes = filterAccumulatedNodes(nodesWithMachines, options);
      
      setAccumulatedNodes(filteredNodes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculating accumulated view');
      setAccumulatedNodes([]);
    }
  }, [trees, machineCountMap, machineMultiplierMap, options]);
  
  /**
   * Force refresh of the accumulated view
   */
  const refreshAccumulatedView = useCallback(() => {
    setIsLoading(true);
    calculateAccumulatedView();
    setIsLoading(false);
  }, [calculateAccumulatedView]);
  
  // Calculate accumulated view when dependencies change
  useEffect(() => {
    setIsLoading(true);
    calculateAccumulatedView();
    setIsLoading(false);
  }, [calculateAccumulatedView]);
  
  return {
    accumulatedNodes,
    isLoading,
    error,
    updateOptions,
    refreshAccumulatedView
  };
}

export default useAccumulatedView; 