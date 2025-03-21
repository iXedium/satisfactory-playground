/**
 * TreeNodeItem Component
 * 
 * Renders a single node in the dependency tree.
 */

import React from "react";
import { DependencyNode } from "../../utils/calculateDependencyTree";
import { ItemNode } from "../nodes/ItemNode";
import { theme } from "../../styles/theme";

export interface TreeNodeItemProps {
  /**
   * Node data to display
   */
  node: DependencyNode;
  
  /**
   * Depth of the node in the tree (for indentation)
   */
  depth: number;
  
  /**
   * Whether the node is expanded
   */
  isExpanded: boolean;
  
  /**
   * Whether the node has children
   */
  hasChildren: boolean;
  
  /**
   * Callback when the node is toggled (expanded/collapsed)
   */
  onToggle: () => void;
  
  /**
   * Callback when a recipe is changed
   */
  onRecipeChange: (recipeId: string) => void;
  
  /**
   * Callback when excess production is changed
   */
  onExcessChange: (excess: number) => void;
  
  /**
   * Current excess value
   */
  excessValue: number;
  
  /**
   * Current machine count
   */
  machineCount: number;
  
  /**
   * Callback when machine count is changed
   */
  onMachineCountChange: (count: number) => void;
  
  /**
   * Current machine multiplier
   */
  machineMultiplier: number;
  
  /**
   * Callback when machine multiplier is changed
   */
  onMachineMultiplierChange: (multiplier: number) => void;
  
  /**
   * Whether to show machines section
   */
  showMachines?: boolean;
  
  /**
   * Whether to show machine multiplier
   */
  showMachineMultiplier?: boolean;
  
  /**
   * Callback when the node is imported
   */
  onImport?: () => void;
}

/**
 * TreeNodeItem component for displaying a single node in the tree
 */
const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  isExpanded,
  hasChildren,
  onToggle,
  onRecipeChange,
  onExcessChange,
  excessValue,
  machineCount,
  onMachineCountChange,
  machineMultiplier,
  onMachineMultiplierChange,
  showMachines = true,
  showMachineMultiplier = false,
  onImport,
}) => {
  // Calculate background color based on depth
  const getBackgroundColor = (depth: number) => {
    // Start with a lighter base and make subtle changes with depth
    const baseRGB = [90, 100, 110];  // Slightly lighter base color
    const darkenStep = 10;  // More subtle darkening per level
    
    // Calculate darkened RGB values based on depth
    const r = Math.max(baseRGB[0] - (depth * darkenStep), 10);  // Don't go darker than 10
    const g = Math.max(baseRGB[1] - (depth * darkenStep), 20);  // Don't go darker than 20
    const b = Math.max(baseRGB[2] - (depth * darkenStep), 35);  // Don't go darker than 35
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  return (
    <div
      className="tree-node-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        background: getBackgroundColor(depth),
        marginBottom: '8px',
        padding: '0 12px 0 0',
        paddingLeft: `${depth * 32}px`,
        borderRadius: theme.border.radius,
        position: 'relative',
        zIndex: 0
      }}
      data-node-id={node.uniqueId}
    >
      {/* Expand/collapse toggle */}
      <div
        onClick={onToggle}
        style={{ 
          padding: '8px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          cursor: hasChildren ? 'pointer' : 'default',
          zIndex: 1
        }}
      >
        {hasChildren ? (isExpanded ? "▼" : "▶") : ""}
      </div>
      
      {/* ItemNode component */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        zIndex: 2
      }}>
        <ItemNode
          itemId={node.id}
          amount={node.amount}
          isRoot={node.isRoot}
          isByproduct={node.isByproduct}
          isImport={node.isImport}
          recipes={node.availableRecipes}
          selectedRecipeId={node.selectedRecipeId}
          onRecipeChange={onRecipeChange}
          style={{ 
            backgroundColor: 'transparent'
          }}
          excess={excessValue}
          onExcessChange={onExcessChange}
          onIconClick={hasChildren ? onToggle : undefined}
          index={depth}
          machineCount={machineCount}
          onMachineCountChange={onMachineCountChange}
          machineMultiplier={machineMultiplier}
          onMachineMultiplierChange={onMachineMultiplierChange}
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          onImport={onImport}
        />
      </div>
    </div>
  );
};

export default React.memo(TreeNodeItem); 