import { useState, useCallback } from 'react';

// Define the new type
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

  // Load saved state from localStorage
  // REMOVED: useEffect for loading display options

  // Save state to localStorage
  // REMOVED: useEffect for saving display options

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