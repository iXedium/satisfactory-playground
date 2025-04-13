import { useCallback, Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { DependencyNode } from '../../../types';
import { 
  deleteTree, 
  updateNodeProperties, 
  loadSavedState, 
  loadRecipeSelections 
} from '../store';

interface PlannerDataManagementProps {
  // Remove individual setters
  // setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
  // ...
  // Add clearStorage functions from other hooks
  clearNodeStateStorage: () => void;
  clearItemSelectionStorage: () => void;
  clearDisplayOptionsStorage: () => void;
}

export const usePlannerDataManagement = ({
  // Remove individual setters from destructuring
  clearNodeStateStorage,
  clearItemSelectionStorage,
  clearDisplayOptionsStorage,
}: PlannerDataManagementProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleDeleteTree = useCallback((treeId: string) => {
    dispatch(deleteTree({ treeId }));
    // Consider if node state (excessMap, etc.) related to this treeId should be cleared here.
    // This would require iterating through the maps and is more complex.
  }, [dispatch]);

  const handleNodeUpdate = useCallback((nodeId: string, updatedNode: Partial<DependencyNode>) => {
    dispatch(updateNodeProperties({
      nodeId,
      updatedNode
    }));
  }, [dispatch]);

  const clearSavedData = useCallback(() => {
    if (!confirm('This will delete ALL saved trees and recipe selections. This cannot be undone. Are you sure?')) {
      return;
    }
    
    // Clear local storage items managed by Redux state persistence
    localStorage.removeItem('savedDependencies'); 
    localStorage.removeItem('savedRecipeSelections'); 
    
    // Call clearStorage functions from other hooks
    clearNodeStateStorage();
    clearItemSelectionStorage();
    clearDisplayOptionsStorage();

    // Reset local state via setters - NO LONGER NEEDED HERE
    // setExcessMap({});
    // ...
    
    // Clear relevant Redux state
    dispatch(loadSavedState({ dependencyTrees: {}, accumulatedDependencies: {}, errors: [] }));
    dispatch(loadRecipeSelections({}));

    console.log('[Data Management] All saved data cleared.');

  }, [dispatch, clearNodeStateStorage, clearItemSelectionStorage, clearDisplayOptionsStorage]); // Update dependencies

  return {
    handleDeleteTree,
    handleNodeUpdate,
    clearSavedData,
  };
}; 