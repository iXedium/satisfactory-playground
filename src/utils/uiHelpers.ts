/**
 * UI Helper Utilities
 * 
 * Utility functions for common UI operations and manipulations.
 */

import { DependencyNode, AccumulatedNode } from '../types/core';

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
  return node.children.length > 0 && (expandedNodes[node.uniqueId] ?? true);
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
export function filterNodesBySearchTerm(
  nodes: AccumulatedNode[],
  searchTerm: string
): AccumulatedNode[] {
  if (!searchTerm.trim()) {
    return nodes;
  }
  
  const lowerSearchTerm = searchTerm.toLowerCase().trim();
  
  return nodes.filter((node) => {
    return (
      node.item.name.toLowerCase().includes(lowerSearchTerm) ||
      node.item.description?.toLowerCase().includes(lowerSearchTerm) ||
      node.primaryNodeId.toLowerCase().includes(lowerSearchTerm)
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
    
    for (const child of current.children) {
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