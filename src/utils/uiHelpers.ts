/**
 * UI Helper Utilities
 * 
 * Utility functions for common UI operations and manipulations.
 */

import { DependencyNode, AccumulatedNode } from '../types/core';
import { hasChildren, getNodeChildren } from "./nodeHelpers";

/**
 * Generate a CSS color based on an ID string (consistent colors for same ID)
 * @param id The ID string to generate a color for
 * @returns A CSS color string (hex format)
 */
export function generateColorFromId(id: string): string {
  // Simple hash function to get a number from a string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Generate pastel colors (lighter colors that are pleasant to look at)
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 80%)`;
}

/**
 * Determines if a node's children should be visible based on expanded state
 * @param node The dependency node
 * @param expandedNodes Map of node IDs to expansion state
 * @returns Whether the children should be visible
 */
export function shouldShowChildren(
  node: DependencyNode,
  expandedNodes: Record<string, boolean>
): boolean {
  return hasChildren(node) && (expandedNodes[node.uniqueId] ?? true);
}

/**
 * Calculate the depth of a node in the tree
 * @param node The dependency node
 * @returns The depth of the node (0 for root)
 */
export function getNodeDepth(node: DependencyNode): number {
  let depth = 0;
  let current = node;
  
  while (current.parent) {
    depth++;
    current = current.parent;
  }
  
  return depth;
}

/**
 * Get a style object for indenting based on depth
 * @param depth The depth level
 * @param indentSize The size of each indent level in pixels
 * @returns A style object with padding-left set
 */
export function getIndentStyle(depth: number, indentSize: number = 20): React.CSSProperties {
  return {
    paddingLeft: `${depth * indentSize}px`,
  };
}

/**
 * Sort nodes by a specific property
 * @param nodes The array of nodes to sort
 * @param property The property to sort by
 * @param direction The sort direction ('asc' or 'desc')
 * @returns A new sorted array
 */
export function sortNodesByProperty<T extends { [key: string]: any }>(
  nodes: T[],
  property: keyof T,
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  return [...nodes].sort((a, b) => {
    if (a[property] < b[property]) return direction === 'asc' ? -1 : 1;
    if (a[property] > b[property]) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filter accumulated nodes by a search term
 * @param nodes The accumulated nodes array
 * @param searchTerm The search term
 * @returns Filtered array of nodes that match the search term
 */
export function filterNodesBySearch(nodes: AccumulatedNode[], searchTerm: string): AccumulatedNode[] {
  if (!searchTerm) return nodes;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return nodes.filter(node => {
    // Check if node matches search term
    return (
      // Match by item name
      node.item?.name?.toLowerCase().includes(lowerSearchTerm) ||
      // Match by item description
      node.item?.description?.toLowerCase().includes(lowerSearchTerm) ||
      // Match by primary node ID
      node.primaryNodeId?.toLowerCase().includes(lowerSearchTerm)
    );
  });
}

/**
 * Find if a node is part of a circular reference
 * @param node The dependency node to check
 * @returns True if node is part of a circular reference
 */
export function isCircularReference(node: DependencyNode): boolean {
  const visited = new Set<string>();
  
  function checkNode(current: DependencyNode): boolean {
    if (visited.has(current.uniqueId)) {
      return true;
    }
    
    visited.add(current.uniqueId);
    
    for (const child of getNodeChildren(current)) {
      if (checkNode(child)) {
        return true;
      }
    }
    
    visited.delete(current.uniqueId);
    return false;
  }
  
  return checkNode(node);
}

/**
 * Creates a path from root to the given node
 * @param node The target node
 * @returns Array of nodes from root to the target
 */
export function getPathToNode(node: DependencyNode): DependencyNode[] {
  const path: DependencyNode[] = [];
  let current: DependencyNode | null = node;
  
  while (current) {
    path.unshift(current);
    current = current.parent;
  }
  
  return path;
}

/**
 * Format a file size in bytes to a human-readable format
 * @param bytes The file size in bytes
 * @returns A human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get the path from a node to the root (inclusive)
 */
export function getTreePath(node: DependencyNode | null): DependencyNode[] {
  if (!node) return [];
  
  const path: DependencyNode[] = [node];
  let current: DependencyNode | null = node;
  
  while (current && current.parent) {
    path.unshift(current.parent);
    current = current.parent;
  }
  
  return path;
}

/**
 * Check if a node is a leaf node (no children)
 */
export function isLeafNode(node: DependencyNode): boolean {
  return !node.children || node.children.length === 0;
}

/**
 * Get the full path of a node in the tree (ascending)
 */
export function getNodePath(node: DependencyNode | null | undefined): string[] {
  if (!node) return [];
  
  const path: string[] = [];
  let current: DependencyNode | null | undefined = node;
  
  // Traverse up the tree collecting node IDs
  while (current) {
    path.unshift(current.uniqueId);
    current = current.parent;
  }
  
  return path;
} 