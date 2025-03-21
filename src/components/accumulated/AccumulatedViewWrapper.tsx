/**
 * AccumulatedViewWrapper Component
 * 
 * Wrapper for the refactored AccumulatedView component to maintain backward compatibility
 * with the original AccumulatedView API while using the new implementation.
 */

import React from "react";
import AccumulatedView from "./AccumulatedView";
import { AccumulatedNode } from "../../utils/calculateAccumulatedFromTree";

// Define the props interface that matches the original AccumulatedView component
export interface AccumulatedViewWrapperProps {
  /**
   * Callback when a recipe is changed
   */
  onRecipeChange: (nodeId: string, recipeId: string) => void;
  
  /**
   * Callback when excess is changed
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
  showMachineSection?: boolean;
  
  /**
   * Whether to show machine multiplier
   */
  showMachineMultiplier?: boolean;
  
  /**
   * Callback when a tree is deleted
   */
  onDelete?: (treeId: string) => void;
  
  /**
   * Map of accumulated dependencies
   */
  accumulatedDependencies: Record<string, AccumulatedNode>;
  
  /**
   * Callback when a tree is deleted
   */
  onDeleteTree?: (treeId: string) => void;
  
  /**
   * Callback when a node is imported
   */
  onImportNode?: (nodeId: string) => void;
  
  /**
   * Map of node extension overrides
   */
  nodeExtensionOverrides?: Record<string, boolean>;
  
  /**
   * Callback when node extensions are toggled
   */
  onToggleNodeExtensions?: (nodeId: string) => void;
}

/**
 * AccumulatedViewWrapper component that maintains backward compatibility
 * while using the new modular AccumulatedView implementation
 */
const AccumulatedViewWrapper: React.FC<AccumulatedViewWrapperProps> = (props) => {
  return (
    <AccumulatedView {...props} />
  );
};

export default AccumulatedViewWrapper; 