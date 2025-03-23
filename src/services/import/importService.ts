/**
 * ImportService
 * 
 * Responsible for handling import operations between dependency trees.
 * This service manages the relationships between different production chains.
 */

import { DependencyNode } from '../../types/core';
import { cloneTree } from '../calculation/dependencyTreeService';
import { v4 as uuidv4 } from 'uuid';
import { getNodeChildren, forEachNodeChild, mapNodeChildren, hasChildren, findNodeInTree } from '../../utils/nodeHelpers';

// Extended DependencyNode type with import-specific properties
export interface ImportDependencyNode extends DependencyNode {
  importSourceNodeId?: string;
}

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
 * Map of node IDs to import relationships
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
  amount: number = 0
): Record<string, DependencyNode> | null {
  // Get the source and target trees
  const targetTree = trees[targetTreeId];
  const sourceTree = trees[sourceTreeId];
  
  if (!targetTree || !sourceTree) {
    console.error("Source or target tree not found");
    return null;
  }
  
  // Get the source node
  const sourceNode = findNodeInTreeById(sourceTree, sourceNodeId);
  
  if (!sourceNode) {
    console.error("Source node not found");
    return null;
  }
  
  // Get the target node
  const targetNode = findNodeInTreeById(targetTree, targetNodeId);
  
  if (!targetNode) {
    console.error("Target node not found");
    return null;
  }
  
  console.log("Creating import from", sourceNode, "to", targetNode);
  
  // Create a new tree structure, preserving the path to the target node
  const nodePath = getPathToTargetNode(targetTree, targetNodeId);
  
  if (!nodePath.length) {
    console.error("Could not find path to target node");
    return null;
  }
  
  // Create a new trees object with the updated target tree
  const newTrees = { ...trees };
  
  // Replace the target node with an import node
  newTrees[targetTreeId] = replaceNodeWithImport(
    targetTree,
    nodePath.map(node => node.uniqueId),
    {
      ...sourceNode,
      amount: amount || sourceNode.amount,
      importedFrom: sourceTreeId,
      importSourceNodeId: sourceNodeId,
    } as ImportDependencyNode
  );
  
  return newTrees;
}

/**
 * Find a node by ID in a tree
 */
function findNodeInTreeById(tree: DependencyNode, nodeId: string): DependencyNode | null {
  return findNodeInTree(tree, nodeId) || null;
}

/**
 * Remove an import node and restore its original children
 */
export function removeImportNode(node: ImportDependencyNode): ImportDependencyNode {
  // If this is an import node, remove the import flags and reference
  if (node.isImport) {
    return {
      ...node,
      isImport: false,
      importedFrom: undefined,
      importSourceNodeId: undefined
    };
  }
  
  // If this is not an import node but has children, process children
  if (node.children && node.children.length > 0) {
    return {
      ...node,
      children: node.children.map(child => 
        removeImportNode(child as ImportDependencyNode)
      )
    };
  }
  
  // Otherwise return unchanged node
  return node;
}

/**
 * Build a map of all import relationships in the dependency trees
 */
export function buildImportMap(trees: Record<string, DependencyNode>): ImportMap {
  const importMap: ImportMap = {};
  
  // Iterate through all trees to find import nodes
  Object.entries(trees).forEach(([treeId, tree]) => {
    const findImportNodes = (node: ImportDependencyNode): void => {
      if (node.isImport && node.importedFrom && node.importSourceNodeId) {
        importMap[node.uniqueId] = {
          sourceTreeId: node.importedFrom,
          targetTreeId: treeId,
          sourceNodeId: node.importSourceNodeId,
          targetNodeId: node.uniqueId,
          amount: node.amount
        };
      }
      
      // Process children
      forEachNodeChild(node, (child) => findImportNodes(child as ImportDependencyNode));
    };
    
    findImportNodes(tree as ImportDependencyNode);
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
  importedNode: ImportDependencyNode,
  index: number = 0
): DependencyNode {
  // Base case: we've processed all elements in the path
  if (index >= nodePath.length) {
    return node;
  }
  
  // Current element in the path
  const currentId = nodePath[index];
  
  // If this is the target node, replace with import node
  if (node.uniqueId === currentId && index === nodePath.length - 1) {
    return {
      ...node,
      isImport: true,
      importedFrom: importedNode.importedFrom,
      importSourceNodeId: importedNode.uniqueId,
      children: []
    } as ImportDependencyNode;
  }
  
  // Otherwise, clone the node and continue processing children
  const clonedNode = { ...node };
  
  if (hasChildren(node)) {
    clonedNode.children = node.children!.map(child => {
      if (child.uniqueId === currentId) {
        return replaceNodeWithImport(child, nodePath, importedNode, index + 1);
      }
      return child;
    });
  }
  
  return clonedNode;
}

/**
 * Find the path from root to target node
 */
function getPathToTargetNode(tree: DependencyNode, targetNodeId: string): DependencyNode[] {
  const path: DependencyNode[] = [];
  
  function findPath(node: DependencyNode): boolean {
    path.push(node);
    
    if (node.uniqueId === targetNodeId) {
      return true;
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (findPath(child)) {
          return true;
        }
      }
    }
    
    path.pop();
    return false;
  }
  
  findPath(tree);
  return path;
} 