import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import DependencyTree from "./DependencyTree";
import AccumulatedView from "./AccumulatedView";
import CommandBar from "./CommandBar";
import { theme } from "../styles/theme";
import { useFactoryPlanner } from "../hooks/useFactoryPlanner";

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

    // Handlers
    handleCalculate,
    handleTreeRecipeChange,
    handleExcessChange,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleExpandCollapseAll,
    handleDeleteTree,
    handleImportNode,
    clearSavedData,
    handleToggleNodeExtensions
  } = useFactoryPlanner();
  
  const commandBarRef = useRef<HTMLDivElement>(null);
  const treeViewRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: theme.colors.background
      }}>
        <CommandBar
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
        />
      </div>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px'
      }}>
        <div 
          ref={treeViewRef}
          id="tree-view"
          style={{
            overflow: 'visible'
          }}
        >
          {viewMode === "tree" ? (
            <div>
              {Object.entries(dependencies.dependencyTrees).map(([treeId, tree]) => (
                <DependencyTree
                  key={treeId}
                  tree={tree}
                  onRecipeChange={handleTreeRecipeChange}
                  onExcessChange={handleExcessChange}
                  excessMap={excessMap}
                  machineCountMap={machineCountMap}
                  onMachineCountChange={handleMachineCountChange}
                  machineMultiplierMap={machineMultiplierMap}
                  onMachineMultiplierChange={handleMachineMultiplierChange}
                  expandedNodes={expandedNodes}
                  onNodeExpandChange={(nodeId: string, expanded: boolean) => {
                    setExpandedNodes(prev => ({
                      ...prev,
                      [nodeId]: expanded
                    }));
                  }}
                  showExtensions={showExtensions}
                  accumulateExtensions={accumulateExtensions}
                  showMachines={showMachines}
                  showMachineMultiplier={showMachineMultiplier}
                  isRoot={true}
                  onDelete={() => handleDeleteTree(treeId)}
                  onImportNode={handleImportNode}
                />
              ))}
            </div>
          ) : (
            <AccumulatedView
              onRecipeChange={handleTreeRecipeChange}
              onExcessChange={handleExcessChange}
              excessMap={excessMap}
              machineCountMap={machineCountMap}
              onMachineCountChange={handleMachineCountChange}
              machineMultiplierMap={machineMultiplierMap}
              onMachineMultiplierChange={handleMachineMultiplierChange}
              showExtensions={showExtensions}
              accumulateExtensions={accumulateExtensions}
              showMachineSection={showMachines}
              showMachineMultiplier={showMachineMultiplier}
              onDeleteTree={handleDeleteTree}
              accumulatedDependencies={dependencies.accumulatedDependencies}
              onImportNode={handleImportNode}
              nodeExtensionOverrides={nodeExtensionOverrides}
              onToggleNodeExtensions={handleToggleNodeExtensions}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RefactoredDependencyTester; 