/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, Dispatch, SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { useTabDispatch } from '../../workspace/context/TabDispatchContext';
import { AppDispatch, RootState } from '../../../store';
import { DependencyNode } from '../../../types';
import { 
    cascadeExcessUpdate, 
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

  const handleExcessChange = useCallback((nodeId: string, excess: number) => {
    // Update local map immediately
    setExcessMap(prevMap => ({ ...prevMap, [nodeId]: excess }));

    // Determine the treeId
    let treeId = nodeId;
    if (!dependencies.dependencyTrees[nodeId]) {
      let found = '';
      for (const [tId, tree] of Object.entries(dependencies.dependencyTrees)) {
        if (findNodeById(tree, nodeId)) { found = tId; break; }
      }
      if (!found) return;
      treeId = found;
    } else {
      const tree = dependencies.dependencyTrees[nodeId];
      setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess }));
      treeId = tree.uniqueId;
    }

    // Synchronous cascade: begin → cascadeExcessUpdate → commit
    dispatch(beginHistoryTransaction(`Set excess to ${excess}`, tabId) as unknown as Parameters<typeof dispatch>[0]);
    dispatch(cascadeExcessUpdate({ nodeId, treeId, excess }) as unknown as Parameters<typeof dispatch>[0]);
    dispatch(commitHistoryTransaction(tabId) as unknown as Parameters<typeof dispatch>[0]);

    // Trigger node type conversion checks (async, after commit)
    const stateAfterChecks = { ...dependencies.dependencyTrees };
    const rootIdsToCheck = Object.keys(stateAfterChecks).filter(id => stateAfterChecks[id].isRoot);
    Promise.allSettled(
      rootIdsToCheck.map(rootId => 
        dispatch(checkAndConvertNodeTypeThunk({ rootNodeId: rootId, tabId }))
      )
    );
  }, [dependencies, dispatch, setExcessMap, tabId]);

  return {
    handleExcessChange,
  };
}; 
