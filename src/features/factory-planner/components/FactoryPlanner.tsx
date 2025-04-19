import React, { useRef, useState, useEffect } from "react";
import CommandBar from "../../../components/CommandBar"; 
import { useFactoryPlanner } from "../hooks/useFactoryPlanner";
import FactoryPlannerLayout from "../../../components/shared/FactoryPlannerLayout";
import PlannerContent from "../../../components/shared/PlannerContent";

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
    handleDeleteTree,
    handleImportNode,
    handleUnimportNode,
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions
  } = useFactoryPlanner();
  
  const commandBarRef = useRef<HTMLDivElement>(null);
  const treeViewRef = useRef<HTMLDivElement>(null);
  const [commandBarHeight, setCommandBarHeight] = useState(0);

  useEffect(() => {
    if (commandBarRef.current) {
      setCommandBarHeight(commandBarRef.current.offsetHeight);
    }
  }, [isAddItemCollapsed]);

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
          dependencies={dependencies}
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
