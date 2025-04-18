import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { DependencyNode } from '../../../types';
import { DependencyState } from '../store/dependencySlice';
import { 
  importNodeAction, 
  unimportNode, 
  checkAndConvertNodeTypeThunk
} from '../store';
import { findNodeById } from '../../../utils';
import { hasImportReference } from '../../../utils/nodeReferenceUtils';

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
      console.error('[IMPORT ERROR] Missing required parameters for import', { sourceNode, targetTreeId, sourceTreeId });
      return;
    }
    
    
    const targetTree = dependencies.dependencyTrees[targetTreeId];
    if (!targetTree) {
      console.warn(`[IMPORT WARNING] Target tree ${targetTreeId} not found in current state. This may be expected if the tree was just created.`);
    } else {
      // ... (optional debug logging for existing imports) ...
    }
    
    dispatch(importNodeAction({
      nodeId: sourceNode.uniqueId,
      sourceTreeId,
      targetTreeId,
      shouldImport: true
    }));

    // --- Trigger Node Type Check for ALL roots --- 
    setTimeout(() => {
      const currentState = dependencies; // Use closure state
      Object.values(currentState.dependencyTrees).forEach(tree => {
          if (tree.isRoot) {
              dispatch(checkAndConvertNodeTypeThunk(tree.uniqueId));
          }
      });
    }, 10); 
    // ---------------------------------------------

  }, [dispatch, dependencies.dependencyTrees]);

  // Original handleUnimportNode logic (now internal)
  const handleUnimportNodeInternal = useCallback(( 
    sourceNode: DependencyNode,
    sourceTreeId: string
  ) => {
    if (!sourceNode || !sourceTreeId) return;
    
    const isImportNode = !!(sourceNode.isImport || (sourceNode.importReference && Object.keys(sourceNode.importReference).length > 0));
    
    if (!isImportNode) {
      console.warn('Not an import node, cannot unimport', sourceNode);
      return;
    }
    
    const targetTreeId = sourceNode.importedFrom || sourceNode.importReference?.targetTreeId;
    if (!targetTreeId) {
      console.error('Cannot unimport - missing target tree ID');
      return;
    }
    
    dispatch(unimportNode({
      nodeId: sourceNode.uniqueId,
      sourceTreeId,
      targetTreeId
    }));

    // --- Trigger Node Type Check for ALL roots --- 
    setTimeout(() => {
      const currentState = dependencies; // Use closure state
      Object.values(currentState.dependencyTrees).forEach(tree => {
          if (tree.isRoot) {
              dispatch(checkAndConvertNodeTypeThunk(tree.uniqueId));
          }
      });
    }, 10);
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
      console.error("Could not find node to import");
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
         console.error("[IMPORT ERROR] Failed to create new tree during import:", error);
         return; // Stop if tree creation fails
      }
    }
    
    handleImportNodeInternal(foundNode, targetTreeId, foundTreeId);

  }, [dependencies.dependencyTrees, handleCreateNewTree, handleImportNodeInternal]);

  // Original handleUnimport logic (public interface)
  const handleUnimport = useCallback((nodeId: string) => {
    let sourceNode: DependencyNode | null = null;
    let sourceTreeId = '';
    
    Object.entries(dependencies.dependencyTrees).forEach(([treeId, tree]) => {
      const node = findNodeById(tree as DependencyNode, nodeId);
      if (node) {
        sourceNode = node;
        sourceTreeId = treeId;
      }
    });
    
    if (!sourceNode || !sourceTreeId) {
      console.error('Node not found for unimport');
      return;
    }
    
    // Use internal handler
    handleUnimportNodeInternal(sourceNode, sourceTreeId);
  }, [dependencies.dependencyTrees, handleUnimportNodeInternal]);

  // Original handleImportNodeById logic (public interface)
  const handleImportNodeById = useCallback((nodeId: string) => {
    importNodeForTreeInternal(nodeId);
  }, [importNodeForTreeInternal]);

  return {
    handleImportNode: handleImportNodeById, // Rename for external use
    handleUnimport,
  };
}; 