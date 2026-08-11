/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { useTabDispatch } from '../../workspace/context/TabDispatchContext';
import { getRecipesForItem, getRecipeById, getRecipeByOutput, getAllItems, getMachineForRecipe } from '../../../data';
import { Item, DependencyNode, Recipe, Building } from '../../../types';
import { 
  loadSavedState, 
  updateNodeProperties,
  setManualTreeOrder as setManualTreeOrderAction,
  // Import clear actions if they exist, otherwise remove them below
  // clearAllTrees, 
  // clearRecipeSelections
} from '../store';
import { 
  setRecipeSelection as setRecipeSelectionAction,
  loadRecipeSelections,
  beginHistoryTransaction,
  commitHistoryTransaction,
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
import { usePlannerBulkActions } from './usePlannerBulkActions';
import { usePlannerComparison } from './usePlannerComparison';
import { unimportNodeThunk } from '../store/importExportLogic';
import { createNewTreeStructure } from './usePlannerTreeCalculation';
import { useItemNodeCalculations } from './useItemNodeCalculations';

// --- Helper to extract local state maps from dependency trees ---
function extractLocalStateMapsFromTrees(dependencyTrees: Record<string, DependencyNode | null>): {
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  machineMultiplierMap: Record<string, number>;
} {
  const excessMap: Record<string, number> = {};
  const machineCountMap: Record<string, number> = {};
  const machineMultiplierMap: Record<string, number> = {};
  
  const extractFromNode = (node: DependencyNode | null) => {
    if (!node) return;
    
    if (node.excess !== undefined && node.excess !== 0) {
      excessMap[node.uniqueId] = node.excess;
    }
    if (node.machineCount !== undefined && node.machineCount !== 0) {
      machineCountMap[node.uniqueId] = node.machineCount;
    }
    if (node.machineMultiplier !== undefined && node.machineMultiplier !== 1) {
      machineMultiplierMap[node.uniqueId] = node.machineMultiplier;
    }
    
    if (node.children) {
      node.children.forEach(extractFromNode);
    }
  };
  
  Object.values(dependencyTrees).forEach(extractFromNode);
  
  return { excessMap, machineCountMap, machineMultiplierMap };
}

// Define types for Tree View sorting and EXPORT them
export type TreeSortKey = 'originalDepth' | 'amount' | 'name' | 'nominalRate' | 'Manual';
export type SortDirection = 'asc' | 'desc';

// UI-preference keys (non-tab-scoped — affect all tabs uniformly)
const LS_SORT_KEY = 'lastSession_plannerTreeSortKey';
const LS_SORT_DIRECTION = 'lastSession_plannerTreeSortDirection';

// Planner-state key generators (tab-scoped — one per tab)
const lsDependenciesKey = (tabId: string) => `lastSession_${tabId}_savedDependencies`;
const lsRecipesKey = (tabId: string) => `lastSession_${tabId}_savedRecipeSelections`;
const lsManualOrderKey = (tabId: string) => `lastSession_${tabId}_manualTreeOrder`;

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
  showHiddenNodes: boolean;
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
  isRestoring: boolean;

  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRecipe: React.Dispatch<React.SetStateAction<string>>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowExtensions: React.Dispatch<React.SetStateAction<boolean>>;
  setAccumulateExtensions: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMachines: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMachineMultiplier: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHiddenNodes: React.Dispatch<React.SetStateAction<boolean>>;
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
  handleDeleteTree: (treeId: string) => Promise<void>;
  handleImportNode: (nodeId: string) => Promise<void>;
  handleUnimportNode: (nodeId: string) => void;
  handleSetImportAmount: (treeId: string, nodeId: string, parentNodeId: string, newAmount: number) => void;
  handleResetImportAmount: (treeId: string, nodeId: string, parentNodeId: string) => void;
  handleMaxImportAmount: (treeId: string, nodeId: string, parentNodeId: string) => void;
  handleNodeUpdate: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  clearSavedData: () => void;
  handleToggleNodeExtensions?: (nodeId: string) => void;
  handleTreeRecipeChange: (nodeId: string, recipeId: string) => Promise<void>;
  handleOptimizeAllMachines: () => Promise<void>;
  handleDeleteAllTrees: () => Promise<void>;
  handleToggleAllHidden: (targetHidden: boolean) => void;
  handleResetAllExcess: () => Promise<void>;
  handleMaxAllExcess: () => Promise<void>;
  handleToggleAllSelected: (targetSelected: boolean) => void;
  handleToggleAllCompleted: (targetCompleted: boolean) => void;
  getSaveNames: () => string[];
  saveSetup: (name: string) => Promise<void>;
  loadSetup: (name: string) => Promise<void>;
  deleteSetup: (name: string) => Promise<void>;
  isDirty: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  // Comparison
  showComparison: boolean;
  hasComparisonSnapshot: boolean;
  snapshotInfo: { name: string; timestamp: number; treeCount: number } | null;
  storeCurrentSnapshot: (name?: string) => Promise<void>;
  clearActiveSnapshot: () => void;
  toggleComparison: () => void;
  resetToSnapshot: (removeNewNodes: boolean) => Promise<void>;
}

export const useFactoryPlanner = (): FactoryPlannerHookResult => {
  const { tabId: rawTabId, tabDispatch: dispatch } = useTabDispatch();
  const tabId = (rawTabId as string) || 'default';
  const dependencies = useSelector((state: RootState) => state.planners[tabId]?.dependencies ?? {
    dependencyTrees: {} as Record<string, DependencyNode | null>,
    accumulatedDependencies: {},
    highlightedNodeId: null,
    manualTreeOrder: [] as string[],
    externalImports: {},
    errors: [],
    lastUpdateTime: 0,
  });
  const recipeSelections = useSelector((state: RootState) => state.planners[tabId]?.recipeSelections.selections ?? {});
  
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
    showHiddenNodes,
    setShowHiddenNodes,
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
  } = usePlannerNodeState(tabId);

  // --- Bulk actions (Shift+Click applies to all nodes) ---
  const {
    handleDeleteAllTrees,
    handleToggleAllHidden,
    handleResetAllExcess,
    handleMaxAllExcess,
    handleToggleAllSelected,
    handleToggleAllCompleted,
  } = usePlannerBulkActions({
    dependencyTrees: dependencies.dependencyTrees,
    setExcessMap,
  });
  // ------------------------------------------------------
  
  // --- Subscribe to history isRestoring state for undo/redo sync ---
  const isRestoring = useSelector((state: RootState) => state.planners[tabId]?.history.isRestoring ?? false);
  const wasRestoringRef = useRef(false);
  
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

  // --- State for Manual Tree Order (tab-scoped) ---
  const [manualTreeOrder, setManualTreeOrder] = useState<string[]>(() => {
    try {
      const savedOrder = localStorage.getItem(lsManualOrderKey(tabId));
      return savedOrder ? JSON.parse(savedOrder) : [];
    } catch (error) {
      console.error("Error loading manual tree order from localStorage:", error);
      return [];
    }
  });

  // --- Auto-save manual tree order (tab-scoped) ---
  useEffect(() => {
    try {
      localStorage.setItem(lsManualOrderKey(tabId), JSON.stringify(manualTreeOrder));
    } catch (error) {
      console.error("Error saving manual tree order to localStorage:", error);
    }
  }, [manualTreeOrder, tabId]);

  // Mirror manual order into Redux (ignored by history)
  useEffect(() => {
    if (isRestoring) return;
    // During/after an undo/redo restore, the Redux manualTreeOrder is the source
    // of truth (restored from the history snapshot). The local state may be stale
    // (e.g. emptied or partial while trees were deleted), so only mirror when the
    // local order actually covers all current trees - otherwise we would clobber
    // the freshly restored order back to a stale list.
    const reduxOrder = dependencies.manualTreeOrder || [];
    const currentTreeIds = Object.keys(dependencies.dependencyTrees);
    if (reduxOrder.length > 0 && currentTreeIds.length > 0 && !currentTreeIds.every(id => manualTreeOrder.includes(id))) {
      return;
    }
    if (reduxOrder.length === 0 && manualTreeOrder.length > 0 && currentTreeIds.length === 0) {
      return;
    }
    // Avoid feedback loops: only mirror when the content actually differs.
    if (reduxOrder.length === manualTreeOrder.length && reduxOrder.every((id, i) => id === manualTreeOrder[i])) {
      return;
    }
    dispatch(setManualTreeOrderAction(manualTreeOrder));
  }, [dispatch, manualTreeOrder, dependencies.manualTreeOrder, dependencies.dependencyTrees, isRestoring]);

  // Sync local state maps from Redux when coming out of a restore (undo/redo)
  useEffect(() => {
    // Detect transition from restoring=true to restoring=false
    if (wasRestoringRef.current && !isRestoring) {
      console.log('[History] 🔄 Syncing local state maps after undo/redo restore');
      const extracted = extractLocalStateMapsFromTrees(dependencies.dependencyTrees);
      setExcessMap(extracted.excessMap);
      setMachineCountMap(extracted.machineCountMap);
      setMachineMultiplierMap(extracted.machineMultiplierMap);
      // Sync manual tree order to restored dependency tree order
      const restoredManualOrder = dependencies.manualTreeOrder || [];
      if (restoredManualOrder.length > 0) {
        setManualTreeOrder(restoredManualOrder);
      } else {
        const restoredTreeIds = Object.keys(dependencies.dependencyTrees);
        if (restoredTreeIds.length > 0) {
          setManualTreeOrder(restoredTreeIds);
        }
      }
    }
    wasRestoringRef.current = isRestoring;
  }, [isRestoring, dependencies.dependencyTrees, setExcessMap, setMachineCountMap, setMachineMultiplierMap, setManualTreeOrder]);

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
    onNewTreesCreated: (newTreeIds) => {
      if (!newTreeIds.length) return;
      setManualTreeOrder(prevOrder => {
        const filteredPrev = prevOrder.filter(id => !newTreeIds.includes(id));
        return [...newTreeIds, ...filteredPrev];
      });
    },
  });
  
  const {
    handleImportNode,
    handleUnimport,
    handleSetImportAmount,
    handleResetImportAmount,
    handleMaxImportAmount,
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
  });
  
  usePlannerDebugTools({
    dependencies,
    excessMap,
    handleExcessChange,
  });
  
  // --- Load LAST SESSION Core Redux State on Initial Mount --- 
  useEffect(() => {
    try {
      const savedDependencies = localStorage.getItem(lsDependenciesKey(tabId));
      if (savedDependencies) {
        const parsed = JSON.parse(savedDependencies);
        dispatch(loadSavedState(parsed));
      }
      
      const savedRecipeSelections = localStorage.getItem(lsRecipesKey(tabId));
      if (savedRecipeSelections) {
        const parsed = JSON.parse(savedRecipeSelections);
        dispatch(loadRecipeSelections(parsed));
      }
    } catch (error) {
      console.error("Error loading last session Redux state:", error);
      localStorage.removeItem(lsDependenciesKey(tabId));
      localStorage.removeItem(lsRecipesKey(tabId));
    }
  }, [dispatch, tabId]);
  // ---------------------------------------------------------------------

  // --- Auto-save Core Redux State to LAST SESSION on Change ---
  useEffect(() => {
    if (dependencies && Object.keys(dependencies.dependencyTrees).length > 0) {
      try {
        localStorage.setItem(lsDependenciesKey(tabId), JSON.stringify(dependencies));
      } catch (error) {
        console.error("Error auto-saving last session dependencies:", error);
        localStorage.removeItem(lsDependenciesKey(tabId));
      }
    } 
  }, [dependencies, tabId]);

  useEffect(() => {
    if (recipeSelections && Object.keys(recipeSelections).length > 0) {
      try {
        localStorage.setItem(lsRecipesKey(tabId), JSON.stringify(recipeSelections));
      } catch (error) {
        console.error("Error auto-saving last session recipe selections:", error);
        localStorage.removeItem(lsRecipesKey(tabId));
      }
    } 
  }, [recipeSelections, tabId]);
  // -------------------------------------------------------------

  // Call the Save/Load Hook
  const { 
    getSaveNames, 
    saveSetup, 
    loadSetup, 
    deleteSetup, 
    isDirty,
    activeSetupName,
    saveError,
    clearSaveError,
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

  // Call the Comparison Hook
  const {
    showComparison,
    hasSnapshot: hasComparisonSnapshot,
    storeCurrentSnapshot,
    clearActiveSnapshot,
    toggleComparison,
    snapshotInfo,
    resetToSnapshot,
  } = usePlannerComparison({
    machineCountMap,
    machineMultiplierMap,
    excessMap,
    setMachineCountMap,
    setMachineMultiplierMap,
    setExcessMap,
    handleDeleteTree,
  });

  // --- Optimize All Machines Handler ---
  const handleOptimizeAllMachines = useCallback(async () => {
    const trees = dependencies.dependencyTrees;

    dispatch(beginHistoryTransaction('Optimize all machines') as unknown as Parameters<typeof dispatch>[0]);

    try {
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

      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    } catch (error) {
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
      console.error('[OptimizeAll] Error during optimize all:', error);
    }
  }, [dependencies.dependencyTrees, excessMap, machineMultiplierMap, machineCountMap, handleMachineCountChange, dispatch]);
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
    showHiddenNodes,
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
    isRestoring,

    setSelectedItem,
    setSelectedRecipe,
    setExpandedNodes,
    setShowExtensions,
    setAccumulateExtensions,
    setShowMachines,
    setShowMachineMultiplier,
    setShowHiddenNodes,
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
    handleSetImportAmount,
    handleResetImportAmount,
    handleMaxImportAmount,
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions,
    handleTreeRecipeChange,
    handleOptimizeAllMachines,
    handleDeleteAllTrees,
    handleToggleAllHidden,
    handleResetAllExcess,
    handleMaxAllExcess,
    handleToggleAllSelected,
    handleToggleAllCompleted,

    getSaveNames,
    saveSetup,
    loadSetup,
    deleteSetup,
    isDirty,
    saveError,
    clearSaveError,
    // Comparison
    showComparison,
    hasComparisonSnapshot,
    snapshotInfo,
    storeCurrentSnapshot,
    clearActiveSnapshot,
    toggleComparison,
    resetToSnapshot,
  };
};

export default useFactoryPlanner; 