import { useState, useEffect, Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { logger } from '../../../utils/logger';
import { getNamespacedKey } from '../../../utils';

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
  const lsKeys = useMemo(() => ({
    excessMap: getNamespacedKey('savedExcessMap', tabId),
    machineCount: getNamespacedKey('savedMachineCountMap', tabId),
    machineMulti: getNamespacedKey('savedMachineMultiplierMap', tabId),
    expandedNodes: getNamespacedKey('plannerExpandedNodes', tabId),
    nodeOverrides: getNamespacedKey('plannerNodeExtensionOverrides', tabId),
  }), [tabId]);

  const [excessMap, setExcessMap] = useState<Record<string, number>>({});
  const [machineCountMap, setMachineCountMap] = useState<Record<string, number>>({});
  const [machineMultiplierMap, setMachineMultiplierMap] = useState<Record<string, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [nodeExtensionOverrides, setNodeExtensionOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let loadedSomething = false;
    try {
      const savedExcessMap = localStorage.getItem(lsKeys.excessMap);
      if (savedExcessMap) {
        setExcessMap(JSON.parse(savedExcessMap));
        loadedSomething = true;
      }

      const savedMachineCountMap = localStorage.getItem(lsKeys.machineCount);
      if (savedMachineCountMap) {
        setMachineCountMap(JSON.parse(savedMachineCountMap));
        loadedSomething = true;
      }

      const savedMachineMultiplierMap = localStorage.getItem(lsKeys.machineMulti);
      if (savedMachineMultiplierMap) {
        setMachineMultiplierMap(JSON.parse(savedMachineMultiplierMap));
        loadedSomething = true;
      }

      const savedExpandedNodes = localStorage.getItem(lsKeys.expandedNodes);
      if (savedExpandedNodes) {
        setExpandedNodes(JSON.parse(savedExpandedNodes));
        loadedSomething = true;
      }

      const savedOverrides = localStorage.getItem(lsKeys.nodeOverrides);
      if (savedOverrides) {
        setNodeExtensionOverrides(JSON.parse(savedOverrides));
        loadedSomething = true;
      }
    } catch (error) {
      logger.error("[Node State Init] Error loading last session node state:", error);
      localStorage.removeItem(lsKeys.excessMap);
      localStorage.removeItem(lsKeys.machineCount);
      localStorage.removeItem(lsKeys.machineMulti);
      localStorage.removeItem(lsKeys.expandedNodes);
      localStorage.removeItem(lsKeys.nodeOverrides);
    }
  }, [tabId]);

  const isEmptyObject = (obj: Record<string, any>): boolean => {
    return Object.keys(obj).length === 0;
  };

  useEffect(() => { 
    if (!isEmptyObject(excessMap)) {
      try { localStorage.setItem(lsKeys.excessMap, JSON.stringify(excessMap)); } catch (e) { logger.error("Error saving last session excessMap:", e); }
    }
  }, [excessMap, lsKeys.excessMap]);
  
  useEffect(() => { 
    if (!isEmptyObject(machineCountMap)) {
      try { localStorage.setItem(lsKeys.machineCount, JSON.stringify(machineCountMap)); } catch (e) { logger.error("Error saving last session machineCountMap:", e); }
    }
  }, [machineCountMap, lsKeys.machineCount]);
  
  useEffect(() => { 
    if (!isEmptyObject(machineMultiplierMap)) {
      try { localStorage.setItem(lsKeys.machineMulti, JSON.stringify(machineMultiplierMap)); } catch (e) { logger.error("Error saving last session machineMultiplierMap:", e); }
    }
  }, [machineMultiplierMap, lsKeys.machineMulti]);
  
  useEffect(() => { 
    if (!isEmptyObject(expandedNodes)) {
      try { localStorage.setItem(lsKeys.expandedNodes, JSON.stringify(expandedNodes)); } catch (e) { logger.error("Error saving last session expandedNodes:", e); }
    }
  }, [expandedNodes, lsKeys.expandedNodes]);
  
  useEffect(() => { 
    if (!isEmptyObject(nodeExtensionOverrides)) {
      try { localStorage.setItem(lsKeys.nodeOverrides, JSON.stringify(nodeExtensionOverrides)); } catch (e) { logger.error("Error saving last session nodeExtensionOverrides:", e); }
    }
  }, [nodeExtensionOverrides, lsKeys.nodeOverrides]);

  const clearStorage = useCallback(() => {
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
