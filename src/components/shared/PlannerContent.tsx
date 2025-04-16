import React, { RefObject } from 'react';
import { AccumulatedNode } from '../../utils/calculateAccumulatedFromTree';
import { DependencyNode } from '../../types';
import { AccumulatedResourceView } from "../../features/factory-planner/components";
import TreeViewContainer from './TreeViewContainer';

// Import sort types (or define locally)
type TreeSortKey = 'default' | 'amount' | 'name'; 
type SortDirection = 'asc' | 'desc';

interface PlannerContentProps {
  viewMode: 'tree' | 'accumulated';
  treeViewRef: RefObject<HTMLDivElement | null>;
  dependencies: {
    dependencyTrees: Record<string, DependencyNode>;
    accumulatedDependencies: Record<string, AccumulatedNode>;
  };
  handleTreeRecipeChange: (nodeId: string, recipeId: string) => void;
  handleExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  handleMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  handleMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  handleDeleteTree: (treeId: string) => void;
  handleImportNode: (nodeId: string) => void;
  handleNodeUpdate?: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  nodeExtensionOverrides: Record<string, boolean>;
  handleToggleNodeExtensions: (nodeId: string) => void;
  containerStyle?: React.CSSProperties;
  itemsMap: Record<string, Item>;
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
}

/**
 * Content container that renders either TreeView or AccumulatedView based on viewMode
 */
const PlannerContent: React.FC<PlannerContentProps> = ({
  viewMode,
  treeViewRef,
  dependencies,
  handleTreeRecipeChange,
  handleExcessChange,
  excessMap,
  machineCountMap,
  handleMachineCountChange,
  machineMultiplierMap,
  handleMachineMultiplierChange,
  expandedNodes,
  setExpandedNodes,
  showExtensions,
  accumulateExtensions,
  showMachines,
  showMachineMultiplier,
  handleDeleteTree,
  handleImportNode,
  handleNodeUpdate,
  nodeExtensionOverrides,
  handleToggleNodeExtensions,
  containerStyle,
  itemsMap,
  treeSortKey,
  treeSortDirection,
}) => {
  return (
    <div 
      ref={treeViewRef}
      id="tree-view"
      style={{
        overflow: 'visible',
        ...containerStyle
      }}
    >
      {viewMode === "tree" ? (
        <TreeViewContainer
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
          itemsMap={itemsMap}
          treeSortKey={treeSortKey}
          treeSortDirection={treeSortDirection}
        />
      ) : (
        <AccumulatedResourceView
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
  );
};

export default PlannerContent; 