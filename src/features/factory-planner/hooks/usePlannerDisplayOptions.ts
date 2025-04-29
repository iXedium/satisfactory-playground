import { useState, useEffect, useCallback } from 'react';

export interface BasePlannerDisplayOptions {
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
  const [showMachines, setShowMachines] = useState(true);
  const [showMachineMultiplier, setShowMachineMultiplier] = useState(false);
  const [autoImport, setAutoImport] = useState(true);

  // Load saved state from localStorage
  useEffect(() => {
    try {
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
      localStorage.setItem('savedShowMachines', JSON.stringify(showMachines));
      localStorage.setItem('savedShowMachineMultiplier', JSON.stringify(showMachineMultiplier));
      localStorage.setItem('plannerAutoImport', JSON.stringify(autoImport));
    } catch (error) {
      console.error("Error saving display options:", error);
    }
  }, [ showMachines, showMachineMultiplier, autoImport]);

  // Function to clear related localStorage items
  const clearStorage = useCallback(() => {
    localStorage.removeItem('savedShowMachines');
    localStorage.removeItem('savedShowMachineMultiplier');
  }, []);

  return {
    showMachines,
    setShowMachines,
    showMachineMultiplier,
    setShowMachineMultiplier,
    autoImport,
    setAutoImport,
    clearStorage,
  };
}; 