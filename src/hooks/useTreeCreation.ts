/**
 * useTreeCreation Hook
 * 
 * Custom hook for managing the creation of new dependency trees
 * and operations related to adding/modifying nodes.
 */

import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { DependencyNode } from '../types/core';
import { addTree, updateNodeInTree } from '../features/dependencySlice';
import { getItemById } from '../data/dbQueries';
import { calculateDependencyTree } from '../services/calculation/dependencyTreeService';

interface UseTreeCreationProps {
  onSuccess?: (treeId: string) => void;
}

interface UseTreeCreationResult {
  isCreating: boolean;
  error: string | null;
  createNewTree: (itemId: string, amount: number) => Promise<string>;
  updateNodeAmount: (treeId: string, nodeId: string, amount: number) => Promise<void>;
}

/**
 * Hook for creating new trees and modifying nodes
 */
export function useTreeCreation({
  onSuccess
}: UseTreeCreationProps = {}): UseTreeCreationResult {
  const dispatch = useDispatch();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new dependency tree
   */
  const createNewTree = useCallback(async (itemId: string, amount: number): Promise<string> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const item = getItemById(itemId);
      
      if (!item) {
        throw new Error(`Item with ID ${itemId} not found`);
      }
      
      const treeId = uuidv4();
      const tree = await calculateDependencyTree(itemId, amount);
      
      dispatch(addTree({
        treeId,
        tree
      }));
      
      if (onSuccess) {
        onSuccess(treeId);
      }
      
      return treeId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error creating tree';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [dispatch, onSuccess]);

  /**
   * Update the amount of a node in a tree
   */
  const updateNodeAmount = useCallback(async (
    treeId: string, 
    nodeId: string, 
    amount: number
  ): Promise<void> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const updatedNode: Partial<DependencyNode> = {
        amount,
        // Other properties that should be recalculated will be handled in the service
      };
      
      dispatch(updateNodeInTree({
        treeId,
        nodeId,
        updatedNode
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error updating node';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [dispatch]);

  return {
    isCreating,
    error,
    createNewTree,
    updateNodeAmount
  };
}

export default useTreeCreation; 