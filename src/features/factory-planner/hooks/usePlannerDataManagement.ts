/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { destroyNodeRecursiveThunk } from '../store/importExportLogic';

interface PlannerDataManagementProps {
  // Remove individual setters
  // setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
  // ...
  // Add clearStorage functions from other hooks
  clearNodeStateStorage: () => void;
  clearItemSelectionStorage: () => void;
  clearDisplayOptionsStorage: () => void;
  // Add setters needed for resetting sort state (or handle in useFactoryPlanner)
  // setTreeSortKey: React.Dispatch<React.SetStateAction<any>>;
  // setTreeSortDirection: React.Dispatch<React.SetStateAction<any>>;
}

export const usePlannerDataManagement = ({
  // Remove individual setters from destructuring
  clearNodeStateStorage,
  clearItemSelectionStorage,
  clearDisplayOptionsStorage,
  // Destructure setters if added above
}: PlannerDataManagementProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleDeleteTree = useCallback(async (treeId: string) => {
    await dispatch(destroyNodeRecursiveThunk(treeId));
  }, [dispatch]);

  const handleNodeUpdate = useCallback((nodeId: string, updatedNode: Partial<DependencyNode>) => {
    dispatch(updateNodeProperties({
      nodeId,
      updatedNode
    }));
  }, [dispatch]);

  const clearSavedData = useCallback(() => {
    if (!window.confirm(
      'Are you sure you want to clear all current planner data?\n' +
      '- All trees will be removed.\n' +
      '- This includes the auto-saved session.\n' +
      '- Named setups saved via Save/Load are NOT affected.\n\n' +
      'This action cannot be undone.'
    )) {
      return;
    }
    
    console.log("[Clear Data] Clearing planner data...");

    // 1. Clear Redux State (by loading empty state)
    console.log("[Clear Data] Clearing Redux state...");
    dispatch(loadSavedState({ dependencyTrees: {}, accumulatedDependencies: {}, errors: [], lastUpdateTime: 0 }));
    dispatch(loadRecipeSelections({}));

    // 2. Clear Local React State (by calling imported clear functions)
    console.log("[Clear Data] Clearing local hook states...");
    clearNodeStateStorage();
    clearItemSelectionStorage(); // Now including item selection (recent items etc)
    clearDisplayOptionsStorage();
    // TODO: Reset sorting state (needs setters passed in or handled elsewhere)
    // setTreeSortKey('originalDepth');
    // setTreeSortDirection('asc');

    // 3. Clear Auto-Saved Last Session Data from localStorage
    console.log("[Clear Data] Removing lastSession keys from localStorage...");
    try {
      // Get all keys from localStorage
      const allKeys = Object.keys(localStorage);
      // Filter for keys starting with 'lastSession_'
      const lastSessionKeys = allKeys.filter(key => key.startsWith('lastSession_'));
      // Remove each key
      lastSessionKeys.forEach(key => {
        console.log(`[Clear Data] Removing key: ${key}`);
        localStorage.removeItem(key);
      });
    } catch (e) {
        console.error("[Clear Data] Error removing lastSession keys:", e);
    }
    
    // 4. Optionally clear the active setup pointer (but not the named setups themselves)
    // localStorage.removeItem('plannerLastActiveSetupName');
    // This might be confusing - let's leave it for now. User can load a setup if needed.

  }, [dispatch, clearNodeStateStorage, clearItemSelectionStorage, clearDisplayOptionsStorage]);

  return {
    handleDeleteTree,
    handleNodeUpdate,
    clearSavedData,
  };
}; 