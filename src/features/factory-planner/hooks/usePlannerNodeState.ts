/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

// Define keys
const LS_EXCESS_MAP = 'lastSession_savedExcessMap';
const LS_MACHINE_COUNT = 'lastSession_savedMachineCountMap';
const LS_MACHINE_MULTI = 'lastSession_savedMachineMultiplierMap';
const LS_EXPANDED_NODES = 'lastSession_plannerExpandedNodes';
const LS_NODE_OVERRIDES = 'lastSession_plannerNodeExtensionOverrides';

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

  // Load saved state from LAST SESSION localStorage
  useEffect(() => {
    // console.log("[Node State Init] Attempting to load last session state...");
    let loadedSomething = false;
    try {
      const savedExcessMap = localStorage.getItem(LS_EXCESS_MAP);
      if (savedExcessMap) {
        // console.log("[Node State Init] Found ExcessMap:", savedExcessMap.substring(0, 100)); // Log part of the data
        setExcessMap(JSON.parse(savedExcessMap));
        loadedSomething = true;
      }

      const savedMachineCountMap = localStorage.getItem(LS_MACHINE_COUNT);
      if (savedMachineCountMap) {
        // console.log("[Node State Init] Found MachineCountMap:", savedMachineCountMap.substring(0, 100));
        setMachineCountMap(JSON.parse(savedMachineCountMap));
        loadedSomething = true;
      }

      const savedMachineMultiplierMap = localStorage.getItem(LS_MACHINE_MULTI);
      if (savedMachineMultiplierMap) {
        // console.log("[Node State Init] Found MachineMultiplierMap:", savedMachineMultiplierMap.substring(0, 100));
        setMachineMultiplierMap(JSON.parse(savedMachineMultiplierMap));
        loadedSomething = true;
      }

      const savedExpandedNodes = localStorage.getItem(LS_EXPANDED_NODES);
      if (savedExpandedNodes) {
        // console.log("[Node State Init] Found ExpandedNodes:", savedExpandedNodes.substring(0, 100));
        setExpandedNodes(JSON.parse(savedExpandedNodes));
        loadedSomething = true;
      }

      const savedOverrides = localStorage.getItem(LS_NODE_OVERRIDES);
      if (savedOverrides) {
        // console.log("[Node State Init] Found NodeOverrides:", savedOverrides.substring(0, 100));
        setNodeExtensionOverrides(JSON.parse(savedOverrides));
        loadedSomething = true;
      }

      if (!loadedSomething) {
          // console.log("[Node State Init] No last session node state found in localStorage.");
      }

    } catch (error) {
      console.error("[Node State Init] Error loading last session node state:", error);
      // Clear potentially corrupt keys
      localStorage.removeItem(LS_EXCESS_MAP);
      localStorage.removeItem(LS_MACHINE_COUNT);
      localStorage.removeItem(LS_MACHINE_MULTI);
      localStorage.removeItem(LS_EXPANDED_NODES);
      localStorage.removeItem(LS_NODE_OVERRIDES);
    }
  }, []); // Run only on mount

  // Helper to check if an object is empty
  const isEmptyObject = (obj: Record<string, any>): boolean => {
    return Object.keys(obj).length === 0;
  };

  // Auto-save individual states to LAST SESSION localStorage (Only if not empty)
  useEffect(() => { 
    if (!isEmptyObject(excessMap)) { // Check if not empty
      try { localStorage.setItem(LS_EXCESS_MAP, JSON.stringify(excessMap)); } catch (e) { console.error("Error saving last session excessMap:", e); }
    } else {
      // Optional: Remove key if state becomes empty after being non-empty? Or just don't save.
      // localStorage.removeItem(LS_EXCESS_MAP);
    }
  }, [excessMap]);
  
  useEffect(() => { 
    if (!isEmptyObject(machineCountMap)) { // Check if not empty
      try { localStorage.setItem(LS_MACHINE_COUNT, JSON.stringify(machineCountMap)); } catch (e) { console.error("Error saving last session machineCountMap:", e); }
    } else {
      // localStorage.removeItem(LS_MACHINE_COUNT);
    }
  }, [machineCountMap]);
  
  useEffect(() => { 
    if (!isEmptyObject(machineMultiplierMap)) { // Check if not empty
      try { localStorage.setItem(LS_MACHINE_MULTI, JSON.stringify(machineMultiplierMap)); } catch (e) { console.error("Error saving last session machineMultiplierMap:", e); }
    } else {
      // localStorage.removeItem(LS_MACHINE_MULTI);
    }
  }, [machineMultiplierMap]);
  
  useEffect(() => { 
    if (!isEmptyObject(expandedNodes)) { // Check if not empty
      try { localStorage.setItem(LS_EXPANDED_NODES, JSON.stringify(expandedNodes)); } catch (e) { console.error("Error saving last session expandedNodes:", e); }
    } else {
      // localStorage.removeItem(LS_EXPANDED_NODES);
    }
  }, [expandedNodes]);
  
  useEffect(() => { 
    if (!isEmptyObject(nodeExtensionOverrides)) { // Check if not empty
      try { localStorage.setItem(LS_NODE_OVERRIDES, JSON.stringify(nodeExtensionOverrides)); } catch (e) { console.error("Error saving last session nodeExtensionOverrides:", e); }
    } else {
      // localStorage.removeItem(LS_NODE_OVERRIDES);
    }
  }, [nodeExtensionOverrides]);

  // Function to clear the local React state (called by clearSavedData)
  const clearStorage = useCallback(() => {
    // Reset the local state
    // console.log("[Node State] Clearing local state variables.");
    setExcessMap({});
    setMachineCountMap({});
    setMachineMultiplierMap({});
    setExpandedNodes({});
    setNodeExtensionOverrides({});
  // No dependencies needed as setters are stable
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
    clearStorage, // Expose the state clearing function
  };
}; 