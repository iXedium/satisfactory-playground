import { useState, useEffect } from 'react';

type ViewMode = "accumulated" | "tree";

export interface PlannerDisplayOptions {
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

export const usePlannerDisplayOptions = (): PlannerDisplayOptions => {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [showExtensions, setShowExtensions] = useState(false);
  const [accumulateExtensions, setAccumulateExtensions] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  const [showMachineMultiplier, setShowMachineMultiplier] = useState(false);

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
    } catch (error) {
      console.error("Error saving display options:", error);
    }
  }, [viewMode, showExtensions, accumulateExtensions, showMachines, showMachineMultiplier]);

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
  };
}; 