/**
 * useTreeOperations Hook
 * 
 * Custom hook for managing tree-related operations like expansion, deletion, etc.
 * Provides a consistent interface for components to perform tree operations.
 */

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { DependencyNode } from '../types/core';
import { deleteTree } from '../features/dependencySlice';

interface UseTreeOperationsProps {
  treeId?: string;
}

interface UseTreeOperationsResult {
  expandedNodes: Record<string, boolean>;
  trees: Record<string, DependencyNode>;
  isNodeExpanded: (nodeId: string) => boolean;
  toggleNodeExpanded: (nodeId: string) => void;
  deleteTreeById: (treeId: string) => void;
  findNodeById: (nodeId: string) => DependencyNode | null;
}

/**
 * Hook for managing tree operations
 */
export function useTreeOperations({
  treeId
}: UseTreeOperationsProps = {}): UseTreeOperationsResult {
  const dispatch = useDispatch();
  const expandedNodes = useSelector((state: RootState) => state.ui.expandedNodes);
  const trees = useSelector((state: RootState) => state.dependencies.dependencyTrees);
  
  /**
   * Check if a node is expanded
   */
  const isNodeExpanded = useCallback((nodeId: string): boolean => {
    return expandedNodes[nodeId] ?? true; // Default to expanded
  }, [expandedNodes]);
  
  /**
   * Toggle the expanded state of a node
   */
  const toggleNodeExpanded = useCallback((nodeId: string): void => {
    // This will be implemented when we update the UI slice
    // For now, it's just a placeholder
    console.log(`Toggle expanded state for node ${nodeId}`);
  }, []);
  
  /**
   * Delete a tree by ID
   */
  const deleteTreeById = useCallback((id: string): void => {
    dispatch(deleteTree(id));
  }, [dispatch]);
  
  /**
   * Find a node by its ID in all trees or in a specific tree
   */
  const findNodeById = useCallback((nodeId: string): DependencyNode | null => {
    // Helper function to search within a tree
    const searchInTree = (tree: DependencyNode, id: string): DependencyNode | null => {
      if (tree.uniqueId === id) {
        return tree;
      }
      
      for (const child of tree.children) {
        const found = searchInTree(child, id);
        if (found) {
          return found;
        }
      }
      
      return null;
    };
    
    // If treeId is provided, only search in that tree
    if (treeId && trees[treeId]) {
      return searchInTree(trees[treeId], nodeId);
    }
    
    // Otherwise, search in all trees
    for (const tree of Object.values(trees)) {
      const found = searchInTree(tree, nodeId);
      if (found) {
        return found;
      }
    }
    
    return null;
  }, [trees, treeId]);
  
  return {
    expandedNodes,
    trees,
    isNodeExpanded,
    toggleNodeExpanded,
    deleteTreeById,
    findNodeById
  };
}

export default useTreeOperations; 