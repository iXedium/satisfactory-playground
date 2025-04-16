import { useState, useEffect, useCallback } from 'react';

type ViewMode = "accumulated" | "tree";

export interface BasePlannerDisplayOptions {
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
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
  clearStorage: () => void;
}

export const usePlannerDisplayOptions = (): PlannerDisplayOptions => {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [showExtensions, setShowExtensions] = useState(false);
  const [accumulateExtensions, setAccumulateExtensions] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  const [showMachineMultiplier, setShowMachineMultiplier] = useState(false);
  const [autoImport, setAutoImport] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const savedViewMode = localStorage.getItem('savedViewMode');
      if (savedViewMode) {
        setViewMode(savedViewMode as ViewMode);
      }
      const savedShowExtensions = localStorage.getItem('savedShowExtensions');
      if (savedShowExtensions) {
        setShowExtensions(JSON.parse(savedShowExtensions));
      }
      const savedAccumulateExtensions = localStorage.getItem('savedAccumulateExtensions');
      if (savedAccumulateExtensions) {
        setAccumulateExtensions(JSON.parse(savedAccumulateExtensions));
      }
      const savedShowMachines = localStorage.getItem('savedShowMachines');
      if (savedShowMachines) {
        setShowMachines(JSON.parse(savedShowMachines));
      }
      const savedShowMachineMultiplier = localStorage.getItem('savedShowMachineMultiplier');
      if (savedShowMachineMultiplier) {
        setShowMachineMultiplier(JSON.parse(savedShowMachineMultiplier));
      }
      const savedAutoImport = localStorage.getItem('plannerAutoImport');
      if (savedAutoImport) {
        setAutoImport(JSON.parse(savedAutoImport));
      }
    } catch (error) {
      console.error("Error loading saved display options:", error);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('savedViewMode', viewMode);
      localStorage.setItem('savedShowExtensions', JSON.stringify(showExtensions));
      localStorage.setItem('savedAccumulateExtensions', JSON.stringify(accumulateExtensions));
      localStorage.setItem('savedShowMachines', JSON.stringify(showMachines));
      localStorage.setItem('savedShowMachineMultiplier', JSON.stringify(showMachineMultiplier));
      localStorage.setItem('plannerAutoImport', JSON.stringify(autoImport));
    } catch (error) {
      console.error("Error saving display options:", error);
    }
  }, [viewMode, showExtensions, accumulateExtensions, showMachines, showMachineMultiplier, autoImport]);

  // Function to clear related localStorage items
  const clearStorage = useCallback(() => {
    localStorage.removeItem('savedViewMode');
    localStorage.removeItem('savedShowExtensions');
    localStorage.removeItem('savedAccumulateExtensions');
    localStorage.removeItem('savedShowMachines');
    localStorage.removeItem('savedShowMachineMultiplier');
    console.log('[Persistence] Cleared display options from localStorage (excluding autoImport).');
  }, []);

  return {
    viewMode,
    setViewMode,
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
    clearStorage,
  };
}; 