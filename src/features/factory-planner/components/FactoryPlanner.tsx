/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import CommandBar from "../../../components/CommandBar";
import { useFactoryPlanner, TreeSortKey, SortDirection } from "../hooks/useFactoryPlanner";
import FactoryPlannerLayout from "../../../components/shared/FactoryPlannerLayout";
import PlannerContent from "../../../components/shared/PlannerContent";
import SummarySidebar from "../../../components/shared/SummarySidebar";
import { DependencyNode } from "../../../types";
import { DropResult } from "@hello-pangea/dnd";
import { logger } from "../../../utils/logger";
import { RootState, AppDispatch } from "../../../store";
import { toggleExternalImportThunk, beginHistoryTransaction, commitHistoryTransaction } from "../store";

// Define key for local storage
// const LS_MANUAL_ORDER_KEY = 'plannerManualTreeOrder'; // Moved to useFactoryPlanner
const LS_SUMMARY_VISIBLE_KEY = 'plannerSummaryVisible'; // Key for summary visibility

/**
 * Main component for the Factory Planner application
 * Orchestrates the layout and data flow between components
 */
const FactoryPlanner: React.FC = () => {
  const {
    // State
    dependencies,
    items,
    selectedItem,
    selectedRecipe,
    excessMap,
    machineCountMap,
    machineMultiplierMap,
    expandedNodes,
    showMachines,
    showMachineMultiplier,
    showHiddenNodes,
    nodeExtensionOverrides,
    isAddItemCollapsed,
    recentItems,
    removeRecentItem,
    autoImport,
    setAutoImport,
    treeSortKey,
    treeSortDirection,
    itemsMap,
    // Get density state
    viewDensity,

    // Setters
    setSelectedItem,
    setSelectedRecipe,
    setExpandedNodes,
    setShowMachines,
    setShowMachineMultiplier,
    setShowHiddenNodes,
    setIsAddItemCollapsed,
    updateRecentItems,
    setTreeSortKey,
    setTreeSortDirection,
    // Get density setter
    setViewDensity,

    // Handlers
    handleCalculate,
    handleTreeRecipeChange,
    handleExcessChange,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleExpandCollapseAll,
    handleDeleteTree: originalHandleDeleteTree,
    handleImportNode,
    handleUnimportNode,
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions,
    handleOptimizeAllMachines,
    handleDeleteAllTrees,
    handleToggleAllHidden,
    handleResetAllExcess,
    handleMaxAllExcess,
    handleToggleAllSelected,
    handleToggleAllCompleted,
    // Get save/load functions
    getSaveNames,
    saveSetup,
    loadSetup,
    deleteSetup,
    isDirty,
    activeSetupName,
    saveError,
    clearSaveError,
    manualTreeOrder, // Get from hook
    setManualTreeOrder, // Get from hook
    isRestoring,
    // Get comparison functions
    showComparison,
    hasComparisonSnapshot,
    snapshotInfo,
    storeCurrentSnapshot,
    clearActiveSnapshot,
    toggleComparison,
    resetToSnapshot,
  } = useFactoryPlanner();
  
  const dispatch = useDispatch<AppDispatch>();
  const externalImports = useSelector((state: RootState) => state.dependencies.externalImports || {});

  const handleToggleExternalImport = useCallback(async (itemId: string, enable: boolean) => {
    dispatch(beginHistoryTransaction(enable ? 'Externalize item' : 'Restore local production') as unknown as Parameters<typeof dispatch>[0]);
    try {
      await dispatch(toggleExternalImportThunk({ itemId, enable }));
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    } catch {
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    }
  }, [dispatch]);
  
  // --- State for Sidebar Visibility (Load from Local Storage, default true) ---
  const [isSummaryVisible, setIsSummaryVisible] = useState<boolean>(() => {
    try {
      const savedValue = localStorage.getItem(LS_SUMMARY_VISIBLE_KEY);
      // Default to true if nothing is saved or value is invalid
      return savedValue !== null ? JSON.parse(savedValue) : true; 
    } catch (error) {
      logger.error("Error loading summary visibility state:", error);
      return true; // Default to true on error
    }
  });
  // ------------------------------------------------------------------------

  // --- Save Summary Visibility to Local Storage on Change ---
  useEffect(() => {
    try {
      localStorage.setItem(LS_SUMMARY_VISIBLE_KEY, JSON.stringify(isSummaryVisible));
    } catch (error) {
      logger.error("Error saving summary visibility state:", error);
    }
  }, [isSummaryVisible]);
  // ----------------------------------------------------------

  const commandBarRef = useRef<HTMLDivElement>(null);
  const treeViewRef = useRef<HTMLDivElement>(null);
  const [commandBarHeight, setCommandBarHeight] = useState(0);

  useEffect(() => {
    if (commandBarRef.current) {
      setCommandBarHeight(commandBarRef.current.offsetHeight+12);
    }
  }, [isAddItemCollapsed]);

  // --- Item Summary Calculation (v4 using Category) ---
  const itemSummaryData = useMemo(() => {
    // Wait until itemsMap is populated before calculating
    if (!itemsMap || Object.keys(itemsMap).length === 0) {
      logger.debug("itemsMap not ready, returning empty summary.");
      return [];
    }

    // console.log("Recalculating Item Summary (v4 using Category)...");
    
    // --- Pass 1: Collect all unique item IDs --- 
    const allItemIds = new Set<string>();
    const collectItemIds = (node: DependencyNode) => {
      allItemIds.add(node.id);
      if (node.children) node.children.forEach(collectItemIds);
      if (node.originalChildren) node.originalChildren.forEach(collectItemIds);
    };
    Object.values(dependencies.dependencyTrees).forEach(tree => {
      if (tree) collectItemIds(tree);
    });
    // -------------------------------------------

    // --- Initialize Data Map with defaults and category ---
    const itemDataMap: Record<string, { totalRate: number, category: string, hasByproductSource: boolean }> = {};
    allItemIds.forEach(id => {
      // Get category from itemsMap (available via useFactoryPlanner)
      const category = itemsMap[id]?.category || 'unknown'; 
      itemDataMap[id] = {
        totalRate: 0,
        category: category, // Store the actual category
        hasByproductSource: false,
      };
    });
    // ---------------------------------------------------

    // --- Pass 2: Accumulate rates, skipping imports and external nodes, tracking byproducts ---
    const accumulateRates = (node: DependencyNode) => {
      const isImportNode = node.isImport || node.importReference;
      const isExternalNode = node.isExternal;

      if (!isImportNode && !isExternalNode) {
        const nodeExcess = excessMap[node.uniqueId] || 0;
        const currentAmount = (node.amount || 0) + nodeExcess;
        
        itemDataMap[node.id].totalRate += currentAmount;
        
        if (node.isByproduct) {
          itemDataMap[node.id].hasByproductSource = true;
        }
      }

      if (node.children) {
        node.children.forEach(accumulateRates);
      }
    };
    Object.values(dependencies.dependencyTrees).forEach(tree => {
      if (tree) accumulateRates(tree);
    });
    // -------------------------------------------------------------------

    // console.log("Item Data Map (After Accumulation v4):", JSON.parse(JSON.stringify(itemDataMap))); 

    // Convert map to array, including category
    const summaryArray = Object.entries(itemDataMap)
      .map(([itemId, data]) => ({ 
          itemId,
          totalRate: data.totalRate,
          category: data.category, // Include category
          hasByproductSource: data.hasByproductSource 
      }));

    // console.log("Final Summary Array (v4):", summaryArray);
    return summaryArray;
  }, [dependencies.dependencyTrees, excessMap, itemsMap]);

  // --- External Imports Summary ---
  const externalImportData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const collectExternal = (node: DependencyNode) => {
      if (node.isExternal) {
        dataMap[node.id] = (dataMap[node.id] || 0) + (node.amount || 0);
      }
      node.children?.forEach(collectExternal);
    };
    Object.values(dependencies.dependencyTrees).forEach(tree => {
      if (tree) collectExternal(tree);
    });
    return Object.entries(dataMap)
      .map(([itemId, totalRate]) => ({ itemId, totalRate, category: itemsMap?.[itemId]?.category || 'unknown', hasByproductSource: false }))
      .sort((a, b) => b.totalRate - a.totalRate);
  }, [dependencies.dependencyTrees, itemsMap]);
  // ---------------------------------
  // ----------------------------------------------------

  // --- Trees Array Memoization (with sorting and null filtering) ---
  // NOTE: Moved BEFORE handleManualSort so it can be used as a dependency
  const displayTreesArray = useMemo(() => {
    const allTrees = Object.values(dependencies.dependencyTrees);
    
    // Filter out any null entries FIRST, then filter hidden nodes if showHiddenNodes is false
    const validTrees = allTrees.filter((t): t is DependencyNode => {
      if (t === null) return false;
      // If showHiddenNodes is false, filter out hidden trees
      if (!showHiddenNodes && t.isHidden) return false;
      return true;
    });

    if (treeSortKey === 'Manual') {
      // Create a map for quick lookup
      const treeMap = validTrees.reduce((acc, tree) => {
        acc[tree.uniqueId] = tree;
        return acc;
      }, {} as Record<string, DependencyNode>);
      
      // Return trees in the manually specified order, filtering out any potentially stale IDs
      return manualTreeOrder.map(id => treeMap[id]).filter(Boolean); 
    } else {
      const manualOrderIndex = manualTreeOrder.reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
      }, {} as Record<string, number>);

      // Sort the filtered array based on the selected key and direction
      return [...validTrees].sort((a, b) => {
        let compareResult = 0;
        // No need to check for null on a or b here anymore
        if (treeSortKey === 'name') {
          compareResult = (itemsMap[a.id]?.name || a.id).localeCompare(itemsMap[b.id]?.name || b.id);
        } else if (treeSortKey === 'amount') {
          compareResult = a.amount - b.amount;
        } else { // Default to originalDepth (Hierarchy)
          compareResult = (a.originalDepth ?? 0) - (b.originalDepth ?? 0);
        }
        if (compareResult === 0) {
          compareResult = (manualOrderIndex[a.uniqueId] ?? 0) - (manualOrderIndex[b.uniqueId] ?? 0);
        }
        return treeSortDirection === 'asc' ? compareResult : -compareResult;
      });
    }
  }, [dependencies.dependencyTrees, treeSortKey, treeSortDirection, itemsMap, manualTreeOrder, showHiddenNodes]);
  // ------------------------------------------------------

  // --- Handle Manual Sort (Drag and Drop) ---
  // When hidden nodes are filtered out, drag indices are relative to visible trees only.
  // We need to map those indices back to positions in manualTreeOrder (which includes all trees).
  const handleManualSort = useCallback((result: DropResult) => {
    if (!result.destination) {
      return; // Dropped outside the list
    }

    const sourceVisibleIndex = result.source.index;
    const destinationVisibleIndex = result.destination.index;

    // Get the tree ID that was dragged (from the visible/filtered array)
    const draggedTreeId = displayTreesArray[sourceVisibleIndex]?.uniqueId;
    if (!draggedTreeId) return;

    // Get the tree ID at the destination position (in the visible array)
    // This helps us figure out where to insert in the full order
    const destinationTreeId = displayTreesArray[destinationVisibleIndex]?.uniqueId;

    setManualTreeOrder(prevOrder => {
      const newOrder = Array.from(prevOrder);
      
      // Find the current position of the dragged tree in the full order
      const sourceFullIndex = newOrder.indexOf(draggedTreeId);
      if (sourceFullIndex === -1) return prevOrder;

      // Remove the dragged tree from its current position
      newOrder.splice(sourceFullIndex, 1);

      // Find where to insert:
      // If we have a destination tree ID, insert relative to that position
      if (destinationTreeId) {
        let destinationFullIndex = newOrder.indexOf(destinationTreeId);
        if (destinationFullIndex !== -1) {
          // If dragging DOWN (source visible index < destination visible index),
          // insert AFTER the destination tree
          if (sourceVisibleIndex < destinationVisibleIndex) {
            destinationFullIndex += 1;
          }
          // If dragging UP, insert BEFORE the destination tree (at its current index)
          newOrder.splice(destinationFullIndex, 0, draggedTreeId);
        } else {
          // Destination tree not found (shouldn't happen), append to end
          newOrder.push(draggedTreeId);
        }
      } else {
        // No destination tree (edge case), append to end
        newOrder.push(draggedTreeId);
      }

      return newOrder;
    });

    // Set sort key to Manual
    setTreeSortKey('Manual');

  }, [setTreeSortKey, displayTreesArray]);
  // ----------------------------------------

  // --- Handle Tree Deletion (Update Manual Order) ---
   const handleDeleteTree = useCallback((treeId: string) => {
    originalHandleDeleteTree(treeId); // Call the original delete logic from the hook
    // Remove the deleted treeId from the manual order state
    setManualTreeOrder(prevOrder => prevOrder.filter(id => id !== treeId));
  }, [originalHandleDeleteTree]);
  // ----------------------------------------------

  // --- Synchronize manualTreeOrder with actual trees ---
  const reduxManualTreeOrder = useSelector((state: RootState) => state.dependencies.manualTreeOrder || []);
  useEffect(() => {
    if (isRestoring) return;
    const currentTreeIds = Object.keys(dependencies.dependencyTrees);
    
    // Add check: Only synchronize if trees have actually loaded
    if (currentTreeIds.length === 0 && manualTreeOrder.length > 0) {
        // Avoid wiping the loaded order if trees haven't loaded yet but we have an order
        return; 
    }
    // Or alternatively, ensure we don't run if currentTreeIds is empty
    // if (currentTreeIds.length === 0) return;

    setManualTreeOrder(prevOrder => {
      // Prefer the Redux-managed order when available (e.g. restored from a
      // history snapshot after undo/redo), so manual ordering survives restores.
      const reduxOrder = reduxManualTreeOrder;
      const baseOrder = reduxOrder && reduxOrder.length > 0 ? reduxOrder : prevOrder;
      // Filter out IDs that no longer exist
      const existingOrder = baseOrder.filter(id => currentTreeIds.includes(id));
      // Find IDs that are in current trees but not in the order yet
      const newIds = currentTreeIds.filter(id => !existingOrder.includes(id));
      // Add new IDs to the end (batch insertion handled elsewhere)
      const nextOrder = [...existingOrder, ...newIds];
      // Avoid feedback loops: only update if the content actually changed
      if (nextOrder.length === prevOrder.length && nextOrder.every((id, i) => id === prevOrder[i])) {
        return prevOrder;
      }
      return nextOrder;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies.dependencyTrees, reduxManualTreeOrder, isRestoring]); // Rerun when trees change
  // ----------------------------------------------------

  return (
    <FactoryPlannerLayout
      commandBar={
        <CommandBar
          ref={commandBarRef}
          items={items}
          selectedItem={selectedItem}
          onItemSelect={setSelectedItem}
          selectedRecipe={selectedRecipe}
          onRecipeSelect={setSelectedRecipe}
          onCalculate={handleCalculate}
          onExpandCollapseAll={handleExpandCollapseAll}
          showMachines={showMachines}
          onShowMachinesChange={setShowMachines}
          showMachineMultiplier={showMachineMultiplier}
          onShowMachineMultiplierChange={setShowMachineMultiplier}
          showHiddenNodes={showHiddenNodes}
          onShowHiddenNodesChange={setShowHiddenNodes}
          isAddItemCollapsed={isAddItemCollapsed}
          onAddItemCollapsedChange={setIsAddItemCollapsed}
          onClearSavedData={clearSavedData}
          recentItems={recentItems}
          updateRecentItems={updateRecentItems}
          removeRecentItem={removeRecentItem}
          autoImport={autoImport}
          onAutoImportChange={setAutoImport}
          treeSortKey={treeSortKey}
          onTreeSortKeyChange={setTreeSortKey}
          treeSortDirection={treeSortDirection}
          onTreeSortDirectionChange={setTreeSortDirection}
          isSummaryVisible={isSummaryVisible}
          onToggleSummary={() => setIsSummaryVisible(prev => !prev)}
          // Pass density state/setter
          viewDensity={viewDensity}
          setViewDensity={setViewDensity}
          // Pass save/load handlers down
          saveSetup={saveSetup}
          loadSetup={loadSetup}
          getSaveNames={getSaveNames}
          deleteSetup={deleteSetup}
          isDirty={isDirty}
          activeSetupName={activeSetupName}
          saveError={saveError}
          onClearSaveError={clearSaveError}
          // Pass comparison props down
          showComparison={showComparison}
          hasComparisonSnapshot={hasComparisonSnapshot}
          snapshotInfo={snapshotInfo}
          onStoreSnapshot={storeCurrentSnapshot}
          onClearSnapshot={clearActiveSnapshot}
          onToggleComparison={toggleComparison}
          onResetToSnapshot={resetToSnapshot}
        />
      }
      commandBarHeight={commandBarHeight}
      content={
        <PlannerContent
          ref={treeViewRef}
          treesArray={displayTreesArray}
          onManualSort={handleManualSort}
          handleTreeRecipeChange={handleTreeRecipeChange}
          handleExcessChange={handleExcessChange}
          excessMap={excessMap}
          machineCountMap={machineCountMap}
          handleMachineCountChange={handleMachineCountChange}
          machineMultiplierMap={machineMultiplierMap}
          handleMachineMultiplierChange={handleMachineMultiplierChange}
          expandedNodes={expandedNodes}
          setExpandedNodes={setExpandedNodes}
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          handleDeleteTree={handleDeleteTree}
          handleImportNode={handleImportNode}
          handleUnimportNode={handleUnimportNode}
          handleNodeUpdate={handleNodeUpdate}
          nodeExtensionOverrides={nodeExtensionOverrides}
          handleToggleNodeExtensions={handleToggleNodeExtensions}
          containerStyle={{ flex: 1, minWidth: 0, height: '100%' }}
          itemsMap={itemsMap}
          treeSortKey={treeSortKey}
          treeSortDirection={treeSortDirection}
          // Pass density state
          viewDensity={viewDensity}
          onOptimizeAllMachines={handleOptimizeAllMachines}
          onDeleteAllTrees={handleDeleteAllTrees}
          onToggleAllHidden={handleToggleAllHidden}
          onResetAllExcess={handleResetAllExcess}
          onMaxAllExcess={handleMaxAllExcess}
          onToggleAllSelected={handleToggleAllSelected}
          onToggleAllCompleted={handleToggleAllCompleted}
        />
      }
      sidebar={isSummaryVisible ? (
        <SummarySidebar 
          summaryData={itemSummaryData}
          externalImportData={externalImportData}
          externalImports={externalImports}
          itemsMap={itemsMap}
          onToggleExternalImport={handleToggleExternalImport}
        />
      ) : undefined}
      contentContainerStyle={{}}
    />
  );
};

export default FactoryPlanner; 
