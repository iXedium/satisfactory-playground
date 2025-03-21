/**
 * TreeNodeList Component
 * 
 * Renders a list of tree nodes starting from a root node.
 */

import React from "react";
import { DependencyNode } from "../../utils/calculateDependencyTree";
import TreeNodeItem from "./TreeNodeItem";

export interface TreeNodeListProps {
  /**
   * Root node of the tree or subtree
   */
  rootNode: DependencyNode;
  
  /**
   * Callback when a recipe is changed
   */
  onRecipeChange: (nodeId: string, recipeId: string) => void;
  
  /**
   * Callback when excess production is changed
   */
  onExcessChange: (nodeId: string, excess: number) => void;
  
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
  onMachineCountChange: (nodeId: string, count: number) => void;
  
  /**
   * Map of machine multipliers by node ID
   */
  machineMultiplierMap: Record<string, number>;
  
  /**
   * Callback when machine multiplier is changed
   */
  onMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  
  /**
   * Map of expanded node IDs
   */
  expandedNodes: Record<string, boolean>;
  
  /**
   * Callback when node expansion state changes
   */
  onNodeExpandChange: (nodeId: string, expanded: boolean) => void;
  
  /**
   * Whether to show machines section
   */
  showMachines?: boolean;
  
  /**
   * Whether to show machine multiplier
   */
  showMachineMultiplier?: boolean;
  
  /**
   * Callback when a node is imported
   */
  onImportNode?: (nodeId: string) => void;
  
  /**
   * Current depth level in the tree (for indentation)
   */
  depth?: number;
}

/**
 * TreeNodeList component for rendering a list of tree nodes
 */
const TreeNodeList: React.FC<TreeNodeListProps> = ({
  rootNode,
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap,
  onMachineCountChange,
  machineMultiplierMap,
  onMachineMultiplierChange,
  expandedNodes,
  onNodeExpandChange,
  showMachines = true,
  showMachineMultiplier = false,
  onImportNode,
  depth = 0,
}) => {
  // Recursive function to render a node and its children
  const renderNode = (node: DependencyNode, nodeDepth: number) => {
    const isExpanded = expandedNodes[node.uniqueId] !== false; // Default to true if not set
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <React.Fragment key={node.uniqueId}>
        <TreeNodeItem
          node={node}
          depth={nodeDepth}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggle={() => hasChildren && onNodeExpandChange(node.uniqueId, !isExpanded)}
          onRecipeChange={(recipeId) => onRecipeChange(node.uniqueId, recipeId)}
          onExcessChange={(excess) => onExcessChange(node.uniqueId, excess)}
          excessValue={excessMap[node.uniqueId] || 0}
          machineCount={machineCountMap[node.uniqueId] || 1}
          onMachineCountChange={(count) => onMachineCountChange(node.uniqueId, count)}
          machineMultiplier={machineMultiplierMap[node.uniqueId] || 1}
          onMachineMultiplierChange={(multiplier) => onMachineMultiplierChange(node.uniqueId, multiplier)}
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          onImport={onImportNode ? () => onImportNode(node.uniqueId) : undefined}
        />
        
        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="tree-node-children">
            {node.children?.map(childNode => renderNode(childNode, nodeDepth + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };
  
  return (
    <div className="tree-node-list">
      {renderNode(rootNode, depth)}
    </div>
  );
};

export default React.memo(TreeNodeList); 