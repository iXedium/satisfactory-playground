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
  setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
  setMachineCountMap: Dispatch<SetStateAction<Record<string, number>>>;
  setMachineMultiplierMap: Dispatch<SetStateAction<Record<string, number>>>;
  setExpandedNodes: Dispatch<SetStateAction<Record<string, boolean>>>;
  setNodeExtensionOverrides: Dispatch<SetStateAction<Record<string, boolean>>>;
  // Note: Does not need dependencies or recipeSelections state, only dispatch and setters
}

export const usePlannerDataManagement = ({
  setExcessMap,
  setMachineCountMap,
  setMachineMultiplierMap,
  setExpandedNodes,
  setNodeExtensionOverrides,
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
    
    // Clear local storage items managed by the specific hooks
    localStorage.removeItem('savedDependencies'); // Managed by useFactoryPlanner
    localStorage.removeItem('savedRecipeSelections'); // Managed by useFactoryPlanner
    localStorage.removeItem('savedExcessMap'); // Managed by usePlannerNodeState
    localStorage.removeItem('savedMachineCountMap'); // Managed by usePlannerNodeState
    localStorage.removeItem('savedMachineMultiplierMap'); // Managed by usePlannerNodeState
    localStorage.removeItem('savedExpandedNodes'); // Managed by usePlannerNodeState
    localStorage.removeItem('savedNodeExtensionOverrides'); // Managed by usePlannerNodeState
    // Recent items and display options have their own localStorage logic in their hooks
    // We could potentially add clear functions to those hooks and call them here
    // For now, we only clear the items explicitly managed elsewhere or here.

    // Reset local state via setters passed in props
    setExcessMap({});
    setMachineCountMap({});
    setMachineMultiplierMap({});
    setExpandedNodes({});
    setNodeExtensionOverrides({});
    
    // Clear relevant Redux state
    dispatch(loadSavedState({ dependencyTrees: {}, accumulatedDependencies: {}, errors: [] }));
    dispatch(loadRecipeSelections({}));

    // Consider clearing recentItems state? Requires passing its setter
    // Consider clearing display options state? Requires passing its setters

  }, [dispatch, setExcessMap, setMachineCountMap, setMachineMultiplierMap, setExpandedNodes, setNodeExtensionOverrides]);

  return {
    handleDeleteTree,
    handleNodeUpdate,
    clearSavedData,
  };
}; 