import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTabDispatch } from '../../workspace/context/TabDispatchContext';
import { AppDispatch, RootState } from '../../../store';
import { logger } from '../../../utils/logger';
import { DependencyNode } from '../../../types';
import { DependencyState } from '../store/dependencySlice';
import { 
  importNodeAction, 
  checkAndConvertNodeTypeThunk,
  autoImportNodeChildrenThunk,
  recalculateAndUpdateRootAmountThunk,
  unimportNodeThunk,
  setImportAmountThunk,
  resetImportAmountThunk,
  maxImportAmountThunk,
} from '../store';
import { findNodeById } from '../../../utils';
import { hasImportReference, getImportReference } from '../../../utils/nodeReferenceUtils';
import { 
  beginHistoryTransaction, 
  commitHistoryTransaction 
} from '../store/historyMiddleware';

interface PlannerImportExportProps {
  dependencies: DependencyState;
  handleCreateNewTree: (
    itemId: string, 
    amount: number, 
    treeId?: string, 
    recipeId?: string | null,
    isAutoImportRoot?: boolean
  ) => Promise<void>; // Assuming async based on usage
}

export const usePlannerImportExport = ({
  dependencies,
  handleCreateNewTree,
}: PlannerImportExportProps) => {
  const { tabDispatch: dispatch } = useTabDispatch();
  const tabId = useSelector((s: RootState) => s.workspace.activeTabId) || 'default';

  // Original handleImportNode logic (now internal)
  const handleImportNodeInternal = useCallback(async ( 
    sourceNode: DependencyNode, 
    targetTreeId: string, 
    sourceTreeId: string
  ) => {
    if (!sourceNode || !targetTreeId || !sourceTreeId) {
      logger.error('[IMPORT ERROR] Missing required parameters for import', { sourceNode, targetTreeId, sourceTreeId });
      return;
    }
    
    
    dispatch(importNodeAction({
      nodeId: sourceNode.uniqueId,
      sourceTreeId,
      targetTreeId,
      shouldImport: true
    }));

    await dispatch(recalculateAndUpdateRootAmountThunk({
      tabId,
      rootNodeId: targetTreeId,
      externalDemandChange: undefined,
    }));
    await dispatch(autoImportNodeChildrenThunk({ parentNodeId: targetTreeId, tabId }));
  }, [dispatch, tabId]);

  // Original importNodeForTree logic (now internal)
  const importNodeForTreeInternal = useCallback(async (nodeId: string) => {
    let foundNode: DependencyNode | null = null;
    let foundTreeId = "";
    
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      const node = findNodeById(tree as DependencyNode, nodeId);
      if (node) {
        foundNode = node;
        foundTreeId = treeId;
        break;
      }
    }
    
    if (!foundNode || !foundTreeId) {
      logger.error("Could not find node to import");
      return;
    }
    
    
    let targetTreeId = "";
    for (const [treeId, treeEntry] of Object.entries(dependencies.dependencyTrees)) {
      const tree = treeEntry as DependencyNode;
      if (treeId !== foundTreeId && tree.id === foundNode.id && !tree.isImport && !hasImportReference(tree)) {
        targetTreeId = treeId;
        break;
      }
    }
    
    if (targetTreeId === "") {
      const newTreeId = `${foundNode.id}-${Date.now()}`; // Simple ID generation for now
      try {
        await handleCreateNewTree(foundNode.id, foundNode.amount, newTreeId, foundNode.recipe?.id || null, true);
        targetTreeId = newTreeId;
      } catch (error) {
         logger.error("[IMPORT ERROR] Failed to create new tree during import:", error);
         return; // Stop if tree creation fails
      }
    }
    
    await handleImportNodeInternal(foundNode, targetTreeId, foundTreeId);

  }, [dependencies.dependencyTrees, handleCreateNewTree, handleImportNodeInternal]);

  // Public handleUnimport: Dispatch the thunk with transaction
  const handleUnimport = useCallback(async (nodeId: string) => {
    dispatch(beginHistoryTransaction('Unimport node') as unknown as Parameters<typeof dispatch>[0]);
    try {
      await dispatch(unimportNodeThunk({ nodeId, tabId }));
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    } catch (error) {
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
      throw error;
    }
  }, [dispatch, tabId]);

  // Public handleImportNode: Make this async to match expected return type
  const handleImportNodeById = useCallback(async (nodeId: string) => {
    dispatch(beginHistoryTransaction('Import node') as unknown as Parameters<typeof dispatch>[0]);
    try {
      // Await the internal async function
      await importNodeForTreeInternal(nodeId);
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    } catch (error) {
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
      throw error;
    }
  }, [dispatch, importNodeForTreeInternal]);

  // Import amount controls for multi-source imports
  const handleSetImportAmount = useCallback((
    treeId: string,
    nodeId: string,
    parentNodeId: string,
    newAmount: number
  ) => {
    dispatch(setImportAmountThunk({ treeId, importNodeId: nodeId, parentNodeId, newAmount }));
  }, [dispatch]);

  const handleResetImportAmount = useCallback((
    treeId: string,
    nodeId: string,
    parentNodeId: string
  ) => {
    dispatch(resetImportAmountThunk({ treeId, importNodeId: nodeId, parentNodeId }));
  }, [dispatch]);

  const handleMaxImportAmount = useCallback((
    treeId: string,
    nodeId: string,
    parentNodeId: string
  ) => {
    dispatch(maxImportAmountThunk({ 
      treeId, 
      importNodeId: nodeId, 
      parentNodeId
    }));
  }, [dispatch]);

  return {
    handleImportNode: handleImportNodeById, // Now returns Promise<void>
    handleUnimport,
    handleSetImportAmount,
    handleResetImportAmount,
    handleMaxImportAmount,
  };
}; 