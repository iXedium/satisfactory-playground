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

type ViewMode = "accumulated" | "tree";

// Define types for Tree View sorting
type TreeSortKey = 'originalDepth' | 'amount' | 'name' | 'nominalRate';
type SortDirection = 'asc' | 'desc';

export const useFactoryPlanner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  
  const {
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

  // --- State for Tree View Sorting ---
  const [treeSortKey, setTreeSortKey] = useState<TreeSortKey>('originalDepth');
  const [treeSortDirection, setTreeSortDirection] = useState<SortDirection>('asc');
  // -----------------------------------

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
    excessMap,
    updateRecentItems,
    setMachineCountMap,
    setMachineMultiplierMap,
    setExcessMap,
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
    dependencies,
    recipeSelections,
    excessMap,
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
  
  usePlannerPersistence({ dependencies, recipeSelections });
  
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
      console.error("Error loading saved state:", error);
    }
  }, [dispatch]);

  return {
    dependencies,
    recipeSelections,
    viewMode,
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
    setViewMode,
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
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions,
    handleUnimport,
    handleCreateNewTree,
    handleTreeRecipeChange,
  };
};

export default useFactoryPlanner; 