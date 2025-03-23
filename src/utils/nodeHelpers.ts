/**
 * Node Helper Utilities
 * 
 * Safe utility functions for working with tree nodes that may have undefined children.
 */

import { DependencyNode } from '../types/core';

/**
 * Safely check if a node has children
 * @param node The dependency node to check
 * @returns True if the node has children
 */
export function hasChildren(node: DependencyNode): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

/**
 * Safely get node children, handling undefined children
 * @param node The dependency node
 * @returns Array of child nodes, empty array if no children
 */
export function getNodeChildren(node: DependencyNode): DependencyNode[] {
  return node.children || [];
}

/**
 * Safely map a function over node children
 * @param node The parent node
 * @param mapFn The mapping function to apply to each child
 * @returns Array of transformed children
 */
export function mapNodeChildren(
  node: DependencyNode, 
  mapFn: (child: DependencyNode) => DependencyNode
): DependencyNode[] {
  return getNodeChildren(node).map(mapFn);
}

/**
 * Safely iterate over node children
 * @param node The parent node
 * @param callback The function to call for each child
 */
export function forEachNodeChild(
  node: DependencyNode,
  callback: (child: DependencyNode) => void
): void {
  getNodeChildren(node).forEach(callback);
}

/**
 * Find a child node by ID
 * @param node The parent node
 * @param childId The ID of the child to find
 * @returns The child node or undefined if not found
 */
export function findNodeChildById(
  node: DependencyNode,
  childId: string
): DependencyNode | undefined {
  return getNodeChildren(node).find(child => child.uniqueId === childId);
}

/**
 * Find a node by ID in a tree
 * @param root The root node of the tree
 * @param nodeId The ID of the node to find
 * @returns The found node or undefined
 */
export function findNodeInTree(
  root: DependencyNode,
  nodeId: string
): DependencyNode | undefined {
  if (root.uniqueId === nodeId) {
    return root;
  }
  
  for (const child of getNodeChildren(root)) {
    const found = findNodeInTree(child, nodeId);
    if (found) {
      return found;
    }
  }
  
  return undefined;
}

/**
 * Get all nodes in a tree (depth-first traversal)
 * @param root The root node of the tree
 * @returns Array of all nodes in the tree
 */
export function getAllNodesInTree(root: DependencyNode): DependencyNode[] {
  const result: DependencyNode[] = [root];
  
  forEachNodeChild(root, child => {
    result.push(...getAllNodesInTree(child));
  });
  
  return result;
}

/**
 * Create a deep copy of a node tree
 * @param node The node to copy
 * @returns A deep copy of the node and its children
 */
export function cloneNodeTree(node: DependencyNode): DependencyNode {
  const clone = { ...node };
  
  if (hasChildren(node)) {
    clone.children = node.children!.map(child => {
      const childClone = cloneNodeTree(child);
      childClone.parent = clone;
      return childClone;
    });
  } else {
    clone.children = [];
  }
  
  return clone;
} 