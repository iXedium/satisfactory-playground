import { useState, useEffect, useCallback } from 'react';

// Define the new type
export type ViewDensity = 'relaxed' | 'compact';

// Define keys
const LS_VIEW_DENSITY = 'lastSession_savedViewDensity';
const LS_SHOW_EXTENSIONS = 'lastSession_savedShowExtensions';
const LS_ACCUMULATE_EXTENSIONS = 'lastSession_savedAccumulateExtensions';
const LS_SHOW_MACHINES = 'lastSession_savedShowMachines';
const LS_SHOW_MACHINE_MULTI = 'lastSession_savedShowMachineMultiplier';
const LS_AUTO_IMPORT = 'lastSession_plannerAutoImport';

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
  clearStorage: () => void;
}

export const usePlannerDisplayOptions = (): PlannerDisplayOptions => {
  // Default to 'compact' mode
  const [viewDensity, setViewDensity] = useState<ViewDensity>('compact');
  const [showExtensions, setShowExtensions] = useState(false);
  const [accumulateExtensions, setAccumulateExtensions] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  const [showMachineMultiplier, setShowMachineMultiplier] = useState(false);
  const [autoImport, setAutoImport] = useState(true);

  // Load saved state from LAST SESSION localStorage
  useEffect(() => {
    try {
      const savedViewDensity = localStorage.getItem(LS_VIEW_DENSITY);
      if (savedViewDensity) setViewDensity(savedViewDensity as ViewDensity);
      
      const savedShowExtensions = localStorage.getItem(LS_SHOW_EXTENSIONS);
      if (savedShowExtensions) setShowExtensions(JSON.parse(savedShowExtensions));
      
      const savedAccumulateExtensions = localStorage.getItem(LS_ACCUMULATE_EXTENSIONS);
      if (savedAccumulateExtensions) setAccumulateExtensions(JSON.parse(savedAccumulateExtensions));
      
      const savedShowMachines = localStorage.getItem(LS_SHOW_MACHINES);
      if (savedShowMachines) setShowMachines(JSON.parse(savedShowMachines));
      
      const savedShowMachineMultiplier = localStorage.getItem(LS_SHOW_MACHINE_MULTI);
      if (savedShowMachineMultiplier) setShowMachineMultiplier(JSON.parse(savedShowMachineMultiplier));
      
      const savedAutoImport = localStorage.getItem(LS_AUTO_IMPORT);
      if (savedAutoImport) setAutoImport(JSON.parse(savedAutoImport));

    } catch (error) {
      console.error("Error loading last session display options:", error);
      // Clear potentially corrupt keys
      localStorage.removeItem(LS_VIEW_DENSITY);
      localStorage.removeItem(LS_SHOW_EXTENSIONS);
      localStorage.removeItem(LS_ACCUMULATE_EXTENSIONS);
      localStorage.removeItem(LS_SHOW_MACHINES);
      localStorage.removeItem(LS_SHOW_MACHINE_MULTI);
      localStorage.removeItem(LS_AUTO_IMPORT);
    }
  }, []); // Run only on mount

  // Auto-save state to LAST SESSION localStorage (No empty checks needed for primitives)
  useEffect(() => {
    try {
      localStorage.setItem(LS_VIEW_DENSITY, viewDensity);
      localStorage.setItem(LS_SHOW_EXTENSIONS, JSON.stringify(showExtensions));
      localStorage.setItem(LS_ACCUMULATE_EXTENSIONS, JSON.stringify(accumulateExtensions));
      localStorage.setItem(LS_SHOW_MACHINES, JSON.stringify(showMachines));
      localStorage.setItem(LS_SHOW_MACHINE_MULTI, JSON.stringify(showMachineMultiplier));
      localStorage.setItem(LS_AUTO_IMPORT, JSON.stringify(autoImport));
    } catch (error) {
      console.error("Error saving last session display options:", error);
    }
  }, [viewDensity, showExtensions, accumulateExtensions, showMachines, showMachineMultiplier, autoImport]);

  // Function to clear related localStorage items
  const clearStorage = useCallback(() => {
    // Clear localStorage items this hook previously managed
    localStorage.removeItem('savedViewDensity');
    localStorage.removeItem('savedShowExtensions');
    localStorage.removeItem('savedAccumulateExtensions');
    localStorage.removeItem('savedShowMachines');
    localStorage.removeItem('savedShowMachineMultiplier');
    localStorage.removeItem('plannerAutoImport');
    // Also reset the local state
    setViewDensity('compact');
    setShowExtensions(false);
    setAccumulateExtensions(true);
    setShowMachines(true);
    setShowMachineMultiplier(false);
    setAutoImport(true);
  }, []);

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
    clearStorage,
  };
}; 