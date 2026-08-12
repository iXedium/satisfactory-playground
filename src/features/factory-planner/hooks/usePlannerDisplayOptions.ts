import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../../utils/logger';
import { getNamespacedKey } from '../../../utils';

export type ViewDensity = 'relaxed' | 'compact';

export interface BasePlannerDisplayOptions {
  viewDensity: ViewDensity;
  setViewDensity: React.Dispatch<React.SetStateAction<ViewDensity>>;
  showExtensions: boolean;
  setShowExtensions: React.Dispatch<React.SetStateAction<boolean>>;
  accumulateExtensions: boolean;
  setAccumulateExtensions: React.Dispatch<React.SetStateAction<boolean>>;
  showMachines: boolean;
  setShowMachines: React.Dispatch<React.SetStateAction<boolean>>;
  showMachineMultiplier: boolean;
  setShowMachineMultiplier: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface PlannerDisplayOptions extends BasePlannerDisplayOptions {
  autoImport: boolean;
  setAutoImport: React.Dispatch<React.SetStateAction<boolean>>;
  showHiddenNodes: boolean;
  setShowHiddenNodes: React.Dispatch<React.SetStateAction<boolean>>;
  clearStorage: () => void;
}

export const usePlannerDisplayOptions = (tabId: string): PlannerDisplayOptions => {
  const lsKeys = useMemo(() => ({
    viewDensity: getNamespacedKey('savedViewDensity', tabId),
    showExtensions: getNamespacedKey('savedShowExtensions', tabId),
    accumulateExtensions: getNamespacedKey('savedAccumulateExtensions', tabId),
    showMachines: getNamespacedKey('savedShowMachines', tabId),
    showMachineMulti: getNamespacedKey('savedShowMachineMultiplier', tabId),
    autoImport: getNamespacedKey('plannerAutoImport', tabId),
    showHiddenNodes: getNamespacedKey('showHiddenNodes', tabId),
  }), [tabId]);

  const [viewDensity, setViewDensity] = useState<ViewDensity>('compact');
  const [showExtensions, setShowExtensions] = useState(false);
  const [accumulateExtensions, setAccumulateExtensions] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  const [showMachineMultiplier, setShowMachineMultiplier] = useState(false);
  const [autoImport, setAutoImport] = useState(true);
  const [showHiddenNodes, setShowHiddenNodes] = useState(false);

  useEffect(() => {
    try {
      const savedViewDensity = localStorage.getItem(lsKeys.viewDensity);
      if (savedViewDensity) setViewDensity(savedViewDensity as ViewDensity);
      
      const savedShowExtensions = localStorage.getItem(lsKeys.showExtensions);
      if (savedShowExtensions) setShowExtensions(JSON.parse(savedShowExtensions));
      
      const savedAccumulateExtensions = localStorage.getItem(lsKeys.accumulateExtensions);
      if (savedAccumulateExtensions) setAccumulateExtensions(JSON.parse(savedAccumulateExtensions));
      
      const savedShowMachines = localStorage.getItem(lsKeys.showMachines);
      if (savedShowMachines) setShowMachines(JSON.parse(savedShowMachines));
      
      const savedShowMachineMultiplier = localStorage.getItem(lsKeys.showMachineMulti);
      if (savedShowMachineMultiplier) setShowMachineMultiplier(JSON.parse(savedShowMachineMultiplier));
      
      const savedAutoImport = localStorage.getItem(lsKeys.autoImport);
      if (savedAutoImport) setAutoImport(JSON.parse(savedAutoImport));

      const savedShowHiddenNodes = localStorage.getItem(lsKeys.showHiddenNodes);
      if (savedShowHiddenNodes) setShowHiddenNodes(JSON.parse(savedShowHiddenNodes));

    } catch (error) {
      logger.error("Error loading last session display options:", error);
      localStorage.removeItem(lsKeys.viewDensity);
      localStorage.removeItem(lsKeys.showExtensions);
      localStorage.removeItem(lsKeys.accumulateExtensions);
      localStorage.removeItem(lsKeys.showMachines);
      localStorage.removeItem(lsKeys.showMachineMulti);
      localStorage.removeItem(lsKeys.autoImport);
      localStorage.removeItem(lsKeys.showHiddenNodes);
    }
  }, [tabId]);

  useEffect(() => {
    try {
      localStorage.setItem(lsKeys.viewDensity, viewDensity);
      localStorage.setItem(lsKeys.showExtensions, JSON.stringify(showExtensions));
      localStorage.setItem(lsKeys.accumulateExtensions, JSON.stringify(accumulateExtensions));
      localStorage.setItem(lsKeys.showMachines, JSON.stringify(showMachines));
      localStorage.setItem(lsKeys.showMachineMulti, JSON.stringify(showMachineMultiplier));
      localStorage.setItem(lsKeys.autoImport, JSON.stringify(autoImport));
      localStorage.setItem(lsKeys.showHiddenNodes, JSON.stringify(showHiddenNodes));
    } catch (error) {
      logger.error("Error saving last session display options:", error);
    }
  }, [viewDensity, showExtensions, accumulateExtensions, showMachines, showMachineMultiplier, autoImport, showHiddenNodes, lsKeys]);

  const clearStorage = useCallback(() => {
    localStorage.removeItem(lsKeys.viewDensity);
    localStorage.removeItem(lsKeys.showExtensions);
    localStorage.removeItem(lsKeys.accumulateExtensions);
    localStorage.removeItem(lsKeys.showMachines);
    localStorage.removeItem(lsKeys.showMachineMulti);
    localStorage.removeItem(lsKeys.autoImport);
    localStorage.removeItem(lsKeys.showHiddenNodes);
    setViewDensity('compact');
    setShowExtensions(false);
    setAccumulateExtensions(true);
    setShowMachines(true);
    setShowMachineMultiplier(false);
    setAutoImport(true);
    setShowHiddenNodes(false);
  }, [lsKeys]);

  return {
    viewDensity,
    setViewDensity,
    showExtensions,
    setShowExtensions,
    accumulateExtensions,
    setAccumulateExtensions,
    showMachines,
    setShowMachines,
    showMachineMultiplier,
    setShowMachineMultiplier,
    autoImport,
    setAutoImport,
    showHiddenNodes,
    setShowHiddenNodes,
    clearStorage,
  };
}; 
