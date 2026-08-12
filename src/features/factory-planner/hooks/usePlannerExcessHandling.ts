/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { PlannerAppDispatch } from '../../../store/plannerStore';
import { DependencyNode } from '../../../types';
import { 
    updateTreeProduction, 
    checkAndConvertNodeTypeThunk, 
    beginHistoryTransaction,
    commitHistoryTransaction
} from '../store';
import { findNodeById } from '../../../utils';

// Define the expected shape of the dependencies state slice locally
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
  const dispatch = useDispatch<PlannerAppDispatch>();

  const handleExcessChange = useCallback(async (nodeId: string, excess: number) => {
    // Start transaction for the entire excess change operation
    dispatch(beginHistoryTransaction(`Set excess to ${excess}`) as unknown as Parameters<typeof dispatch>[0]);
    
    try {
      // Update local map immediately
      setExcessMap(prevMap => ({ ...prevMap, [nodeId]: excess }));
      
      // Determine the treeId and rootNode's uniqueId
      if (dependencies.dependencyTrees[nodeId]) { 
        const tree = dependencies.dependencyTrees[nodeId];
        setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess })); 
        // AWAIT the thunk to ensure all cascading updates complete before transaction commits
        await dispatch(updateTreeProduction(tree.uniqueId, nodeId, 'excess', excess));
      } else {
        let foundTreeId = '';
        for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
          const node = findNodeById(tree, nodeId);
          if (node) {
            foundTreeId = treeId;
            break;
          }
        }
        if (!foundTreeId) {
          dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
          return;
        }
        // AWAIT the thunk to ensure all cascading updates complete before transaction commits
        await dispatch(updateTreeProduction(nodeId, foundTreeId, 'excess', excess));
      }

      // Commit transaction AFTER all cascading updates are complete
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
      
      // --- Trigger Node Type Conversion Check (OUTSIDE transaction - these are follow-up effects) --- 
      setTimeout(async () => {
          const stateBeforeChecks = { ...dependencies.dependencyTrees };
          const rootIdsToCheck = Object.keys(stateBeforeChecks).filter(id => stateBeforeChecks[id].isRoot);

          const checkPromises = rootIdsToCheck.map(rootId => 
              dispatch(checkAndConvertNodeTypeThunk(rootId))
          );

          await Promise.allSettled(checkPromises);
      }, 10);
      
    } catch (error) {
      // On error, still commit to avoid leaving transaction open
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
      throw error;
    }
  }, [dependencies, dispatch, setExcessMap]);

  return {
    handleExcessChange,
  };
}; 