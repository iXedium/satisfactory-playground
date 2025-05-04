import React, { forwardRef } from 'react';
import { DependencyNode, Item } from '../../types';
import TreeViewContainer from './TreeViewContainer';
import { SortDirection, TreeSortKey } from '../../features/factory-planner/hooks/useFactoryPlanner';
import { DropResult } from '@hello-pangea/dnd';
import { ViewDensity } from '../../features/factory-planner/hooks/usePlannerDisplayOptions';

interface PlannerContentProps {
  treesArray: DependencyNode[];
  onManualSort: (result: DropResult) => void;
  handleTreeRecipeChange: (nodeId: string, recipeId: string) => void;
  handleExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  handleMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  handleMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  handleDeleteTree: (treeId: string) => void;
  handleImportNode: (nodeId: string) => void;
  handleUnimportNode?: (nodeId: string) => void;
  handleNodeUpdate: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  nodeExtensionOverrides?: Record<string, boolean>;
  handleToggleNodeExtensions?: (nodeId: string) => void;
  containerStyle?: React.CSSProperties;
  itemsMap: Record<string, Item>;
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
  viewDensity: ViewDensity;
  onOptimizeAllMachines?: () => void;
}

/**
 * Content container that renders the TreeView
 */
const PlannerContent = forwardRef<HTMLDivElement, PlannerContentProps>((
  {
    treesArray,
    onManualSort,
    handleTreeRecipeChange,
    handleExcessChange,
    excessMap,
    machineCountMap,
    handleMachineCountChange,
    machineMultiplierMap,
    handleMachineMultiplierChange,
    expandedNodes,
    setExpandedNodes,
    showMachines,
    showMachineMultiplier,
    handleDeleteTree,
    handleImportNode,
    handleUnimportNode,
    handleNodeUpdate,
    nodeExtensionOverrides,
    handleToggleNodeExtensions,
    containerStyle,
    itemsMap,
    treeSortKey,
    treeSortDirection,
    viewDensity,
    onOptimizeAllMachines,
  },
  ref
) => {
  return (
    <div 
      ref={ref}
      id="tree-view"
      style={{
        overflowY: 'auto',
        height: '100%',
        ...containerStyle
      }}
    >
      <TreeViewContainer
        treesArray={treesArray}
        onManualSort={onManualSort}
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
        itemsMap={itemsMap}
        treeSortKey={treeSortKey}
        treeSortDirection={treeSortDirection}
        nodeExtensionOverrides={nodeExtensionOverrides}
        handleToggleNodeExtensions={handleToggleNodeExtensions}
        viewDensity={viewDensity}
        onOptimizeAllMachines={onOptimizeAllMachines}
      />
    </div>
  );
});

export default PlannerContent; 