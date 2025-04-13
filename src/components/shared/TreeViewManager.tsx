import React from 'react';
import DependencyTree from '../../features/factory-planner/components/DependencyTree';
import { DependencyNode } from '../../types';
import { AccumulatedNode } from '../../utils';
import { calculateDependencyTree } from '../../utils';
import { theme } from '../../styles/theme';

interface TreeViewManagerProps {
  dependencyTrees: Record<string, DependencyNode>;
  onRecipeChange: (nodeId: string, recipeId: string) => Promise<void>;
  onExcessChange: (nodeId: string, excess: number) => Promise<void>;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  onMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  onMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  onNodeExpandChange: (nodeId: string, expanded: boolean) => void;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  onDeleteTree: (treeId: string) => void;
  onImportNode: (nodeId: string) => void;
  onNodeUpdate?: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  containerStyle?: React.CSSProperties;
}

const TreeViewManager: React.FC<TreeViewManagerProps> = ({
  dependencyTrees,
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap,
  onMachineCountChange,
  machineMultiplierMap,
  onMachineMultiplierChange,
  expandedNodes,
  onNodeExpandChange,
  showMachines,
  showMachineMultiplier,
  onDeleteTree,
  onImportNode,
  onNodeUpdate,
  containerStyle,
}) => {
  return (
    <div
      style={{
        flex: 1,
        overflow: 'visible',
        ...containerStyle
      }}
    >
      {Object.entries(dependencyTrees).map(([treeId, tree]) => (
        <DependencyTree
          key={treeId}
          tree={tree}
          onRecipeChange={onRecipeChange}
          onExcessChange={onExcessChange}
          excessMap={excessMap}
          machineCountMap={machineCountMap}
          onMachineCountChange={onMachineCountChange}
          machineMultiplierMap={machineMultiplierMap}
          onMachineMultiplierChange={onMachineMultiplierChange}
          expandedNodes={expandedNodes}
          onNodeExpandChange={onNodeExpandChange}
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          isRoot={true}
          onDelete={() => onDeleteTree(treeId)}
          onImportNode={onImportNode}
          onNodeUpdate={onNodeUpdate}
        />
      ))}
    </div>
  );
};

export default TreeViewManager; 