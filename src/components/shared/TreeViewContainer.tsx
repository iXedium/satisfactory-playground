import React from 'react';
import { DependencyNode } from '../../types';
import DependencyTree from '../../features/factory-planner/components/DependencyTree';

interface TreeViewContainerProps {
  dependencies: {
    dependencyTrees: Record<string, DependencyNode>;
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
  containerStyle?: React.CSSProperties;
}

/**
 * Container component for rendering the tree view of dependency trees
 */
const TreeViewContainer: React.FC<TreeViewContainerProps> = ({
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
  containerStyle
}) => {
  return (
    <div style={containerStyle}>
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
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          isRoot={true}
          onDelete={() => handleDeleteTree(treeId)}
          onImportNode={handleImportNode}
          onNodeUpdate={handleNodeUpdate}
        />
      ))}
    </div>
  );
};

export default TreeViewContainer; 