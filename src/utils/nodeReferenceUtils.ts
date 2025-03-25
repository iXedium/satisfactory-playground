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
  
  // Store original children before we hide them
  if (!updatedNode.originalChildren && updatedNode.children && updatedNode.children.length > 0) {
    updatedNode.originalChildren = JSON.parse(JSON.stringify(updatedNode.children));
  }
  
  // Set the new reference
  updatedNode.importReference = {
    targetTreeId,
    targetNodeId
  };
  
  // Set childrenVisible to false for imported nodes
  updatedNode.childrenVisible = false;
  
  // Empty the children array (but preserve in originalChildren)
  updatedNode.children = [];
  
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
  
  // Restore original children if available
  if (node.originalChildren && node.originalChildren.length > 0) {
    // Replace children with original structure
    updatedNode.children = JSON.parse(JSON.stringify(node.originalChildren));
    console.log("[UNIMPORT] Restored original children structure with", updatedNode.children.length, "children");
  }
  
  // Ensure we preserve essential properties explicitly
  // These properties might be lost in the deep copy or not exist in originalChildren
  const propertiesToPreserve = [
    'selectedRecipeId',
    'availableRecipes',
    'excess'
  ];
  
  propertiesToPreserve.forEach(prop => {
    if (node[prop] !== undefined) {
      updatedNode[prop] = node[prop];
    }
  });
  
  // Ensure child nodes have their essential properties preserved too
  const preservePropertiesInChildren = (children) => {
    if (!children || !children.length) return;
    
    children.forEach(child => {
      // Ensure children are properly visible
      child.childrenVisible = true;
      
      // Make sure children have their recipe properties
      if (child.originalRecipeId) {
        child.selectedRecipeId = child.originalRecipeId;
      }
      
      // Recursively process nested children
      if (child.children && child.children.length > 0) {
        preservePropertiesInChildren(child.children);
      }
    });
  };
  
  preservePropertiesInChildren(updatedNode.children);
  
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