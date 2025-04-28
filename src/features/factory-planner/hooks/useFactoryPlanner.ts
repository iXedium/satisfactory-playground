/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { getRecipesForItem, getRecipeById, getRecipeByOutput } from '../../../data';
import { Item, DependencyNode, Recipe } from '../../../types';
import { 
  loadSavedState, 
  setDependencies, 
  deleteTree, 
  importNodeAction,
  updateNodeProperties,
  unimportNode,
  updateTreeProduction
} from '../store';
import { 
  setRecipeSelection, 
  loadRecipeSelections 
} from '../store';
import { calculateDependencyTree, findNodeById } from '../../../utils';
import { calculateAccumulatedFromTree } from '../../../utils';
import { usePlannerDisplayOptions } from './usePlannerDisplayOptions';
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

// Define types for Tree View sorting and EXPORT them
export type TreeSortKey = 'originalDepth' | 'amount' | 'name' | 'nominalRate' | 'Manual';
export type SortDirection = 'asc' | 'desc';

// Define keys for local storage
const LS_SORT_KEY = 'plannerTreeSortKey';
const LS_SORT_DIRECTION = 'plannerTreeSortDirection';

export const useFactoryPlanner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  
  // --- Define generateTreeId and createNewTreeStructure FIRST --- 
  const generateTreeId = useCallback((itemId: string): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `tree-${itemId}-${timestamp}-${randomSuffix}`;
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
  
  // --- Define Unimport Handler --- 
  const handleUnimportNode = useCallback((nodeId: string) => {
    // Dispatch the thunk (implementation pending)
    dispatch(unimportNodeThunk(nodeId)); 
  }, [dispatch]);
  // -------------------------------

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
  
  usePlannerPersistence({ dependencies, recipeSelections });

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

    handleCalculate,
    handleExcessChange,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleExpandCollapseAll,
    handleDeleteTree,
    handleImportNode,
    handleUnimportNode,
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions,
    handleTreeRecipeChange,
  };
};

export default useFactoryPlanner; 