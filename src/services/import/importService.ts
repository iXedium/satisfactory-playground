/**
 * ImportService
 * 
 * Responsible for handling import operations between dependency trees.
 * This service manages the relationships between different production chains.
 */

import { DependencyNode } from '../../types/core';
import { cloneTree, findNodeById } from '../calculation/dependencyTreeService';

/**
 * Import map entry defining a relationship between trees
 */
export interface ImportRelationship {
  /** The ID of the source tree */
  sourceTreeId: string;
  /** The ID of the target node (in the source tree) */
  sourceNodeId: string;
  /** The amount to import */
  amount: number;
}

/**
 * Map of import relationships
 */
export type ImportMap = Record<string, ImportRelationship>;

/**
 * Check if importing a node would create a circular dependency
 * 
 * @param trees - Record of dependency trees indexed by tree ID
 * @param targetTreeId - ID of the tree to import into
 * @param sourceTreeId - ID of the tree to import from
 * @returns True if importing would create a circular dependency
 */
export function wouldCreateCircularDependency(
  trees: Record<string, DependencyNode>,
  targetTreeId: string,
  sourceTreeId: string
): boolean {
  // If we're trying to import from the same tree, it's circular
  if (targetTreeId === sourceTreeId) {
    return true;
  }

  // Check if the source tree itself imports from the target tree
  const sourceTree = trees[sourceTreeId];
  if (!sourceTree) {
    return false;
  }

  // Function to check if any node in the tree is an import from the target tree
  const hasImportFromTarget = (node: DependencyNode): boolean => {
    if (node.isImport && node.importedFrom === targetTreeId) {
      return true;
    }

    // Check all children
    for (const child of node.children) {
      if (hasImportFromTarget(child)) {
        return true;
      }
    }

    return false;
  };

  return hasImportFromTarget(sourceTree);
}

/**
 * Create an import node in a tree
 * 
 * @param trees - Record of dependency trees indexed by tree ID
 * @param targetTreeId - ID of the tree to import into
 * @param targetNodeId - ID of the node to replace with an import
 * @param sourceTreeId - ID of the tree to import from
 * @param sourceNodeId - ID of the node to import from the source tree
 * @returns Updated map of trees with the import node
 */
export function createImportNode(
  trees: Record<string, DependencyNode>,
  targetTreeId: string,
  targetNodeId: string,
  sourceTreeId: string,
  sourceNodeId: string
): Record<string, DependencyNode> {
  // Clone the trees to avoid modifying the original
  const newTrees = { ...trees };
  
  // Check for circular dependency
  if (wouldCreateCircularDependency(trees, targetTreeId, sourceTreeId)) {
    console.error('Cannot create import: would create circular dependency');
    return trees;
  }

  // Find the target tree and node
  const targetTree = trees[targetTreeId];
  if (!targetTree) {
    console.error(`Target tree ${targetTreeId} not found`);
    return trees;
  }

  // Find the source node
  const sourceTree = trees[sourceTreeId];
  if (!sourceTree) {
    console.error(`Source tree ${sourceTreeId} not found`);
    return trees;
  }

  const sourceNode = findNodeById(sourceTree, sourceNodeId);
  if (!sourceNode) {
    console.error(`Source node ${sourceNodeId} not found in tree ${sourceTreeId}`);
    return trees;
  }

  // Function to replace the target node with an import node
  const replaceWithImport = (node: DependencyNode): DependencyNode => {
    if (node.uniqueId === targetNodeId) {
      // Create an import node
      return {
        ...node,
        isImport: true,
        importedFrom: sourceTreeId,
        children: [] // Import nodes don't have children
      };
    }

    // Process children recursively
    return {
      ...node,
      children: node.children.map(replaceWithImport)
    };
  };

  // Update the target tree
  newTrees[targetTreeId] = replaceWithImport(targetTree);
  
  return newTrees;
}

/**
 * Remove an import relationship
 * 
 * @param trees - Record of dependency trees indexed by tree ID
 * @param treeId - ID of the tree containing the import
 * @param nodeId - ID of the import node to remove
 * @returns Updated map of trees with the import removed
 */
export function removeImportNode(
  trees: Record<string, DependencyNode>,
  treeId: string,
  nodeId: string
): Record<string, DependencyNode> {
  // Clone the trees to avoid modifying the original
  const newTrees = { ...trees };
  
  // Find the tree
  const tree = trees[treeId];
  if (!tree) {
    console.error(`Tree ${treeId} not found`);
    return trees;
  }

  // Function to remove the import flag from a node
  const removeImport = (node: DependencyNode): DependencyNode => {
    if (node.uniqueId === nodeId) {
      // Remove the import flag
      const { isImport, importedFrom, ...rest } = node;
      return {
        ...rest,
        children: [] // Reset children
      };
    }

    // Process children recursively
    return {
      ...node,
      children: node.children.map(removeImport)
    };
  };

  // Update the tree
  newTrees[treeId] = removeImport(tree);
  
  return newTrees;
}

/**
 * Build an import map from a set of trees
 * 
 * @param trees - Record of dependency trees indexed by tree ID
 * @returns Map of import relationships
 */
export function buildImportMap(trees: Record<string, DependencyNode>): ImportMap {
  const importMap: ImportMap = {};

  // Process each tree
  Object.entries(trees).forEach(([treeId, tree]) => {
    // Function to find import nodes
    const findImportNodes = (node: DependencyNode): void => {
      if (node.isImport && node.importedFrom) {
        // Add to import map
        importMap[node.uniqueId] = {
          sourceTreeId: node.importedFrom,
          sourceNodeId: node.id, // Simplified; should be refined in a real implementation
          amount: node.amount
        };
      }

      // Process children recursively
      node.children.forEach(findImportNodes);
    };

    // Start with the root node
    findImportNodes(tree);
  });

  return importMap;
}

/**
 * Get all trees that import from a specific tree
 * 
 * @param trees - Record of dependency trees indexed by tree ID
 * @param sourceTreeId - ID of the source tree
 * @returns Array of tree IDs that import from the source tree
 */
export function getDependentTrees(
  trees: Record<string, DependencyNode>,
  sourceTreeId: string
): string[] {
  const dependentTrees: Set<string> = new Set();

  // Check each tree for imports from the source tree
  Object.entries(trees).forEach(([treeId, tree]) => {
    // Don't include the source tree itself
    if (treeId === sourceTreeId) {
      return;
    }

    // Function to check for imports
    const hasImportFromSource = (node: DependencyNode): boolean => {
      if (node.isImport && node.importedFrom === sourceTreeId) {
        return true;
      }

      // Check children
      for (const child of node.children) {
        if (hasImportFromSource(child)) {
          return true;
        }
      }

      return false;
    };

    // If the tree has imports from the source tree, add it to the set
    if (hasImportFromSource(tree)) {
      dependentTrees.add(treeId);
    }
  });

  return Array.from(dependentTrees);
} 