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
  useEffect(() => {
    try {
      const savedExcessMap = localStorage.getItem('savedExcessMap');
      if (savedExcessMap) {
        setExcessMap(JSON.parse(savedExcessMap));
      }
      const savedMachineCountMap = localStorage.getItem('savedMachineCountMap');
      if (savedMachineCountMap) {
        setMachineCountMap(JSON.parse(savedMachineCountMap));
      }
      const savedMachineMultiplierMap = localStorage.getItem('savedMachineMultiplierMap');
      if (savedMachineMultiplierMap) {
        setMachineMultiplierMap(JSON.parse(savedMachineMultiplierMap));
      }
      const savedExpandedNodes = localStorage.getItem('plannerExpandedNodes');
      if (savedExpandedNodes) {
        setExpandedNodes(JSON.parse(savedExpandedNodes));
      } else {
        setExpandedNodes({}); // Initialize if nothing is saved
      }
      const savedOverrides = localStorage.getItem('plannerNodeExtensionOverrides');
      if (savedOverrides) {
        setNodeExtensionOverrides(JSON.parse(savedOverrides));
      }
    } catch (error) {
      console.error("Error loading node state:", error);
    }
  }, []);

  // Save excessMap to localStorage
  useEffect(() => {
    if (Object.keys(excessMap).length > 0) {
      try {
        localStorage.setItem('savedExcessMap', JSON.stringify(excessMap));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // console.error("Error saving excess map:", error);
        localStorage.removeItem('savedExcessMap');
      }
    }
    // Consider removing item if map becomes empty? Or handle on load?
  }, [excessMap]);

  // Save machine maps to localStorage
  useEffect(() => {
    try {
      if (Object.keys(machineCountMap).length > 0) {
        localStorage.setItem('savedMachineCountMap', JSON.stringify(machineCountMap));
      } else {
        localStorage.removeItem('savedMachineCountMap'); // Clean up if empty
      }
      if (Object.keys(machineMultiplierMap).length > 0) {
        localStorage.setItem('savedMachineMultiplierMap', JSON.stringify(machineMultiplierMap));
      } else {
        localStorage.removeItem('savedMachineMultiplierMap'); // Clean up if empty
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // console.error("Error saving machine maps:", error);
      localStorage.removeItem('savedMachineCountMap');
      localStorage.removeItem('savedMachineMultiplierMap');
    }
  }, [machineCountMap, machineMultiplierMap]);

  // Save expanded nodes and overrides to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('plannerExpandedNodes', JSON.stringify(expandedNodes));
      localStorage.setItem('plannerNodeExtensionOverrides', JSON.stringify(nodeExtensionOverrides));
    } catch (error) {
      console.error("Error saving node state:", error);
    }
  }, [expandedNodes, nodeExtensionOverrides]);

  // Function to clear related localStorage items
  const clearStorage = useCallback(() => {
    localStorage.removeItem('savedExcessMap');
    localStorage.removeItem('savedMachineCountMap');
    localStorage.removeItem('savedMachineMultiplierMap');
    localStorage.removeItem('plannerExpandedNodes');
    localStorage.removeItem('plannerNodeExtensionOverrides');
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