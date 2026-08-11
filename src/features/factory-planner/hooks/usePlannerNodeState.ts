/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { logger } from '../../../utils/logger';

// Key generators — scoped to tabId for multi-tab isolation
const lsExcessMap = (tabId: string) => `lastSession_${tabId}_savedExcessMap`;
const lsMachineCount = (tabId: string) => `lastSession_${tabId}_savedMachineCountMap`;
const lsMachineMulti = (tabId: string) => `lastSession_${tabId}_savedMachineMultiplierMap`;
const lsExpandedNodes = (tabId: string) => `lastSession_${tabId}_plannerExpandedNodes`;
const lsNodeOverrides = (tabId: string) => `lastSession_${tabId}_plannerNodeExtensionOverrides`;

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

export const usePlannerNodeState = (tabId: string): PlannerNodeState => {
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
      const savedExcessMap = localStorage.getItem(lsExcessMap(tabId));
      if (savedExcessMap) {
        // console.log("[Node State Init] Found ExcessMap:", savedExcessMap.substring(0, 100)); // Log part of the data
        setExcessMap(JSON.parse(savedExcessMap));
        loadedSomething = true;
      }

      const savedMachineCountMap = localStorage.getItem(lsMachineCount(tabId));
      if (savedMachineCountMap) {
        // console.log("[Node State Init] Found MachineCountMap:", savedMachineCountMap.substring(0, 100));
        setMachineCountMap(JSON.parse(savedMachineCountMap));
        loadedSomething = true;
      }

      const savedMachineMultiplierMap = localStorage.getItem(lsMachineMulti(tabId));
      if (savedMachineMultiplierMap) {
        // console.log("[Node State Init] Found MachineMultiplierMap:", savedMachineMultiplierMap.substring(0, 100));
        setMachineMultiplierMap(JSON.parse(savedMachineMultiplierMap));
        loadedSomething = true;
      }

      const savedExpandedNodes = localStorage.getItem(lsExpandedNodes(tabId));
      if (savedExpandedNodes) {
        // console.log("[Node State Init] Found ExpandedNodes:", savedExpandedNodes.substring(0, 100));
        setExpandedNodes(JSON.parse(savedExpandedNodes));
        loadedSomething = true;
      }

      const savedOverrides = localStorage.getItem(lsNodeOverrides(tabId));
      if (savedOverrides) {
        // console.log("[Node State Init] Found NodeOverrides:", savedOverrides.substring(0, 100));
        setNodeExtensionOverrides(JSON.parse(savedOverrides));
        loadedSomething = true;
      }

      if (!loadedSomething) {
          // console.log("[Node State Init] No last session node state found in localStorage.");
      }

    } catch (error) {
      logger.error("[Node State Init] Error loading last session node state:", error);
      // Clear potentially corrupt keys
      localStorage.removeItem(lsExcessMap(tabId));
      localStorage.removeItem(lsMachineCount(tabId));
      localStorage.removeItem(lsMachineMulti(tabId));
      localStorage.removeItem(lsExpandedNodes(tabId));
      localStorage.removeItem(lsNodeOverrides(tabId));
    }
  }, [tabId]); // Re-run on mount and when tabId changes

  // Helper to check if an object is empty
  const isEmptyObject = (obj: Record<string, any>): boolean => {
    return Object.keys(obj).length === 0;
  };

  // Auto-save individual states to LAST SESSION localStorage (Only if not empty)
  useEffect(() => { 
    if (!isEmptyObject(excessMap)) { // Check if not empty
      try { localStorage.setItem(lsExcessMap(tabId), JSON.stringify(excessMap)); } catch (e) { logger.error("Error saving last session excessMap:", e); }
    } else {
      // Optional: Remove key if state becomes empty after being non-empty? Or just don't save.
      // localStorage.removeItem(lsExcessMap(tabId));
    }
  }, [excessMap]);
  
  useEffect(() => { 
    if (!isEmptyObject(machineCountMap)) { // Check if not empty
      try { localStorage.setItem(lsMachineCount(tabId), JSON.stringify(machineCountMap)); } catch (e) { logger.error("Error saving last session machineCountMap:", e); }
    } else {
      // localStorage.removeItem(lsMachineCount(tabId));
    }
  }, [machineCountMap]);
  
  useEffect(() => { 
    if (!isEmptyObject(machineMultiplierMap)) { // Check if not empty
      try { localStorage.setItem(lsMachineMulti(tabId), JSON.stringify(machineMultiplierMap)); } catch (e) { logger.error("Error saving last session machineMultiplierMap:", e); }
    } else {
      // localStorage.removeItem(lsMachineMulti(tabId));
    }
  }, [machineMultiplierMap]);
  
  useEffect(() => { 
    if (!isEmptyObject(expandedNodes)) { // Check if not empty
      try { localStorage.setItem(lsExpandedNodes(tabId), JSON.stringify(expandedNodes)); } catch (e) { logger.error("Error saving last session expandedNodes:", e); }
    } else {
      // localStorage.removeItem(lsExpandedNodes(tabId));
    }
  }, [expandedNodes]);
  
  useEffect(() => { 
    if (!isEmptyObject(nodeExtensionOverrides)) { // Check if not empty
      try { localStorage.setItem(lsNodeOverrides(tabId), JSON.stringify(nodeExtensionOverrides)); } catch (e) { logger.error("Error saving last session nodeExtensionOverrides:", e); }
    } else {
      // localStorage.removeItem(lsNodeOverrides(tabId));
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