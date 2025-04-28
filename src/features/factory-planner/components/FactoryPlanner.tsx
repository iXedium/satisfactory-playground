import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import CommandBar from "../../../components/CommandBar";
import { useFactoryPlanner, TreeSortKey, SortDirection } from "../hooks/useFactoryPlanner";
import FactoryPlannerLayout from "../../../components/shared/FactoryPlannerLayout";
import PlannerContent from "../../../components/shared/PlannerContent";
import { DependencyNode } from "../../../types";
import { DropResult } from "@hello-pangea/dnd";

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
    showExtensions,
    accumulateExtensions,
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
    setShowExtensions,
    setAccumulateExtensions,
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
  
  // --- State for Manual Tree Order ---
  const [manualTreeOrder, setManualTreeOrder] = useState<string[]>([]);
  // ---------------------------------

  const commandBarRef = useRef<HTMLDivElement>(null);
  const treeViewRef = useRef<HTMLDivElement>(null);
  const [commandBarHeight, setCommandBarHeight] = useState(0);

  useEffect(() => {
    if (commandBarRef.current) {
      setCommandBarHeight(commandBarRef.current.offsetHeight);
    }
  }, [isAddItemCollapsed]);

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
    setManualTreeOrder(prevOrder => {
      // Filter out IDs that no longer exist
      const existingOrder = prevOrder.filter(id => currentTreeIds.includes(id));
      // Find IDs that are in current trees but not in the order yet
      const newIds = currentTreeIds.filter(id => !existingOrder.includes(id));
      // Add new IDs to the end
      return [...existingOrder, ...newIds];
    });
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
          showExtensions={showExtensions}
          onShowExtensionsChange={setShowExtensions}
          accumulateExtensions={accumulateExtensions}
          onAccumulateExtensionsChange={setAccumulateExtensions}
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
          showExtensions={showExtensions}
          accumulateExtensions={accumulateExtensions}
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          handleDeleteTree={handleDeleteTree}
          handleImportNode={handleImportNode}
          handleUnimportNode={handleUnimportNode}
          handleNodeUpdate={handleNodeUpdate}
          nodeExtensionOverrides={nodeExtensionOverrides}
          handleToggleNodeExtensions={handleToggleNodeExtensions}
          itemsMap={itemsMap}
          treeSortKey={treeSortKey}
          treeSortDirection={treeSortDirection}
        />
      }
    />
  );
};

export default FactoryPlanner; 
