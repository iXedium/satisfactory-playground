/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import CommandBar from "../../../components/CommandBar";
import { useFactoryPlanner, TreeSortKey, SortDirection } from "../hooks/useFactoryPlanner";
import FactoryPlannerLayout from "../../../components/shared/FactoryPlannerLayout";
import PlannerContent from "../../../components/shared/PlannerContent";
import SummarySidebar from "../../../components/shared/SummarySidebar";
import { DependencyNode } from "../../../types";
import { DropResult } from "@hello-pangea/dnd";

// Define key for local storage
const LS_MANUAL_ORDER_KEY = 'plannerManualTreeOrder';
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
    nodeExtensionOverrides,
    isAddItemCollapsed,
    recentItems,
    removeRecentItem,
    autoImport,
    setAutoImport,
    treeSortKey,
    treeSortDirection,
    itemsMap,

    // Setters
    setSelectedItem,
    setSelectedRecipe,
    setExpandedNodes,
    setShowMachines,
    setShowMachineMultiplier,
    setIsAddItemCollapsed,
    updateRecentItems,
    setTreeSortKey,
    setTreeSortDirection,

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
    handleToggleNodeExtensions
  } = useFactoryPlanner();
  
  // --- State for Sidebar Visibility (Load from Local Storage, default true) ---
  const [isSummaryVisible, setIsSummaryVisible] = useState<boolean>(() => {
    try {
      const savedValue = localStorage.getItem(LS_SUMMARY_VISIBLE_KEY);
      // Default to true if nothing is saved or value is invalid
      return savedValue !== null ? JSON.parse(savedValue) : true; 
    } catch (error) {
      console.error("Error loading summary visibility state:", error);
      return true; // Default to true on error
    }
  });
  // ------------------------------------------------------------------------

  // --- Save Summary Visibility to Local Storage on Change ---
  useEffect(() => {
    try {
      localStorage.setItem(LS_SUMMARY_VISIBLE_KEY, JSON.stringify(isSummaryVisible));
    } catch (error) {
      console.error("Error saving summary visibility state:", error);
    }
  }, [isSummaryVisible]);
  // ----------------------------------------------------------

  // --- State for Manual Tree Order (Load from Local Storage) ---
  const [manualTreeOrder, setManualTreeOrder] = useState<string[]>(() => {
    try {
      const savedOrder = localStorage.getItem(LS_MANUAL_ORDER_KEY);
      return savedOrder ? JSON.parse(savedOrder) : [];
    } catch (error) {
      console.error("Error loading manual tree order:", error);
      return [];
    }
  });
  // ---------------------------------

  // --- Save Manual Tree Order to Local Storage on Change ---
  useEffect(() => {
    try {
      localStorage.setItem(LS_MANUAL_ORDER_KEY, JSON.stringify(manualTreeOrder));
    } catch (error) {
      console.error("Error saving manual tree order:", error);
    }
  }, [manualTreeOrder]);
  // --------------------------------------------------------

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
      console.log("itemsMap not ready, returning empty summary.");
      return [];
    }

    console.log("Recalculating Item Summary (v4 using Category)...");
    
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

    // --- Pass 2: Accumulate rates, skipping imports, tracking byproducts ---
    const accumulateRates = (node: DependencyNode) => {
      const isImportNode = node.isImport || node.importReference;

      if (!isImportNode) {
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

    console.log("Item Data Map (After Accumulation v4):", JSON.parse(JSON.stringify(itemDataMap))); 

    // Convert map to array, including category
    const summaryArray = Object.entries(itemDataMap)
      .map(([itemId, data]) => ({ 
          itemId,
          totalRate: data.totalRate,
          category: data.category, // Include category
          hasByproductSource: data.hasByproductSource 
      }));

    console.log("Final Summary Array (v4):", summaryArray);
    return summaryArray;
  }, [dependencies.dependencyTrees, excessMap, itemsMap]); 
  // ----------------------------------------------------

  // --- Handle Manual Sort (Drag and Drop) ---
  const handleManualSort = useCallback((result: DropResult) => {
    if (!result.destination) {
      return; // Dropped outside the list
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    setManualTreeOrder(prevOrder => {
      const newOrder = Array.from(prevOrder);
      const [removed] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(destinationIndex, 0, removed);
      return newOrder;
    });

    // Set sort key to Manual
    setTreeSortKey('Manual');
    // Optionally reset direction for manual sort? Or keep the last direction?
    // setTreeSortDirection('asc');

  }, [setTreeSortKey]); // Add setTreeSortKey dependency
  // ----------------------------------------

  // --- Handle Tree Deletion (Update Manual Order) ---
   const handleDeleteTree = useCallback((treeId: string) => {
    originalHandleDeleteTree(treeId); // Call the original delete logic from the hook
    // Remove the deleted treeId from the manual order state
    setManualTreeOrder(prevOrder => prevOrder.filter(id => id !== treeId));
  }, [originalHandleDeleteTree]);
  // ----------------------------------------------

  // --- Synchronize manualTreeOrder with actual trees ---
  useEffect(() => {
    const currentTreeIds = Object.keys(dependencies.dependencyTrees);
    
    // Add check: Only synchronize if trees have actually loaded
    if (currentTreeIds.length === 0 && manualTreeOrder.length > 0) {
        // Avoid wiping the loaded order if trees haven't loaded yet but we have an order
        return; 
    }
    // Or alternatively, ensure we don't run if currentTreeIds is empty
    // if (currentTreeIds.length === 0) return;

    setManualTreeOrder(prevOrder => {
      // Filter out IDs that no longer exist
      const existingOrder = prevOrder.filter(id => currentTreeIds.includes(id));
      // Find IDs that are in current trees but not in the order yet
      const newIds = currentTreeIds.filter(id => !existingOrder.includes(id));
      // Add new IDs to the end
      return [...existingOrder, ...newIds];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies.dependencyTrees]); // Rerun when trees change
  // ----------------------------------------------------

  // --- Prepare Display Trees Array (Sorted or Manually Ordered) ---
  const displayTreesArray = useMemo(() => {
    const allTrees = dependencies.dependencyTrees;
    
    // Add check: Return empty array if trees are not loaded yet
    if (!allTrees) {
      return [];
    }

    let sortedOrOrderedTrees: DependencyNode[] = [];

    if (treeSortKey === 'Manual') {
      // Use manual order, filtering out potential missing trees and adding new ones
      const currentTreeIds = Object.keys(allTrees); // Safe now due to check above
      const orderedTrees = manualTreeOrder
        .map(id => allTrees[id])
        .filter(tree => tree !== undefined); // Filter out undefined (deleted trees)

      // Ensure all current trees are included (append new ones)
      const orderedIds = new Set(orderedTrees.map(t => t.uniqueId));
      const newTrees = currentTreeIds
        .filter(id => !orderedIds.has(id))
        .map(id => allTrees[id]);

      sortedOrOrderedTrees = [...orderedTrees, ...newTrees];

    } else {
      // Apply standard sorting logic
      const treesArray = Object.values(allTrees);
      treesArray.sort((a, b) => {
        let compareResult = 0;
        if (treeSortKey === 'originalDepth') {
          const depthA = a.originalDepth ?? (a.depth === 0 ? -1 : Infinity);
          const depthB = b.originalDepth ?? (b.depth === 0 ? -1 : Infinity);
          compareResult = depthA - depthB;
        } else if (treeSortKey === 'amount') {
          compareResult = (a.amount ?? 0) - (b.amount ?? 0);
        } else if (treeSortKey === 'name') {
          const nameA = itemsMap[a.id]?.name?.toLowerCase() || a.id.toLowerCase();
          const nameB = itemsMap[b.id]?.name?.toLowerCase() || b.id.toLowerCase();
          compareResult = nameA.localeCompare(nameB);
        } else if (treeSortKey === 'nominalRate') {
            const outputA = a.recipe?.out?.[a.id] ?? 0;
            const timeA = a.recipe?.time ?? 0;
            const rateA = timeA > 0 ? (outputA / timeA) * 60 : 0;
            const outputB = b.recipe?.out?.[b.id] ?? 0;
            const timeB = b.recipe?.time ?? 0;
            const rateB = timeB > 0 ? (outputB / timeB) * 60 : 0;
            compareResult = rateA - rateB;
        }
        return treeSortDirection === 'asc' ? compareResult : -compareResult;
      });
      sortedOrOrderedTrees = treesArray;
    }
    return sortedOrOrderedTrees;
  }, [dependencies.dependencyTrees, treeSortKey, treeSortDirection, manualTreeOrder, itemsMap]);
  // -----------------------------------------------------------------

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
        />
      }
      commandBarHeight={commandBarHeight}
      content={
        <PlannerContent
          treeViewRef={treeViewRef}
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
        />
      }
      sidebar={isSummaryVisible ? (
        <SummarySidebar 
          summaryData={itemSummaryData}
          itemsMap={itemsMap} 
        />
      ) : undefined}
      contentContainerStyle={{}}
    />
  );
};

export default FactoryPlanner; 
