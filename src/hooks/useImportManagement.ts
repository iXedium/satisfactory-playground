/**
 * useImportManagement Hook
 * 
 * Custom hook for managing imports between dependency trees.
 */

import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { DependencyNode, ImportRelationship } from '../types/core';
import { 
  createImportNode, 
  removeImportNode, 
  buildImportMap, 
  wouldCreateCircularDependency,
  getDependentTrees 
} from '../services/import/importService';
import { updateTree } from '../features/dependencySlice';

interface UseImportManagementProps {
  sourceTreeId?: string;
}

interface UseImportManagementResult {
  importMap: Record<string, ImportRelationship[]>;
  isLoading: boolean;
  error: string | null;
  createImport: (sourceTreeId: string, sourceNodeId: string, targetTreeId: string, amount: number) => Promise<void>;
  removeImport: (targetTreeId: string, targetNodeId: string) => Promise<void>;
  getImportsForTree: (treeId: string) => ImportRelationship[];
  getDependentTreeIds: (sourceTreeId: string) => string[];
  canCreateImport: (sourceTreeId: string, targetTreeId: string) => boolean;
}

/**
 * Hook for managing imports between trees
 */
export function useImportManagement({
  sourceTreeId
}: UseImportManagementProps = {}): UseImportManagementResult {
  const dispatch = useDispatch();
  const trees = useSelector((state: RootState) => state.dependencies.dependencyTrees);
  
  const [importMap, setImportMap] = useState<Record<string, ImportRelationship[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Initialize and update import map when trees change
   */
  useEffect(() => {
    try {
      const newImportMap = buildImportMap(trees);
      setImportMap(newImportMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error building import map');
    } finally {
      setIsLoading(false);
    }
  }, [trees]);
  
  /**
   * Create an import from source to target
   */
  const createImport = useCallback(async (
    sourceTreeId: string, 
    sourceNodeId: string,
    targetTreeId: string,
    amount: number
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (wouldCreateCircularDependency(trees, sourceTreeId, targetTreeId)) {
        throw new Error('Cannot create import: would create a circular dependency');
      }
      
      const sourceTree = trees[sourceTreeId];
      const targetTree = trees[targetTreeId];
      
      if (!sourceTree || !targetTree) {
        throw new Error('Source or target tree not found');
      }
      
      const updatedTargetTree = createImportNode(
        sourceTreeId,
        sourceNodeId,
        targetTree,
        amount
      );
      
      if (!updatedTargetTree) {
        throw new Error('Failed to create import node');
      }
      
      dispatch(updateTree({
        treeId: targetTreeId,
        tree: updatedTargetTree
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating import');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, trees]);
  
  /**
   * Remove an import from a tree
   */
  const removeImport = useCallback(async (
    targetTreeId: string,
    targetNodeId: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const targetTree = trees[targetTreeId];
      
      if (!targetTree) {
        throw new Error('Target tree not found');
      }
      
      const updatedTargetTree = removeImportNode(targetTree, targetNodeId);
      
      dispatch(updateTree({
        treeId: targetTreeId,
        tree: updatedTargetTree
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing import');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, trees]);
  
  /**
   * Get imports for a specific tree
   */
  const getImportsForTree = useCallback((treeId: string): ImportRelationship[] => {
    return importMap[treeId] || [];
  }, [importMap]);
  
  /**
   * Get tree IDs that depend on the source tree
   */
  const getDependentTreeIds = useCallback((sourceId: string): string[] => {
    const dependentTreesMap = getDependentTrees(trees, sourceId);
    return Object.keys(dependentTreesMap);
  }, [trees]);
  
  /**
   * Check if creating an import would create a circular dependency
   */
  const canCreateImport = useCallback((sourceId: string, targetId: string): boolean => {
    return !wouldCreateCircularDependency(trees, sourceId, targetId);
  }, [trees]);
  
  return {
    importMap,
    isLoading,
    error,
    createImport,
    removeImport,
    getImportsForTree,
    getDependentTreeIds,
    canCreateImport
  };
}

export default useImportManagement; 