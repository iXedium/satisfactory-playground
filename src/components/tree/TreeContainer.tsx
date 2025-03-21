/**
 * TreeContainer Component
 * 
 * Container for a single dependency tree.
 */

import React, { useRef } from "react";
import { DependencyNode } from "../../utils/calculateDependencyTree";
import TreeNodeList from "./TreeNodeList";
import { Card } from "../common";
import { theme } from "../../styles/theme";

export interface TreeContainerProps {
  /**
   * ID of the tree
   */
  treeId: string;
  
  /**
   * Root node of the tree
   */
  tree: DependencyNode;
  
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
   * Whether to show extensions
   */
  showExtensions?: boolean;
  
  /**
   * Whether to accumulate extensions
   */
  accumulateExtensions?: boolean;
  
  /**
   * Whether to show machine section
   */
  showMachines?: boolean;
  
  /**
   * Whether to show machine multiplier
   */
  showMachineMultiplier?: boolean;
  
  /**
   * Callback when the tree is deleted
   */
  onDelete?: () => void;
  
  /**
   * Callback when a node is imported
   */
  onImportNode?: (nodeId: string) => void;
}

/**
 * TreeContainer component for displaying a single dependency tree
 */
const TreeContainer: React.FC<TreeContainerProps> = ({
  treeId,
  tree,
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap,
  onMachineCountChange,
  machineMultiplierMap,
  onMachineMultiplierChange,
  expandedNodes,
  onNodeExpandChange,
  showExtensions = false,
  accumulateExtensions = false,
  showMachines = true,
  showMachineMultiplier = false,
  onDelete,
  onImportNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get the title for the tree card
  const getTreeTitle = () => {
    if (!tree || !tree.id) return 'Tree';
    
    // Use the name of the root item as the tree title
    const amount = tree.amount ? `${tree.amount.toFixed(2)}/min` : '';
    return `${tree.name || tree.id} ${amount}`;
  };
  
  return (
    <Card
      title={getTreeTitle()}
      variant="outlined"
      actions={
        onDelete ? 
          <div 
            onClick={onDelete}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              color: theme.colors.dangerText,
              fontSize: '14px',
            }}
          >
            Delete Tree
          </div> : undefined
      }
    >
      <div 
        ref={containerRef} 
        style={{ 
          textAlign: "left",
          position: 'relative',
          overflow: 'visible',
          width: '100%',
          padding: '12px',
        }}
      >
        <TreeNodeList
          rootNode={tree}
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
          onImportNode={onImportNode}
        />
      </div>
    </Card>
  );
};

export default React.memo(TreeContainer); 