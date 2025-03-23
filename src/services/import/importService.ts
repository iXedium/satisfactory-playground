/**
 * ImportService
 * 
 * Responsible for handling import operations between dependency trees.
 * This service manages the relationships between different production chains.
 */

import { DependencyNode } from '../../types/core';
import { cloneTree, findNodeById } from '../calculation/dependencyTreeService';
import { v4 as uuidv4 } from 'uuid';
import { getNodeChildren, forEachNodeChild, mapNodeChildren, hasChildren } from '../../utils/nodeHelpers';

/**
 * Import map entry defining a relationship between trees
 */
export interface ImportRelationship {
  /** The ID of the source tree */
  sourceTreeId: string;
  /** The ID of the target tree */
  targetTreeId: string;
  /** The ID of the source node (in the source tree) */
  sourceNodeId: string;
  /** The ID of the target node (in the target tree) */
  targetNodeId: string;
  /** The amount to import */
  amount: number;
}

/**
 * Map of import relationships
 */
export type ImportMap = Record<string, ImportRelationship>;

/**
 * Check if creating an import relationship would create a circular dependency
 */
export function wouldCreateCircularDependency(
  trees: Record<string, DependencyNode>,
  targetTreeId: string,
  sourceTreeId: string
): boolean {
  // If trying to import from itself, that's circular
  if (targetTreeId === sourceTreeId) {
    return true;
  }
  
  // Check if the source tree already imports from the target tree
  const sourceTree = trees[sourceTreeId];
  if (!sourceTree) {
    return false;
  }
  
  // Look for imports from the target tree in the source tree
  const hasImportFromTarget = (node: DependencyNode): boolean => {
    if (node.isImport && node.importedFrom === targetTreeId) {
      return true;
    }
    
    if (!hasChildren(node)) {
      return false;
    }
    
    return getNodeChildren(node).some(hasImportFromTarget);
  };
  
  return hasImportFromTarget(sourceTree);
}

/**
 * Create an import node in the target tree, importing from the source tree
 */
export function createImportNode(
  trees: Record<string, DependencyNode>,
  targetTreeId: string,
  targetNodeId: string,
  sourceTreeId: string,
  sourceNodeId: string,
  amount: number
): Record<string, DependencyNode> {
  const updatedTrees = { ...trees };
  
  // Get the source node
  const sourceTree = trees[sourceTreeId];
  const sourceNode = findNodeById(sourceTree, sourceNodeId);
  
  if (!sourceNode) {
    return trees; // Source node not found, return original trees
  }
  
  // Create a deep copy of the trees
  const newTrees = JSON.parse(JSON.stringify(trees));
  
  // Find the target tree and node
  const targetTree = newTrees[targetTreeId];
  
  if (!targetTree) {
    return trees; // Target tree not found, return original trees
  }
  
  // Create a function to replace the target node with an import node
  const replaceWithImport = (node: DependencyNode): DependencyNode => {
    if (node.uniqueId === targetNodeId) {
      // Create an import node
      return {
        ...node,
        isImport: true,
        importedFrom: sourceTreeId,
        importSourceNodeId: sourceNodeId,
        amount: amount || node.amount, // Use provided amount or keep existing
        children: [], // Import nodes don't have children
      };
    }
    
    // Process children recursively
    if (hasChildren(node)) {
      return {
        ...node,
        children: mapNodeChildren(node, replaceWithImport),
      };
    }
    
    return node;
  };
  
  // Update the target tree
  newTrees[targetTreeId] = replaceWithImport(targetTree);
  
  return newTrees;
}

/**
 * Find a node in a tree by its unique ID
 */
function findNodeById(tree: DependencyNode, nodeId: string): DependencyNode | null {
  if (tree.uniqueId === nodeId) {
    return tree;
  }
  
  if (!hasChildren(tree)) {
    return null;
  }
  
  for (const child of getNodeChildren(tree)) {
    const found = findNodeById(child, nodeId);
    if (found) {
      return found;
    }
  }
  
  return null;
}

/**
 * Remove an import node and restore its original children
 */
export function removeImportNode(
  trees: Record<string, DependencyNode>,
  treeId: string,
  nodeId: string
): Record<string, DependencyNode> {
  const tree = trees[treeId];
  if (!tree) {
    return trees;
  }
  
  // Function to recursively find and remove the import
  const removeImport = (node: DependencyNode): DependencyNode => {
    if (node.uniqueId === nodeId) {
      // If this is the import node to remove
      if (node.isImport) {
        return {
          ...node,
          isImport: false,
          importedFrom: undefined,
          importSourceNodeId: undefined,
          // Restore original children if they were saved
          children: node.originalChildren || [],
        };
      }
      return node;
    }
    
    // Process children recursively
    if (hasChildren(node)) {
      return {
        ...node,
        children: mapNodeChildren(node, removeImport),
      };
    }
    
    return node;
  };
  
  // Create a new trees object with the updated tree
  return {
    ...trees,
    [treeId]: removeImport(tree),
  };
}

/**
 * Build a map of all import relationships in the dependency trees
 */
export function buildImportMap(trees: Record<string, DependencyNode>): ImportMap {
  const importMap: ImportMap = {};
  
  // Process each tree
  Object.entries(trees).forEach(([treeId, tree]) => {
    // Function to find all import nodes
    const findImportNodes = (node: DependencyNode): void => {
      if (node.isImport && node.importedFrom && node.importSourceNodeId) {
        // Found an import node, add to the map
        const importId = `${treeId}-${node.uniqueId}`;
        importMap[importId] = {
          sourceTreeId: node.importedFrom,
          targetTreeId: treeId,
          sourceNodeId: node.importSourceNodeId,
          targetNodeId: node.uniqueId,
          amount: node.amount,
        };
      }
      
      // Process children
      if (hasChildren(node)) {
        getNodeChildren(node).forEach(findImportNodes);
      }
    };
    
    findImportNodes(tree);
  });
  
  return importMap;
}

/**
 * Get a list of all tree IDs that depend on the given source tree
 */
export function getDependentTrees(
  trees: Record<string, DependencyNode>,
  sourceTreeId: string
): string[] {
  const dependentTreeIds: string[] = [];
  
  // Check each tree to see if it depends on the source tree
  Object.entries(trees).forEach(([treeId, tree]) => {
    if (treeId === sourceTreeId) return; // Skip the source tree itself
    
    // Function to check if a node imports from the source tree
    const hasImportFromSource = (node: DependencyNode): boolean => {
      if (node.isImport && node.importedFrom === sourceTreeId) {
        return true;
      }
      
      if (!hasChildren(node)) {
        return false;
      }
      
      return getNodeChildren(node).some(hasImportFromSource);
    };
    
    // If this tree has any imports from the source tree, add it to the list
    if (hasImportFromSource(tree)) {
      dependentTreeIds.push(treeId);
    }
  });
  
  return dependentTreeIds;
}

/**
 * Find all import nodes in a dependency tree
 */
export function findAllImportNodes(node: DependencyNode): DependencyNode[] {
  const importNodes: DependencyNode[] = [];
  
  const findImportNodes = (node: DependencyNode) => {
    if (node.isImport) {
      importNodes.push(node);
    }
    
    if (hasChildren(node)) {
      getNodeChildren(node).forEach(findImportNodes);
    }
  };
  
  findImportNodes(node);
  return importNodes;
}

/**
 * Replace a node in a tree with an import node
 */
export function replaceNodeWithImport(
  node: DependencyNode,
  nodePath: string[],
  importedNode: DependencyNode,
  index: number = 0
): DependencyNode {
  // Base case: we've reached the target node
  if (index === nodePath.length - 1 && node.uniqueId === nodePath[index]) {
    return {
      ...node,
      isImport: true,
      importedFrom: importedNode.importedFrom,
      importSourceNodeId: importedNode.uniqueId,
      // Save the original children so they can be restored later
      originalChildren: node.children,
      children: [],
    };
  }
  
  // If this isn't the target node but we're on the path to it
  if (node.uniqueId === nodePath[index] && hasChildren(node)) {
    return {
      ...node,
      children: mapNodeChildren(node, (child) => 
        replaceNodeWithImport(child, nodePath, importedNode, index + 1)
      ),
    };
  }
  
  // Not on the path, return the node unchanged
  return node;
} 