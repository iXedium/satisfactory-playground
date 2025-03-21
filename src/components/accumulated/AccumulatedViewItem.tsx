/**
 * AccumulatedViewItem Component
 * 
 * Renders a single item row in the accumulated view.
 */

import React from "react";
import { Recipe, Item } from "../../types/core";
import { Card } from "../common";
import { ItemNode } from "../nodes/ItemNode";
import { theme } from "../../styles/theme";

export interface AccumulatedViewItemProps {
  /**
   * Item ID
   */
  itemId: string;
  
  /**
   * Total amount of this item
   */
  amount: number;
  
  /**
   * Whether this item is a root node
   */
  isRoot?: boolean;
  
  /**
   * Whether this item is a byproduct
   */
  isByproduct?: boolean;
  
  /**
   * Whether this item is imported
   */
  isImport?: boolean;
  
  /**
   * Available recipes for this item
   */
  recipes?: Recipe[];
  
  /**
   * ID of the selected recipe
   */
  selectedRecipeId?: string;
  
  /**
   * Callback when recipe is changed
   */
  onRecipeChange?: (recipeId: string) => void;
  
  /**
   * Excess production amount
   */
  excess?: number;
  
  /**
   * Callback when excess is changed
   */
  onExcessChange?: (excess: number) => void;
  
  /**
   * Machine count for this item
   */
  machineCount?: number;
  
  /**
   * Callback when machine count is changed
   */
  onMachineCountChange?: (count: number) => void;
  
  /**
   * Machine multiplier for this item
   */
  machineMultiplier?: number;
  
  /**
   * Callback when machine multiplier is changed
   */
  onMachineMultiplierChange?: (multiplier: number) => void;
  
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
   * Callback when an item is deleted
   */
  onDelete?: () => void;
  
  /**
   * Callback when an item is imported
   */
  onImport?: () => void;
  
  /**
   * Callback when clicking on a consumer
   */
  onConsumerClick?: (nodeId: string) => void;
  
  /**
   * Node extension overrides
   */
  nodeExtensionOverrides?: Record<string, boolean>;
  
  /**
   * Callback when node extensions are toggled
   */
  onToggleNodeExtensions?: (nodeId: string) => void;
  
  /**
   * Unique node ID
   */
  nodeId: string;
  
  /**
   * Item depth in the tree
   */
  depth: number;
  
  /**
   * Whether to use compact view
   */
  compact?: boolean;
  
  /**
   * Node IDs associated with this item
   */
  nodeIds: string[];
}

/**
 * Component for displaying a single item in the accumulated view
 */
const AccumulatedViewItem: React.FC<AccumulatedViewItemProps> = ({
  itemId,
  amount,
  isRoot = false,
  isByproduct = false,
  isImport = false,
  recipes = [],
  selectedRecipeId,
  onRecipeChange,
  excess = 0,
  onExcessChange,
  machineCount = 1,
  onMachineCountChange,
  machineMultiplier = 1,
  onMachineMultiplierChange,
  showMachines = true,
  showMachineMultiplier = false,
  showExtensions = true,
  accumulateExtensions = false,
  onDelete,
  onImport,
  onConsumerClick,
  nodeExtensionOverrides,
  onToggleNodeExtensions,
  nodeId,
  depth,
  compact = false,
  nodeIds,
}) => {
  const getBorderColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    if (isImport) return theme.colors.nodeImport;
    return theme.colors.nodeDefault;
  };
  
  return (
    <Card
      variant="outlined"
      className="accumulated-view-item"
      style={{
        marginBottom: "8px",
        borderColor: getBorderColor(),
        borderLeftWidth: "4px",
      }}
      noPadding
    >
      <ItemNode
        itemId={itemId}
        amount={amount}
        isRoot={isRoot}
        isByproduct={isByproduct}
        isImport={isImport}
        recipes={recipes}
        selectedRecipeId={selectedRecipeId}
        onRecipeChange={onRecipeChange}
        excess={excess}
        onExcessChange={onExcessChange}
        machineCount={machineCount}
        onMachineCountChange={onMachineCountChange}
        machineMultiplier={machineMultiplier}
        onMachineMultiplierChange={onMachineMultiplierChange}
        showMachines={showMachines}
        showMachineMultiplier={showMachineMultiplier}
        onDelete={onDelete}
        onImport={onImport}
        nodeId={nodeId}
      />
      
      {/* Node ID indicators */}
      {!compact && nodeIds.length > 1 && (
        <div
          style={{
            padding: "4px 8px",
            backgroundColor: theme.colors.cardBackground,
            borderTop: `1px solid ${theme.colors.border}`,
            fontSize: "12px",
            color: theme.colors.textSecondary,
          }}
        >
          <span>This item appears in {nodeIds.length} places in the production chain.</span>
        </div>
      )}
    </Card>
  );
};

export default React.memo(AccumulatedViewItem); 