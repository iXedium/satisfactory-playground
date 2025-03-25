import React, { useRef } from "react";
import RefactoredCommandBar from "./RefactoredCommandBar";
import { useFactoryPlanner } from "../hooks/useFactoryPlanner";
import PlannerContent from "./shared/PlannerContent";
import FactoryPlannerLayout from "./shared/FactoryPlannerLayout";

/**
 * Main component for the Factory Planner application
 * Orchestrates the layout and data flow between components
 */
const RefactoredDependencyTester: React.FC = () => {
  const {
    // State
    dependencies,
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

    // Setters
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

    // Handlers
    handleCalculate,
    handleTreeRecipeChange,
    handleExcessChange,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleExpandCollapseAll,
    handleDeleteTree,
    handleImportNode,
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions
  } = useFactoryPlanner();
  
  const commandBarRef = useRef<HTMLDivElement>(null);
  const treeViewRef = useRef<HTMLDivElement>(null);

  return (
    <FactoryPlannerLayout
      commandBar={
        <RefactoredCommandBar
          ref={commandBarRef}
          items={items}
          selectedItem={selectedItem}
          onItemSelect={setSelectedItem}
          selectedRecipe={selectedRecipe}
          onRecipeSelect={setSelectedRecipe}
          onCalculate={handleCalculate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
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
        />
      }
      content={
        <PlannerContent
          viewMode={viewMode}
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
          handleNodeUpdate={handleNodeUpdate}
          nodeExtensionOverrides={nodeExtensionOverrides}
          handleToggleNodeExtensions={handleToggleNodeExtensions}
        />
      }
    />
  );
};

export default RefactoredDependencyTester; 