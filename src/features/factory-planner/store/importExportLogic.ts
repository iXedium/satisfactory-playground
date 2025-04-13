import { createAction, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer'; // Needed for Immer types in reducers
import { DependencyNode } from '../../../types';
import { 
  clearImportReference, 
  setImportReference 
} from '../../../utils/nodeReferenceUtils';
import { findNodeById, calculateAccumulatedFromTree, AccumulatedNode } from '../../../utils';

// --- Define the expected Slice State Shape locally --- 
interface ImportExportDependencyState {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedDependencies: Record<string, AccumulatedNode>;
  errors: string[]; // Keep consistent with original type
}

// Define Action Creators related to import/export
export const importNodeAction = createAction<{
  nodeId: string;
  targetTreeId: string;
  sourceTreeId: string;
  shouldImport: boolean;
}>('dependency/importNode');

export const unimportNode = createAction<{
  nodeId: string;
  targetTreeId: string;
  sourceTreeId: string;
}>('dependency/unimportNode');

// Helper function to replace a node in a tree by its ID (immutable)
const replaceNode = (tree: DependencyNode, nodeId: string, newNode: DependencyNode): DependencyNode => {
  if (tree.uniqueId === nodeId) { return newNode; }
  if (!tree.children || tree.children.length === 0) { return tree; }
  return {
    ...tree,
    children: tree.children.map((child) => replaceNode(child, nodeId, newNode))
  };
};

// Helper function to find and replace a node in a tree by its uniqueId (mutable - use with Immer)
export const findAndReplaceNode = (tree: WritableDraft<DependencyNode>, nodeId: string, replacement: WritableDraft<DependencyNode>): boolean => {
  if (tree.uniqueId === nodeId) {
    console.error("Cannot replace the root node using findAndReplaceNode");
    return false;
  }
  if (tree.children) {
    for (let i = 0; i < tree.children.length; i++) {
      if (tree.children[i].uniqueId === nodeId) {
        console.log(`[findAndReplaceNode] Replacing node ${nodeId} in tree`);
        tree.children[i] = replacement;
        return true;
      }
    }
    for (let i = 0; i < tree.children.length; i++) {
      if (findAndReplaceNode(tree.children[i], nodeId, replacement)) {
        return true;
      }
    }
  }
  return false;
};

// Reducer logic for handling import/unimport (extracted from dependencySlice)
// Note: This function directly mutates the state draft provided by Immer via extraReducers
export const handleNodeImportReducer = (
  state: WritableDraft<ImportExportDependencyState>,
  action: PayloadAction<{
    nodeId: string;
    targetTreeId: string;
    sourceTreeId: string;
    shouldImport: boolean;
  }>
) => {
  const { nodeId, targetTreeId, sourceTreeId, shouldImport } = action.payload;
  const sourceTree = state.dependencyTrees[sourceTreeId];
  if (!sourceTree) return;

  const nodeToToggle = findNodeById(sourceTree, nodeId);
  if (!nodeToToggle) return;

  if (shouldImport === false) {
    // --- Unimport logic --- 
    console.log(`[UNIMPORT DEBUG] Toggling import off for node: ${nodeId}`);
    const clearedNode = clearImportReference(nodeToToggle);
    if (nodeToToggle.excess !== undefined && nodeToToggle.excess > 0) {
      clearedNode.excess = nodeToToggle.excess;
    }
    // Use local replaceNode (immutable version needed here as we replace the whole tree)
    const updatedSourceTree = replaceNode(sourceTree, nodeId, clearedNode);
    state.dependencyTrees[sourceTreeId] = updatedSourceTree;

    // Reduce amount in target tree
    if (targetTreeId && state.dependencyTrees[targetTreeId]) {
      console.log(`[UNIMPORT DEBUG] Reducing target tree amount by: ${nodeToToggle.amount}`);
      let totalRequiredAmount = 0;
      Object.values(state.dependencyTrees).forEach((tree: WritableDraft<DependencyNode>) => {
        if (tree.uniqueId === sourceTreeId) return; // Skip updated source tree
        const findImportsToTarget = (node: DependencyNode): number => {
          let amount = 0;
          if ((node.importReference && node.importReference.targetTreeId === targetTreeId) || (node.isImport && node.importedFrom === targetTreeId)) {
            amount += node.amount || 0;
          }
          if (node.children && node.children.length > 0) {
            for (const child of node.children) {
              amount += findImportsToTarget(child);
            }
          }
          return amount;
        };
        totalRequiredAmount += findImportsToTarget(tree);
      });
      
      const targetTree = state.dependencyTrees[targetTreeId];
      if (totalRequiredAmount <= 0) {
        console.log(`[UNIMPORT DEBUG] No imports left, setting target tree amount to 0`);
        targetTree.amount = 0;
      } else {
        console.log(`[UNIMPORT DEBUG] Target tree amount updated to: ${totalRequiredAmount}`);
        targetTree.amount = totalRequiredAmount;
      }
      // TODO: Propagate amount change in target tree?
    }
    // --- End Unimport Logic --- 
  } else {
    // --- Import logic --- 
    console.log('Converting to import node');
    let targetTree = state.dependencyTrees[targetTreeId];
    if (!targetTree) {
      console.log(`[IMPORT DEBUG] Creating new target tree: ${targetTreeId}`);
      targetTree = {
        id: nodeToToggle.id,
        amount: 0, // Start new trees at 0 amount
        uniqueId: targetTreeId,
        isRoot: true,
        children: []
      };
      state.dependencyTrees[targetTreeId] = targetTree;
    } else {
      console.log('Adding to existing root:', targetTree);
    }
    
    const importedNode = setImportReference(
      nodeToToggle, 
      { targetTreeId, targetNodeId: targetTree.uniqueId || targetTreeId }
    );
    // Use local replaceNode (immutable version needed here)
    const updatedSourceTree = replaceNode(sourceTree, nodeId, importedNode);
    state.dependencyTrees[sourceTreeId] = updatedSourceTree;
    
    // Calculate total required amount for the target tree
    let totalRequiredAmount = 0;
    console.log(`[IMPORT AGGREGATION DEBUG] Calculating total required amount for target tree ${targetTreeId}`);
    Object.values(state.dependencyTrees).forEach((tree: WritableDraft<DependencyNode>) => {
      const findImportsToTarget = (node: DependencyNode): number => {
        let amount = 0;
        if ((node.importReference && node.importReference.targetTreeId === targetTreeId) || (node.isImport && node.importedFrom === targetTreeId)) {
          amount += node.amount || 0;
        }
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            amount += findImportsToTarget(child);
          }
        }
        return amount;
      };
      totalRequiredAmount += findImportsToTarget(tree);
    });
    console.log(`[IMPORT AGGREGATION] Final aggregated amount for ${targetTreeId}: ${totalRequiredAmount}`);
    
    // Update the target tree's amount
    state.dependencyTrees[targetTreeId].amount = totalRequiredAmount;
    
    // TODO: Propagate amount change in target tree?
    // --- End Import Logic --- 
  }
  
  // Update accumulated dependencies (common to both import/unimport)
  const allAccumulated: Record<string, AccumulatedNode> = {};
  Object.values(state.dependencyTrees).forEach((tree: WritableDraft<DependencyNode>) => {
    const treeAccumulated = calculateAccumulatedFromTree(tree);
    Object.assign(allAccumulated, treeAccumulated);
  });
  state.accumulatedDependencies = allAccumulated;
};

// Reducer logic for handling legacy unimport action
export const handleNodeUnimportReducer = (
  state: WritableDraft<ImportExportDependencyState>,
  action: PayloadAction<{
    nodeId: string;
    targetTreeId: string;
    sourceTreeId: string;
  }>
) => {
  // Call the main import handler with shouldImport=false
  handleNodeImportReducer(state, {
    type: importNodeAction.type,
    payload: {
      ...action.payload,
      shouldImport: false
    }
  });
}; 