import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { logger } from '../../../utils/logger';
import { DependencyNode } from '../../../types';
import { DependencyState } from '../store/dependencySlice';
import { 
  importNodeAction, 
  checkAndConvertNodeTypeThunk,
  autoImportNodeChildrenThunk,
  unimportNodeThunk,
  setImportAmountThunk,
  resetImportAmountThunk,
  maxImportAmountThunk,
} from '../store';
import { findNodeById } from '../../../utils';
import { hasImportReference, getImportReference } from '../../../utils/nodeReferenceUtils';

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
  const dispatch = useDispatch<AppDispatch>();

  // Original handleImportNode logic (now internal)
  const handleImportNodeInternal = useCallback(( 
    sourceNode: DependencyNode, 
    targetTreeId: string, 
    sourceTreeId: string
  ) => {
    if (!sourceNode || !targetTreeId || !sourceTreeId) {
      logger.error('[IMPORT ERROR] Missing required parameters for import', { sourceNode, targetTreeId, sourceTreeId });
      return;
    }
    
    
    const targetTree = dependencies.dependencyTrees[targetTreeId];
    if (!targetTree) {
      logger.warn(`[IMPORT WARNING] Target tree ${targetTreeId} not found in current state. This may be expected if the tree was just created.`);
    } else {
      // ... (optional debug logging for existing imports) ...
    }
    
    dispatch(importNodeAction({
      nodeId: sourceNode.uniqueId,
      sourceTreeId,
      targetTreeId,
      shouldImport: true
    }));

    // Trigger children auto-import for the target tree AFTER the import action
    // Use setTimeout to allow state update from importNodeAction
    setTimeout(() => {
      // console.log(`[IMPORT] Triggering auto-import for children of target: ${targetTreeId}`);
      dispatch(autoImportNodeChildrenThunk(targetTreeId));
    }, 0); // 0ms timeout queues it for the next event loop tick

    // --- Trigger Node Type Check for ALL roots (Keep this, might be needed after amount changes) --- 
    setTimeout(() => {
      const currentState = dependencies; // Use closure state
      Object.values(currentState.dependencyTrees).forEach(tree => {
          if (tree.isRoot) {
              dispatch(checkAndConvertNodeTypeThunk(tree.uniqueId));
          }
      });
    }, 10); // Keep slightly longer delay maybe?
    // ---------------------------------------------

  }, [dispatch, dependencies.dependencyTrees]);

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
        // Wait a moment for state update? This is tricky.
        await new Promise(res => setTimeout(res, 50)); 
        targetTreeId = newTreeId;
      } catch (error) {
         logger.error("[IMPORT ERROR] Failed to create new tree during import:", error);
         return; // Stop if tree creation fails
      }
    }
    
    handleImportNodeInternal(foundNode, targetTreeId, foundTreeId);

  }, [dependencies.dependencyTrees, handleCreateNewTree, handleImportNodeInternal]);

  // Public handleUnimport: Dispatch the thunk
  const handleUnimport = useCallback((nodeId: string) => {
    dispatch(unimportNodeThunk(nodeId));
  }, [dispatch]);

  // Public handleImportNode: Make this async to match expected return type
  const handleImportNodeById = useCallback(async (nodeId: string) => {
    // Await the internal async function
    await importNodeForTreeInternal(nodeId);
  }, [importNodeForTreeInternal]);

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