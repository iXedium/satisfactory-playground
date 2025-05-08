/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { getRecipesForItem, getRecipeById, getRecipeByOutput, getAllItems, getMachineForRecipe } from '../../../data';
import { Item, DependencyNode, Recipe, Building } from '../../../types';
import { 
  loadSavedState, 
  updateNodeProperties,
  // Import clear actions if they exist, otherwise remove them below
  // clearAllTrees, 
  // clearRecipeSelections
} from '../store';
import { 
  setRecipeSelection as setRecipeSelectionAction,
  loadRecipeSelections
} from '../store';
import { calculateDependencyTree, findNodeById } from '../../../utils';
import { calculateAccumulatedFromTree } from '../../../utils';
import { usePlannerDisplayOptions, ViewDensity } from './usePlannerDisplayOptions';
import { usePlannerNodeState } from './usePlannerNodeState';
import { usePlannerItemSelection } from './usePlannerItemSelection';
import { usePlannerTreeCalculation } from './usePlannerTreeCalculation';
import { usePlannerImportExport } from './usePlannerImportExport';
import { usePlannerNodeInteractions } from './usePlannerNodeInteractions';
import { usePlannerExcessHandling } from './usePlannerExcessHandling';
import { usePlannerRecipeManagement } from './usePlannerRecipeManagement';
import { usePlannerDataManagement } from './usePlannerDataManagement';
import { usePlannerDebugTools } from './usePlannerDebugTools';
import { usePlannerSaveLoad } from './usePlannerSaveLoad';
import { unimportNodeThunk } from '../store/importExportLogic';
import { createNewTreeStructure } from './usePlannerTreeCalculation';
import { useItemNodeCalculations } from './useItemNodeCalculations';

// Define types for Tree View sorting and EXPORT them
export type TreeSortKey = 'originalDepth' | 'amount' | 'name' | 'nominalRate' | 'Manual';
export type SortDirection = 'asc' | 'desc';

// Define keys for local storage
const LS_SORT_KEY = 'lastSession_plannerTreeSortKey';
const LS_SORT_DIRECTION = 'lastSession_plannerTreeSortDirection';
const LS_DEPENDENCIES_KEY = 'lastSession_savedDependencies';
const LS_RECIPES_KEY = 'lastSession_savedRecipeSelections';
const LS_MANUAL_ORDER_KEY = 'plannerManualTreeOrder';

export interface FactoryPlannerHookResult {
  dependencies: { dependencyTrees: Record<string, DependencyNode | null> };
  recipeSelections: Record<string, string>;
  items: Item[];
  selectedItem: string;
  selectedRecipe: string;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  machineMultiplierMap: Record<string, number>;
  expandedNodes: Record<string, boolean>;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  nodeExtensionOverrides: Record<string, boolean>;
  isAddItemCollapsed: boolean;
  recentItems: string[];
  autoImport: boolean;
  itemsMap: Record<string, Item>;
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
  viewDensity: ViewDensity;
  activeSetupName: string | null;
  manualTreeOrder: string[];

  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRecipe: React.Dispatch<React.SetStateAction<string>>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowExtensions: React.Dispatch<React.SetStateAction<boolean>>;
  setAccumulateExtensions: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMachines: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMachineMultiplier: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAddItemCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  updateRecentItems: (itemId: string) => void;
  removeRecentItem: (itemId: string) => void;
  setAutoImport: React.Dispatch<React.SetStateAction<boolean>>;
  setTreeSortKey: React.Dispatch<React.SetStateAction<TreeSortKey>>;
  setTreeSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  setViewDensity: (density: ViewDensity) => void;
  setManualTreeOrder: React.Dispatch<React.SetStateAction<string[]>>;

  handleCalculate: () => Promise<void>;
  handleExcessChange: (nodeId: string, excess: number) => Promise<void>;
  handleMachineCountChange: (nodeId: string, count: number) => void;
  handleMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  handleExpandCollapseAll: (expand: boolean) => void;
  handleDeleteTree: (treeId: string) => void;
  handleImportNode: (nodeId: string) => Promise<void>;
  handleUnimportNode: (nodeId: string) => void;
  handleNodeUpdate: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  clearSavedData: () => void;
  handleToggleNodeExtensions?: (nodeId: string) => void;
  handleTreeRecipeChange: (nodeId: string, recipeId: string) => Promise<void>;
  handleOptimizeAllMachines: () => Promise<void>;
  getSaveNames: () => string[];
  saveSetup: (name: string) => Promise<void>;
  loadSetup: (name: string) => Promise<void>;
  deleteSetup: (name: string) => Promise<void>;
  isDirty: boolean;
}

export const useFactoryPlanner = (): FactoryPlannerHookResult => {
  const dispatch: AppDispatch = useDispatch();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  
  // --- Define generateTreeId and createNewTreeStructure FIRST --- 
  const generateTreeId = useCallback((itemId: string): string => {
    // Simple ID generation for now, ensures uniqueness within session
    return `${itemId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }, []);

  const createNewTreeStructure = useCallback(async (
    itemId: string, 
    amount: number, 
    treeId: string, 
    recipeId: string | null, 
    isAutoImportRoot: boolean | undefined,
    originalDepth: number | undefined,
    isInitiallyByproductRoot: boolean | undefined,
    recipeSelections: Record<string, string>, 
    allTrees: Record<string, DependencyNode>
  ): Promise<DependencyNode | null> => {
      const recipe = recipeId ? await getRecipeById(recipeId) : await getRecipeByOutput(itemId);
      if (!recipe) {
        const basicNode: DependencyNode = { id: itemId, amount: amount, uniqueId: treeId, children: [], isRoot: isAutoImportRoot, isByproduct: false, depth: 0, originalDepth: originalDepth ?? 0 };
        return basicNode;
      }
      try {
        const tree = await calculateDependencyTree(itemId, amount, recipe.id, recipeSelections, 0, [], treeId, {}, {}, allTrees );
        if (!tree) return null;
        tree.uniqueId = treeId; tree.recipe = recipe; tree.isRoot = true; tree.isByproduct = false; tree.depth = 0; tree.originalDepth = originalDepth ?? 0;
        return tree;
      } catch (error) { console.error(`Error in local createNewTreeStructure for ${itemId}:`, error); return null; }
  }, []);
  // -------------------------------------------------------------
  
  const {
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
    viewDensity,
    setViewDensity,
    clearStorage: clearDisplayOptionsStorage,
  } = usePlannerDisplayOptions();
  
  const {
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
    clearStorage: clearNodeStateStorage,
  } = usePlannerNodeState();
  
  const {
    items,
    selectedItem,
    setSelectedItem,
    selectedRecipe,
    setSelectedRecipe,
    isAddItemCollapsed,
    setIsAddItemCollapsed,
    recentItems,
    updateRecentItems,
    removeRecentItem,
    clearStorage: clearItemSelectionStorage,
  } = usePlannerItemSelection();

  // --- State for Tree View Sorting (Load from LAST SESSION Local Storage) ---
  const [treeSortKey, setTreeSortKey] = useState<TreeSortKey>(() => {
    return (localStorage.getItem(LS_SORT_KEY) as TreeSortKey | null) || 'originalDepth';
  });
  const [treeSortDirection, setTreeSortDirection] = useState<SortDirection>(() => {
     return (localStorage.getItem(LS_SORT_DIRECTION) as SortDirection | null) || 'asc';
  });
  // --- Auto-save sort state to LAST SESSION Local Storage ---
  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT_KEY, treeSortKey);
    } catch (error) {
      console.error("Error saving last session sort key:", error);
    }
  }, [treeSortKey]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT_DIRECTION, treeSortDirection);
    } catch (error) {
      console.error("Error saving last session sort direction:", error);
    }
  }, [treeSortDirection]);
  // -----------------------------------------------------------

  // --- State for Manual Tree Order (Moved from FactoryPlanner.tsx) ---
  const [manualTreeOrder, setManualTreeOrder] = useState<string[]>(() => {
    try {
      const savedOrder = localStorage.getItem(LS_MANUAL_ORDER_KEY);
      return savedOrder ? JSON.parse(savedOrder) : [];
    } catch (error) {
      console.error("Error loading manual tree order from localStorage:", error);
      return [];
    }
  });

  // --- Auto-save sort state to LAST SESSION Local Storage ---
  useEffect(() => {
    try {
      localStorage.setItem(LS_MANUAL_ORDER_KEY, JSON.stringify(manualTreeOrder));
    } catch (error) {
      console.error("Error saving manual tree order to localStorage:", error);
    }
  }, [manualTreeOrder]);

  // --- Create an Item Map for sorting by name --- 
  const itemsMap = useMemo(() => {
    const map: Record<string, Item> = {};
    items.forEach(item => {
      map[item.id] = item;
    });
    return map;
  }, [items]);
  // ---------------------------------------------

  const {
    handleCalculate,
    handleCreateNewTree,
  } = usePlannerTreeCalculation({
    selectedItem,
    selectedRecipe,
    recipeSelections,
    dependencies,
    setExcessMap,
    updateRecentItems,
    setMachineCountMap,
    setMachineMultiplierMap,
    autoImport,
  });
  
  const {
    handleImportNode,
    handleUnimport,
  } = usePlannerImportExport({
    dependencies,
    handleCreateNewTree,
  });
  
  const {
    handleExpandCollapseAll,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleToggleNodeExtensions,
  } = usePlannerNodeInteractions({
    dependencies,
    setExpandedNodes,
    setMachineCountMap,
    setMachineMultiplierMap,
    setNodeExtensionOverrides,
  });
  
  const {
    handleTreeRecipeChange,
  } = usePlannerRecipeManagement({
    autoImportEnabled: autoImport,
    excessMap: excessMap,
  });
  
  const {
    handleDeleteTree,
    handleNodeUpdate,
    clearSavedData,
  } = usePlannerDataManagement({
    clearNodeStateStorage,
    clearItemSelectionStorage,
    clearDisplayOptionsStorage,
  });
  
  const {
    handleExcessChange,
  } = usePlannerExcessHandling({
    dependencies,
    setExcessMap,
    generateTreeId,
    createNewTreeStructure: async (itemId, amount, treeId, recipeId, isAutoImportRoot, originalDepth, isInitiallyByproductRoot) => {
      return createNewTreeStructure(
        itemId, amount, treeId, recipeId, isAutoImportRoot, originalDepth, 
        isInitiallyByproductRoot, recipeSelections, dependencies.dependencyTrees
      );
    }
  });
  
  usePlannerDebugTools({
    dependencies,
    excessMap,
    handleExcessChange,
  });
  
  // --- Load LAST SESSION Core Redux State on Initial Mount --- 
  useEffect(() => {
    // console.log("Attempting to load last session Redux state...");
    try {
      const savedDependencies = localStorage.getItem(LS_DEPENDENCIES_KEY);
      if (savedDependencies) {
        // console.log("Found last session dependencies, loading...");
        const parsed = JSON.parse(savedDependencies);
        dispatch(loadSavedState(parsed));
      } else {
        // console.log("No last session dependencies found.");
      }
      
      const savedRecipeSelections = localStorage.getItem(LS_RECIPES_KEY);
      if (savedRecipeSelections) {
        // console.log("Found last session recipe selections, loading...");
        const parsed = JSON.parse(savedRecipeSelections);
        dispatch(loadRecipeSelections(parsed));
      } else {
        // console.log("No last session recipe selections found.");
      }
    } catch (error) {
      console.error("Error loading last session Redux state:", error);
      // Clear potentially corrupted keys
      localStorage.removeItem(LS_DEPENDENCIES_KEY);
      localStorage.removeItem(LS_RECIPES_KEY);
    }
  }, [dispatch]); // Run only once on mount
  // ---------------------------------------------------------------------

  // --- Auto-save Core Redux State to LAST SESSION on Change ---
  useEffect(() => {
    // Save dependencies
    if (dependencies && Object.keys(dependencies.dependencyTrees).length > 0) {
      try {
        // console.log("Auto-saving dependencies to last session...");
        localStorage.setItem(LS_DEPENDENCIES_KEY, JSON.stringify(dependencies));
      } catch (error) {
        console.error("Error auto-saving last session dependencies:", error);
        localStorage.removeItem(LS_DEPENDENCIES_KEY); // Clear on error
      }
    } 
    // Optional: Clear if state becomes empty? Might conflict with initial load.
  }, [dependencies]);

  useEffect(() => {
    // Save recipe selections
    if (recipeSelections && Object.keys(recipeSelections).length > 0) {
      try {
        // console.log("Auto-saving recipe selections to last session...");
        localStorage.setItem(LS_RECIPES_KEY, JSON.stringify(recipeSelections));
      } catch (error) {
        console.error("Error auto-saving last session recipe selections:", error);
        localStorage.removeItem(LS_RECIPES_KEY); // Clear on error
      }
    } 
  }, [recipeSelections]);
  // -------------------------------------------------------------

  // Call the Save/Load Hook
  const { 
    getSaveNames, 
    saveSetup, 
    loadSetup, 
    deleteSetup, 
    isDirty,
    activeSetupName
  } = usePlannerSaveLoad({
    // Pass setters
    setExcessMap,
    setMachineCountMap,
    setMachineMultiplierMap,
    setExpandedNodes,
    setNodeExtensionOverrides,
    setViewDensity,
    setShowExtensions,
    setAccumulateExtensions,
    setShowMachines,
    setShowMachineMultiplier,
    setAutoImport,
    setTreeSortKey,
    setTreeSortDirection,
    setManualTreeOrder,
    // Pass current state values
    currentExcessMap: excessMap,
    currentMachineCountMap: machineCountMap,
    currentMachineMultiplierMap: machineMultiplierMap,
    currentExpandedNodes: expandedNodes,
    currentNodeExtensionOverrides: nodeExtensionOverrides,
    currentViewDensity: viewDensity,
    currentShowExtensions: showExtensions,
    currentAccumulateExtensions: accumulateExtensions,
    currentShowMachines: showMachines,
    currentShowMachineMultiplier: showMachineMultiplier,
    currentAutoImport: autoImport,
    currentTreeSortKey: treeSortKey,
    currentTreeSortDirection: treeSortDirection,
    currentManualTreeOrder: manualTreeOrder,
  });

  // --- Optimize All Machines Handler ---
  const handleOptimizeAllMachines = useCallback(async () => {
    // console.log("[OptimizeAll] Starting...");
    const trees = dependencies.dependencyTrees;

    const processNode = async (node: DependencyNode) => {
      if (node.isByproduct || node.isImport || !node.recipe?.id || !node.id) {
        return; // Skip nodes that cannot be optimized
      }

      const currentAmount = node.amount || 0;
      const currentExcess = excessMap[node.uniqueId] || 0;
      const currentMultiplier = machineMultiplierMap[node.uniqueId] || 1;
      const currentRecipeId = node.recipe.id;

      try {
        const machine = await getMachineForRecipe(currentRecipeId);
        if (!machine) {
          return;
        }

        let nominalRate = 0;
        if (machine && node.recipe) {
          const itemOut = node.recipe.out[node.id];
          if (itemOut && node.recipe.time > 0 && machine.speed > 0) {
            nominalRate = (60 / node.recipe.time) * itemOut * machine.speed;
          }
        }

        if (nominalRate <= 0) {
          return;
        }

        const neededAmount = currentAmount + currentExcess;
        const exactMachines = neededAmount / (nominalRate * currentMultiplier);
        const optimalMachines = Math.max(1, Math.ceil(exactMachines));
        const currentMachineCount = machineCountMap[node.uniqueId] || 1;

        if (optimalMachines !== currentMachineCount) {
          handleMachineCountChange(node.uniqueId, optimalMachines);
        }
      } catch (error) {
        console.error(`[OptimizeAll] Error calculating optimization for node ${node.uniqueId}:`, error);
      }

      if (node.children) {
        for (const child of node.children) {
          await processNode(child);
        }
      }
    };

    for (const treeId in trees) {
      const tree = trees[treeId];
      if (tree) {
        await processNode(tree);
      }
    }

    // console.log("[OptimizeAll] Finished processing.");

  }, [dependencies.dependencyTrees, excessMap, machineMultiplierMap, machineCountMap, handleMachineCountChange]);
  // -------------------------------------

  return {
    dependencies,
    recipeSelections,
    items,
    selectedItem,
    selectedRecipe,
    excessMap,
    machineCountMap,
    machineMultiplierMap,
    expandedNodes,
    showExtensions,
    accumulateExtensions,
    showMachines,
    showMachineMultiplier,
    nodeExtensionOverrides,
    isAddItemCollapsed,
    recentItems,
    autoImport,
    itemsMap,
    treeSortKey,
    treeSortDirection,
    viewDensity,
    activeSetupName,
    manualTreeOrder,

    setSelectedItem,
    setSelectedRecipe,
    setExpandedNodes,
    setShowExtensions,
    setAccumulateExtensions,
    setShowMachines,
    setShowMachineMultiplier,
    setIsAddItemCollapsed,
    updateRecentItems,
    removeRecentItem,
    setAutoImport,
    setTreeSortKey,
    setTreeSortDirection,
    setViewDensity,
    setManualTreeOrder,

    handleCalculate,
    handleExcessChange,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleExpandCollapseAll,
    handleDeleteTree,
    handleImportNode,
    handleUnimportNode: handleUnimport,
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions,
    handleTreeRecipeChange,
    handleOptimizeAllMachines,

    getSaveNames,
    saveSetup,
    loadSetup,
    deleteSetup,
    isDirty,
  };
};

export default useFactoryPlanner; 