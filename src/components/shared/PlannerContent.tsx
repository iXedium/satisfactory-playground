import React, { RefObject } from 'react';
import { DependencyNode } from '../../types';
import TreeViewContainer from './TreeViewContainer';
import { DependencyState } from '../../features/factory-planner/store/dependencySlice';
import { Item } from '../../types';
import { SortDirection, TreeSortKey } from '../../features/factory-planner/hooks/useFactoryPlanner';

interface PlannerContentProps {
  treeViewRef: RefObject<HTMLDivElement | null>;
  dependencies: DependencyState;
  handleTreeRecipeChange: (nodeId: string, recipeId: string) => void;
  handleExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  handleMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  handleMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  handleDeleteTree: (treeId: string) => void;
  handleImportNode: (nodeId: string) => void;
  handleUnimportNode?: (nodeId: string) => void;
  handleNodeUpdate: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  nodeExtensionOverrides: Record<string, boolean>;
  handleToggleNodeExtensions: (nodeId: string) => void;
  containerStyle?: React.CSSProperties;
  itemsMap: Record<string, Item>;
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
}

/**
 * Content container that renders the TreeView
 */
const PlannerContent: React.FC<PlannerContentProps> = ({
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
  handleUnimportNode,
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
        handleUnimportNode={handleUnimportNode}
        handleNodeUpdate={handleNodeUpdate}
        itemsMap={itemsMap}
        treeSortKey={treeSortKey}
        treeSortDirection={treeSortDirection}
        nodeExtensionOverrides={nodeExtensionOverrides}
        handleToggleNodeExtensions={handleToggleNodeExtensions}
        containerStyle={{}}
      />
    </div>
  );
};

export default PlannerContent; 