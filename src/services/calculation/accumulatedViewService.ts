/**
 * AccumulatedViewService
 * 
 * Responsible for calculating accumulated values from dependency trees.
 * This service handles the aggregation of data across multiple trees.
 */

import { DependencyNode, AccumulatedNode } from '../../types/core';

/**
 * Calculate accumulated nodes from a single dependency tree
 * 
 * @param tree - The dependency tree to calculate from
 * @returns Array of accumulated nodes
 */
export function calculateAccumulatedFromTree(tree: DependencyNode): AccumulatedNode[] {
  const accumulated: Record<string, AccumulatedNode> = {};

  // Function to process a node and its children
  const processNode = (node: DependencyNode): void => {
    const { id, amount, uniqueId, isByproduct, selectedRecipeId, excess } = node;

    // Create or update the accumulated entry
    if (!accumulated[id]) {
      accumulated[id] = {
        itemId: id,
        amount: 0,
        nodeIds: [],
        isByproduct: !!isByproduct,
        selectedRecipeId,
        excess: 0
      };
    }

    // Accumulate the amount
    accumulated[id].amount += amount;
    accumulated[id].nodeIds.push(uniqueId);
    
    // Only set excess if not already set
    if (excess && !accumulated[id].excess) {
      accumulated[id].excess = excess;
    }

    // Process children recursively
    node.children?.forEach(processNode);
  };

  // Start with the root node
  processNode(tree);

  // Convert the record to an array
  return Object.values(accumulated);
}

/**
 * Calculate accumulated nodes from multiple dependency trees
 * 
 * @param trees - Record of dependency trees indexed by tree ID
 * @returns Array of accumulated nodes
 */
export function calculateAccumulatedFromTrees(
  trees: Record<string, DependencyNode>
): AccumulatedNode[] {
  const accumulated: Record<string, AccumulatedNode> = {};

  // Process each tree
  Object.values(trees).forEach(tree => {
    // Process each node in the tree
    const processNode = (node: DependencyNode): void => {
      const { id, amount, uniqueId, isByproduct, selectedRecipeId, excess } = node;

      // Create or update the accumulated entry
      if (!accumulated[id]) {
        accumulated[id] = {
          itemId: id,
          amount: 0,
          nodeIds: [],
          isByproduct: !!isByproduct,
          selectedRecipeId,
          excess: 0
        };
      }

      // Accumulate the amount
      accumulated[id].amount += amount;
      accumulated[id].nodeIds.push(uniqueId);
      
      // Accumulate excess values
      if (excess) {
        accumulated[id].excess = (accumulated[id].excess || 0) + excess;
      }

      // Process children recursively
      node.children?.forEach(processNode);
    };

    // Start with the root node of each tree
    processNode(tree);
  });

  // Convert the record to an array and sort by amount (descending)
  return Object.values(accumulated)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Merge accumulated nodes with machine data
 * 
 * @param accumulatedNodes - Array of accumulated nodes
 * @param machineCountMap - Map of machine counts by node ID
 * @param machineMultiplierMap - Map of machine multipliers by node ID
 * @returns Updated array of accumulated nodes with machine data
 */
export function mergeAccumulatedWithMachines(
  accumulatedNodes: AccumulatedNode[],
  machineCountMap: Record<string, number>,
  machineMultiplierMap: Record<string, number>
): AccumulatedNode[] {
  return accumulatedNodes.map(node => {
    // Get the primary node ID (first in the list)
    const primaryNodeId = node.nodeIds[0];
    
    return {
      ...node,
      machineCount: machineCountMap[primaryNodeId] || 1,
      machineMultiplier: machineMultiplierMap[primaryNodeId] || 1
    };
  });
}

/**
 * Filter accumulated nodes based on criteria
 * 
 * @param nodes - Array of accumulated nodes to filter
 * @param options - Filter options
 * @returns Filtered array of accumulated nodes
 */
export function filterAccumulatedNodes(
  nodes: AccumulatedNode[],
  options: {
    showByproducts?: boolean;
    minAmount?: number;
    filterItemIds?: string[];
  } = {}
): AccumulatedNode[] {
  const { showByproducts = true, minAmount = 0, filterItemIds } = options;
  
  return nodes.filter(node => {
    // Filter by byproduct status
    if (!showByproducts && node.isByproduct) {
      return false;
    }
    
    // Filter by minimum amount
    if (Math.abs(node.amount) < minAmount) {
      return false;
    }
    
    // Filter by item IDs
    if (filterItemIds && !filterItemIds.includes(node.itemId)) {
      return false;
    }
    
    return true;
  });
} 