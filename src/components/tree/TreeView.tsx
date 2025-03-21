/**
 * TreeView Component
 * 
 * Main component for displaying dependency trees.
 * Acts as a composition root for tree visualization.
 */

import React from "react";
import { DependencyNode } from "../../utils/calculateDependencyTree";
import TreeContainer from "./TreeContainer";
import useTreeState from "../../hooks/useTreeState";

export interface TreeViewProps {
  /**
   * Map of tree IDs to dependency trees
   */
  trees: Record<string, DependencyNode>;
  
  /**
   * Callback when a recipe is changed
   */
  onRecipeChange?: (treeId: string, nodeId: string, recipeId: string) => void;
  
  /**
   * Callback when excess production is changed
   */
  onExcessChange?: (treeId: string, nodeId: string, excess: number) => void;
  
  /**
   * Map of excess values by node ID
   */
  excessMap: Record<string, number>;
  
  /**
   * Map of machine counts by node ID
   */
  machineCountMap: Record<string, number>;
  
  /**
   * Callback when machine count is changed
   */
  onMachineCountChange?: (treeId: string, nodeId: string, count: number) => void;
  
  /**
   * Map of machine multipliers by node ID
   */
  machineMultiplierMap: Record<string, number>;
  
  /**
   * Callback when machine multiplier is changed
   */
  onMachineMultiplierChange?: (treeId: string, nodeId: string, multiplier: number) => void;
  
  /**
   * Whether to show machine section
   */
  showMachines?: boolean;
  
  /**
   * Whether to show machine multiplier
   */
  showMachineMultiplier?: boolean;
  
  /**
   * Whether to show extensions
   */
  showExtensions?: boolean;
  
  /**
   * Whether to accumulate extensions
   */
  accumulateExtensions?: boolean;
  
  /**
   * Callback when a tree is deleted
   */
  onDeleteTree?: (treeId: string) => void;
  
  /**
   * Callback when a node is imported
   */
  onImportNode?: (treeId: string, nodeId: string) => void;
}

/**
 * TreeView component for displaying dependency trees
 */
const TreeView: React.FC<TreeViewProps> = ({
  trees,
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap,
  onMachineCountChange,
  machineMultiplierMap,
  onMachineMultiplierChange,
  showMachines = true,
  showMachineMultiplier = false,
  showExtensions = false,
  accumulateExtensions = false,
  onDeleteTree,
  onImportNode,
}) => {
  // Use custom hook to manage expanded nodes state
  const { expandedNodes, handleNodeExpandChange } = useTreeState();

  // Handle recipe change with tree ID context
  const handleRecipeChange = (treeId: string) => (nodeId: string, recipeId: string) => {
    if (onRecipeChange) {
      onRecipeChange(treeId, nodeId, recipeId);
    }
  };

  // Handle excess change with tree ID context
  const handleExcessChange = (treeId: string) => (nodeId: string, excess: number) => {
    if (onExcessChange) {
      onExcessChange(treeId, nodeId, excess);
    }
  };

  // Handle machine count change with tree ID context
  const handleMachineCountChange = (treeId: string) => (nodeId: string, count: number) => {
    if (onMachineCountChange) {
      onMachineCountChange(treeId, nodeId, count);
    }
  };

  // Handle machine multiplier change with tree ID context
  const handleMachineMultiplierChange = (treeId: string) => (nodeId: string, multiplier: number) => {
    if (onMachineMultiplierChange) {
      onMachineMultiplierChange(treeId, nodeId, multiplier);
    }
  };

  // Handle import node with tree ID context
  const handleImportNode = (treeId: string) => (nodeId: string) => {
    if (onImportNode) {
      onImportNode(treeId, nodeId);
    }
  };

  return (
    <div className="tree-view">
      {Object.entries(trees).map(([treeId, tree]) => (
        <TreeContainer
          key={treeId}
          treeId={treeId}
          tree={tree}
          onRecipeChange={handleRecipeChange(treeId)}
          onExcessChange={handleExcessChange(treeId)}
          excessMap={excessMap}
          machineCountMap={machineCountMap}
          onMachineCountChange={handleMachineCountChange(treeId)}
          machineMultiplierMap={machineMultiplierMap}
          onMachineMultiplierChange={handleMachineMultiplierChange(treeId)}
          expandedNodes={expandedNodes}
          onNodeExpandChange={handleNodeExpandChange}
          showExtensions={showExtensions}
          accumulateExtensions={accumulateExtensions}
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          onDelete={onDeleteTree ? () => onDeleteTree(treeId) : undefined}
          onImportNode={handleImportNode(treeId)}
        />
      ))}
    </div>
  );
};

export default React.memo(TreeView); 