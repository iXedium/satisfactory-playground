import { DependencyNode } from "../types/core";

/**
 * Safely get node children as an array
 */
export function getNodeChildren(node: DependencyNode): DependencyNode[] {
  return node.children || [];
}

/**
 * Check if a node has children
 */
export function hasChildren(node: DependencyNode): boolean {
  return !!node.children && node.children.length > 0;
}

/**
 * Safely map over node children
 */
export function mapNodeChildren<T>(
  node: DependencyNode, 
  mapFn: (child: DependencyNode) => T
): T[] {
  return getNodeChildren(node).map(mapFn);
}

/**
 * Safely iterate over node children
 */
export function forEachNodeChild(
  node: DependencyNode,
  callback: (child: DependencyNode) => void
): void {
  getNodeChildren(node).forEach(callback);
} 