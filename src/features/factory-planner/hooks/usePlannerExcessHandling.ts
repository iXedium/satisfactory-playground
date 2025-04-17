/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { DependencyNode } from '../../../types';
import { updateTreeProduction, checkAndConvertNodeTypeThunk } from '../store';
import { findNodeById } from '../../../utils';

// Define the expected shape of the dependencies state slice locally
// Matching the one used in usePlannerNodeInteractions
interface DependencySliceStateForExcess {
  dependencyTrees: Record<string, DependencyNode>;
}

interface PlannerExcessHandlingProps {
  dependencies: DependencySliceStateForExcess;
  setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
}

export const usePlannerExcessHandling = ({
  dependencies,
  setExcessMap,
}: PlannerExcessHandlingProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleExcessChange = useCallback(async (nodeId: string, excess: number) => {
    // Update local map immediately
    setExcessMap(prevMap => ({ ...prevMap, [nodeId]: excess }));
    
    let treeIdToUpdate = null;
    let rootNodeUniqueId = null; // Store the uniqueId of the root

    // Determine the treeId and rootNode's uniqueId
    if (dependencies.dependencyTrees[nodeId]) { 
      const tree = dependencies.dependencyTrees[nodeId];
      treeIdToUpdate = nodeId;
      rootNodeUniqueId = tree.uniqueId;
      setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess })); 
      dispatch(updateTreeProduction(tree.uniqueId, nodeId, 'excess', excess));
    } else {
      let foundTreeId = '';
      for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
        const node = findNodeById(tree, nodeId);
        if (node) {
          foundTreeId = treeId;
          treeIdToUpdate = treeId; 
          rootNodeUniqueId = tree.uniqueId;
          break;
        }
      }
      if (!foundTreeId) return;
      dispatch(updateTreeProduction(nodeId, foundTreeId, 'excess', excess));
    }

    // --- Trigger Node Type Conversion Check for ALL roots --- 
    // Use setTimeout to check after the state has likely updated
    setTimeout(() => {
        console.log(`[handleExcessChange] Triggering node type check for ALL roots after update related to node ${nodeId}`);
        const currentState = dependencies; // Use the state captured by the hook closure
        Object.values(currentState.dependencyTrees).forEach(tree => {
            if (tree.isRoot) { // Only check root nodes
                // console.log(`[handleExcessChange] Checking root: ${tree.uniqueId}`);
                dispatch(checkAndConvertNodeTypeThunk(tree.uniqueId));
            }
        });
    }, 10); // Small delay
    // ------------------------------------------------------

  }, [dependencies.dependencyTrees, dispatch, setExcessMap]);

  return {
    handleExcessChange,
  };
}; 