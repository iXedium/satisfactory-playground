/**
 * useTreeOperations Hook
 * 
 * Custom hook for managing tree-related operations like expansion, deletion, etc.
 * Provides a consistent interface for components to perform tree operations.
 */

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { DependencyNode } from '../types/core';
import { deleteTree } from '../features/dependencySlice';
import { toggleNodeExpanded } from '../features/uiSlice';
import { getNodeChildren, findNodeInTree } from '../utils/nodeHelpers';

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
  const dispatch = useDispatch<AppDispatch>();
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
  const toggleNodeExpansion = useCallback((nodeId: string): void => {
    dispatch(toggleNodeExpanded(nodeId));
  }, [dispatch]);
  
  /**
   * Delete a tree by its ID
   */
  const deleteTreeById = useCallback((id: string) => {
    dispatch(deleteTree({ treeId: id }));
  }, [dispatch]);
  
  /**
   * Find a node by its ID in all trees or in a specific tree
   */
  const findNodeById = useCallback((nodeId: string): DependencyNode | null => {
    // If a specific tree is provided, only search in that tree
    if (treeId && trees[treeId]) {
      return findNodeInTree(trees[treeId], nodeId) || null;
    }
    
    // Otherwise, search in all trees
    for (const tree of Object.values(trees)) {
      const found = findNodeInTree(tree, nodeId);
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
    toggleNodeExpanded: toggleNodeExpansion,
    deleteTreeById,
    findNodeById
  };
}

export default useTreeOperations; 