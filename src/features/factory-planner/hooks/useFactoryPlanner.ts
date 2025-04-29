/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { getRecipesForItem, getRecipeById, getRecipeByOutput, getAllItems } from '../../../data';
import { Item, DependencyNode, Recipe } from '../../../types';
import { 
  loadSavedState, 
  setDependencies, 
  deleteTree as deleteTreeAction,
  importNodeAction,
  updateNodeProperties,
  unimportNode as unimportNodeAction,
  updateTreeProduction,
  checkAndConvertNodeTypeThunk,
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
import { usePlannerPersistence } from './usePlannerPersistence';
import { unimportNodeThunk } from '../store/importExportLogic';
import { createNewTreeStructure } from './usePlannerTreeCalculation';

// Define types for Tree View sorting and EXPORT them
export type TreeSortKey = 'originalDepth' | 'amount' | 'name' | 'nominalRate' | 'Manual';
export type SortDirection = 'asc' | 'desc';

// Define keys for local storage
const LS_SORT_KEY = 'plannerTreeSortKey';
const LS_SORT_DIRECTION = 'plannerTreeSortDirection';

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
    clearStorage: clearDisplayOptionsStorage,
    autoImport,
    setAutoImport,
    viewDensity,
    setViewDensity,
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
    clearStorage: clearItemSelectionStorage,
    removeRecentItem,
  } = usePlannerItemSelection();

  // --- State for Tree View Sorting (Load from Local Storage) ---
  const [treeSortKey, setTreeSortKey] = useState<TreeSortKey>(() => {
    return (localStorage.getItem(LS_SORT_KEY) as TreeSortKey | null) || 'originalDepth';
  });
  const [treeSortDirection, setTreeSortDirection] = useState<SortDirection>(() => {
     return (localStorage.getItem(LS_SORT_DIRECTION) as SortDirection | null) || 'asc';
  });
  // -----------------------------------

  // --- Save Sort Key/Direction to Local Storage on Change ---
  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT_KEY, treeSortKey);
    } catch (error) {
      console.error("Error saving sort key:", error);
    }
  }, [treeSortKey]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT_DIRECTION, treeSortDirection);
    } catch (error) {
      console.error("Error saving sort direction:", error);
    }
  }, [treeSortDirection]);
  // ----------------------------------------------------------

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
  
  // --- Load Core Redux State (Dependencies, Recipes) on Initial Mount --- 
  useEffect(() => {
    try {
      const savedDependencies = localStorage.getItem('savedDependencies');
      if (savedDependencies) {
        const parsed = JSON.parse(savedDependencies);
        dispatch(loadSavedState(parsed));
      }
      
      const savedRecipeSelections = localStorage.getItem('savedRecipeSelections');
      if (savedRecipeSelections) {
        const parsed = JSON.parse(savedRecipeSelections);
        dispatch(loadRecipeSelections(parsed));
      }
    } catch (error) {
      console.error("Error loading saved Redux state:", error);
    }
  }, [dispatch]); // Run only once on mount
  // ---------------------------------------------------------------------
  
  usePlannerPersistence({
    dependencies,
    recipeSelections,
  });

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
  };
};

export default useFactoryPlanner; 