/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, Dispatch, SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { useTabDispatch } from '../../workspace/context/TabDispatchContext';
import { AppDispatch, RootState } from '../../../store';
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
  const { tabDispatch: dispatch } = useTabDispatch();
  const tabId = useSelector((s: RootState) => s.workspace.activeTabId) || 'default';

  const handleExcessChange = useCallback(async (nodeId: string, excess: number) => {
    // Update local map immediately
    setExcessMap(prevMap => ({ ...prevMap, [nodeId]: excess }));

    // Step 1: Run the full cascading update with NO open transaction.
    // All child updateForcedProduction dispatches reach the store unblocked.
    if (dependencies.dependencyTrees[nodeId]) { 
      const tree = dependencies.dependencyTrees[nodeId];
      setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess })); 
      await dispatch(updateTreeProduction(tree.uniqueId, nodeId, 'excess', excess, undefined, tabId));
    } else {
      let foundTreeId = '';
      for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
        const node = findNodeById(tree, nodeId);
        if (node) {
          foundTreeId = treeId;
          break;
        }
      }
      if (!foundTreeId) return;
      await dispatch(updateTreeProduction(nodeId, foundTreeId, 'excess', excess, undefined, tabId));
    }

    // Step 2: The cascade has fully settled. Capture a snapshot of the
    // post-cascade state for the undo stack. Undoing this snapshot reverts
    // to the previous undo entry (pre-cascade state).
    dispatch(beginHistoryTransaction(`Set excess to ${excess}`) as unknown as Parameters<typeof dispatch>[0]);
    dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);

    // Step 3: Trigger node type conversion checks (unchanged)
    const stateAfterChecks = { ...dependencies.dependencyTrees };
    const rootIdsToCheck = Object.keys(stateAfterChecks).filter(id => stateAfterChecks[id].isRoot);
    await Promise.allSettled(
      rootIdsToCheck.map(rootId => 
        dispatch(checkAndConvertNodeTypeThunk({ rootNodeId: rootId, tabId }))
      )
    );
  }, [dependencies, dispatch, setExcessMap, tabId]);

  return {
    handleExcessChange,
  };
}; 
