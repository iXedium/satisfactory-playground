import React from 'react';
import { Item, Recipe } from '../../types/core';
import { useItemData } from '../../hooks/useItemData';

export interface ItemNodeProps {
  /** The item ID */
  itemId: string;
  
  /** The amount of the item */
  amount: number;
  
  /** The node ID */
  nodeId: string;
  
  /** Whether this is a root node */
  isRoot?: boolean;
  
  /** Whether this node is a byproduct */
  isByproduct?: boolean;
  
  /** Whether this node is imported */
  isImport?: boolean;
  
  /** Available recipes for this item */
  recipes?: Recipe[];
  
  /** ID of the selected recipe */
  selectedRecipeId?: string;
  
  /** Callback when recipe is changed */
  onRecipeChange?: (recipeId: string) => void;
  
  /** Excess production amount */
  excess?: number;
  
  /** Callback when excess is changed */
  onExcessChange?: (excess: number) => void;
  
  /** Machine count for this item */
  machineCount?: number;
  
  /** Callback when machine count is changed */
  onMachineCountChange?: (count: number) => void;
  
  /** Machine multiplier for this item */
  machineMultiplier?: number;
  
  /** Callback when machine multiplier is changed */
  onMachineMultiplierChange?: (multiplier: number) => void;
  
  /** Whether to show machine section */
  showMachines?: boolean;
  
  /** Whether to show machine multiplier */
  showMachineMultiplier?: boolean;
  
  /** Callback when an item is deleted */
  onDelete?: () => void;
  
  /** Callback when an item is imported */
  onImport?: () => void;
}

/**
 * Component for displaying an item node
 */
const ItemNode: React.FC<ItemNodeProps> = ({
  itemId,
  amount,
  nodeId,
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
  onDelete,
  onImport,
}) => {
  // Fetch item data from the database
  const { selectedItem } = useItemData({ initialItemId: itemId });
  
  if (!selectedItem) {
    return <div>Loading item...</div>;
  }
  
  return (
    <div className="item-node">
      <div className="item-node__header">
        <span className="item-node__name">{selectedItem.name}</span>
        <span className="item-node__amount">{amount.toFixed(2)}/min</span>
      </div>
      
      {/* Additional implementation details will be added in future PRs */}
    </div>
  );
};

export default ItemNode; 