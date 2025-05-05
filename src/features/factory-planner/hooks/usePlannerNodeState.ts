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
    try {
      const savedExcessMap = localStorage.getItem(LS_EXCESS_MAP);
      if (savedExcessMap) setExcessMap(JSON.parse(savedExcessMap));

      const savedMachineCountMap = localStorage.getItem(LS_MACHINE_COUNT);
      if (savedMachineCountMap) setMachineCountMap(JSON.parse(savedMachineCountMap));

      const savedMachineMultiplierMap = localStorage.getItem(LS_MACHINE_MULTI);
      if (savedMachineMultiplierMap) setMachineMultiplierMap(JSON.parse(savedMachineMultiplierMap));

      const savedExpandedNodes = localStorage.getItem(LS_EXPANDED_NODES);
      if (savedExpandedNodes) setExpandedNodes(JSON.parse(savedExpandedNodes));

      const savedOverrides = localStorage.getItem(LS_NODE_OVERRIDES);
      if (savedOverrides) setNodeExtensionOverrides(JSON.parse(savedOverrides));

    } catch (error) {
      console.error("Error loading last session node state:", error);
      // Clear potentially corrupt keys
      localStorage.removeItem(LS_EXCESS_MAP);
      localStorage.removeItem(LS_MACHINE_COUNT);
      localStorage.removeItem(LS_MACHINE_MULTI);
      localStorage.removeItem(LS_EXPANDED_NODES);
      localStorage.removeItem(LS_NODE_OVERRIDES);
    }
  }, []); // Run only on mount

  // Auto-save individual states to LAST SESSION localStorage
  useEffect(() => { try { localStorage.setItem(LS_EXCESS_MAP, JSON.stringify(excessMap)); } catch (e) { console.error("Error saving last session excessMap:", e); } }, [excessMap]);
  useEffect(() => { try { localStorage.setItem(LS_MACHINE_COUNT, JSON.stringify(machineCountMap)); } catch (e) { console.error("Error saving last session machineCountMap:", e); } }, [machineCountMap]);
  useEffect(() => { try { localStorage.setItem(LS_MACHINE_MULTI, JSON.stringify(machineMultiplierMap)); } catch (e) { console.error("Error saving last session machineMultiplierMap:", e); } }, [machineMultiplierMap]);
  useEffect(() => { try { localStorage.setItem(LS_EXPANDED_NODES, JSON.stringify(expandedNodes)); } catch (e) { console.error("Error saving last session expandedNodes:", e); } }, [expandedNodes]);
  useEffect(() => { try { localStorage.setItem(LS_NODE_OVERRIDES, JSON.stringify(nodeExtensionOverrides)); } catch (e) { console.error("Error saving last session nodeExtensionOverrides:", e); } }, [nodeExtensionOverrides]);

  // Function to clear related localStorage items
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