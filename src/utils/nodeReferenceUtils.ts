import { DependencyNode } from './calculateDependencyTree';

/**
 * Utilities for working with node references in the import/export system
 */

/**
 * Check if a node is importing from another node
 */
export const isNodeImporting = (node: DependencyNode): boolean => {
  // Support both legacy and new system
  return !!node.importReference || !!node.isImport;
};

/**
 * Get the reference info for a node (supports both legacy and new system)
 */
export const getImportReference = (
  node: DependencyNode
): { targetTreeId: string; targetNodeId: string } | null => {
  if (node.importReference) {
    return node.importReference;
  }
  
  // Legacy support
  if (node.isImport && node.importedFrom) {
    // In legacy system, we only have the tree ID, not the specific target node ID
    // We use a standardized format for compatibility
    return {
      targetTreeId: node.importedFrom,
      targetNodeId: 'root' // Legacy system only supported importing from roots
    };
  }
  
  return null;
};

/**
 * Set import reference on a node
 */
export const setImportReference = (
  node: DependencyNode,
  targetTreeId: string,
  targetNodeId: string
): DependencyNode => {
  // Create a shallow copy to maintain immutability
  const updatedNode = { ...node };
  
  // Set the new reference
  updatedNode.importReference = {
    targetTreeId,
    targetNodeId
  };
  
  // Set childrenVisible to false for imported nodes
  updatedNode.childrenVisible = false;
  
  // Support legacy system during transition
  updatedNode.isImport = true;
  updatedNode.importedFrom = targetTreeId;
  
  return updatedNode;
};

/**
 * Clear import reference from a node
 */
export const clearImportReference = (node: DependencyNode): DependencyNode => {
  // Create a deep copy to preserve all properties
  const updatedNode = JSON.parse(JSON.stringify(node));
  
  // Clear the reference
  updatedNode.importReference = undefined;
  
  // Restore children visibility
  updatedNode.childrenVisible = true;
  
  // Support legacy system during transition
  updatedNode.isImport = false;
  updatedNode.importedFrom = undefined;
  
  // Ensure we preserve essential properties
  if (node.selectedRecipeId) {
    updatedNode.selectedRecipeId = node.selectedRecipeId;
  }
  
  if (node.availableRecipes) {
    updatedNode.availableRecipes = node.availableRecipes;
  }
  
  return updatedNode;
};

/**
 * Find a node by ID in a dependency tree
 */
export const findNodeById = (tree: DependencyNode, nodeId: string): DependencyNode | null => {
  if (tree.uniqueId === nodeId) {
    return tree;
  }
  
  // Check children
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeById(child, nodeId);
      if (found) {
        return found;
      }
    }
  }
  
  // Also check originalChildren if present
  if (tree.originalChildren) {
    for (const child of tree.originalChildren) {
      const found = findNodeById(child, nodeId);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

/**
 * Find the target node that a node is importing from
 */
export const findTargetNode = (
  trees: Record<string, DependencyNode>,
  sourceNode: DependencyNode
): DependencyNode | null => {
  const reference = getImportReference(sourceNode);
  if (!reference) return null;
  
  const { targetTreeId, targetNodeId } = reference;
  const targetTree = trees[targetTreeId];
  if (!targetTree) return null;
  
  // For legacy system, we just return the root
  if (targetNodeId === 'root') {
    return targetTree;
  }
  
  // For new system, find the specific node
  return findNodeById(targetTree, targetNodeId);
};

/**
 * Toggle the visibility of a node's children
 * @param node The node to update
 * @param explicitVisibility Optional explicit visibility value to set (if not provided, will toggle current value)
 */
export const toggleChildrenVisibility = (
  node: DependencyNode,
  explicitVisibility?: boolean
): DependencyNode => {
  // If childrenVisible is undefined, we should treat it as true when toggling
  const currentVisibility = node.childrenVisible === undefined ? true : node.childrenVisible;
  
  // If explicitVisibility is provided, use that value
  // Otherwise toggle the current visibility
  const newVisibility = explicitVisibility !== undefined 
    ? explicitVisibility 
    : !currentVisibility;
  
  return {
    ...node,
    childrenVisible: newVisibility
  };
};

/**
 * Apply a function to a node and all its visible descendants
 */
export const traverseVisibleNodes = (
  node: DependencyNode,
  callback: (node: DependencyNode) => void
): void => {
  callback(node);
  
  // Only traverse children if they're visible or visibility isn't specified
  if ((node.childrenVisible !== false) && node.children) {
    for (const child of node.children) {
      traverseVisibleNodes(child, callback);
    }
  }
}; 