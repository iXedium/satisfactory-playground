/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
export interface PlannerNodeState {
  excessMap: Record<string, number>;
  setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
  machineCountMap: Record<string, number>;
  setMachineCountMap: Dispatch<SetStateAction<Record<string, number>>>;
  machineMultiplierMap: Record<string, number>;
  setMachineMultiplierMap: Dispatch<SetStateAction<Record<string, number>>>;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: Dispatch<SetStateAction<Record<string, boolean>>>;
  nodeExtensionOverrides: Record<string, boolean>;
  setNodeExtensionOverrides: Dispatch<SetStateAction<Record<string, boolean>>>;
  clearStorage: () => void;
}

export const usePlannerNodeState = (): PlannerNodeState => {
  const [excessMap, setExcessMap] = useState<Record<string, number>>({});
  const [machineCountMap, setMachineCountMap] = useState<Record<string, number>>({});
  const [machineMultiplierMap, setMachineMultiplierMap] = useState<Record<string, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [nodeExtensionOverrides, setNodeExtensionOverrides] = useState<Record<string, boolean>>({});

  // Load saved state from localStorage
  // REMOVED: useEffect for loading node state

  // Save excessMap to localStorage
  // REMOVED: useEffect for saving excessMap

  // Save machine maps to localStorage
  // REMOVED: useEffect for saving machine maps

  // Save expanded nodes and overrides to localStorage
  // REMOVED: useEffect for saving expandedNodes and nodeExtensionOverrides

  // Function to clear related localStorage items
  // REMOVED: clearStorage function

  const clearStorage = useCallback(() => {
    // Clear localStorage items this hook previously managed
    localStorage.removeItem('savedExcessMap');
    localStorage.removeItem('savedMachineCountMap');
    localStorage.removeItem('savedMachineMultiplierMap');
    localStorage.removeItem('plannerExpandedNodes');
    localStorage.removeItem('plannerNodeExtensionOverrides');
    // Also reset the local state
    setExcessMap({});
    setMachineCountMap({});
    setMachineMultiplierMap({});
    setExpandedNodes({});
    setNodeExtensionOverrides({});
  }, []);

  return {
    excessMap,
    setExcessMap,
    machineCountMap,
    setMachineCountMap,
    machineMultiplierMap,
    setMachineMultiplierMap,
    expandedNodes,
    setExpandedNodes,
    nodeExtensionOverrides,
    setNodeExtensionOverrides,
    clearStorage,
  };
}; 