import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { AccumulatedNode, calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";

interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;  // Map of treeId to DependencyNode
  accumulatedDependencies: Record<string, AccumulatedNode>;
}

const initialState: DependencyState = {
  dependencyTrees: {},
  accumulatedDependencies: {},
};

const dependencySlice = createSlice({
  name: "dependencies",
  initialState,
  reducers: {
    setDependencies: (
      state,
      action: PayloadAction<{
        treeId: string;  // Unique identifier for the tree
        tree: DependencyNode;
        accumulated: Record<string, AccumulatedNode>;
      }>
    ) => {
      state.dependencyTrees[action.payload.treeId] = action.payload.tree;
      state.accumulatedDependencies = action.payload.accumulated;
    },
    deleteTree: (
      state,
      action: PayloadAction<{
        treeId: string;
      }>
    ) => {
      const treeIdToDelete = action.payload.treeId;
      
      // Find all import nodes in all trees that reference the tree being deleted
      const findImportNodes = (tree: DependencyNode): DependencyNode[] => {
        const results: DependencyNode[] = [];
        
        // Check if this node is importing from the deleted tree
        if (tree.isImport && tree.importedFrom === treeIdToDelete) {
          results.push(tree);
        }
        
        // Check children recursively
        if (tree.children) {
          for (const child of tree.children) {
            results.push(...findImportNodes(child));
          }
        }
        
        return results;
      };
      
      // Find and restore all import nodes that reference the tree being deleted
      Object.values(state.dependencyTrees).forEach(tree => {
        const importNodes = findImportNodes(tree);
        
        // Restore each import node
        importNodes.forEach(node => {
          node.isImport = false;
          if (node.originalChildren) {
            node.children = node.originalChildren;
            delete node.originalChildren;
          }
          delete node.importedFrom;
        });
      });
      
      // Delete the tree with the specified ID
      delete state.dependencyTrees[treeIdToDelete];
      
      // Recalculate accumulated dependencies
      if (Object.keys(state.dependencyTrees).length === 0) {
        state.accumulatedDependencies = {};
      } else {
        // Update accumulated dependencies
        const allAccumulated: Record<string, AccumulatedNode> = {};
        Object.values(state.dependencyTrees).forEach(tree => {
          const treeAccumulated = calculateAccumulatedFromTree(tree);
          Object.assign(allAccumulated, treeAccumulated);
        });
        state.accumulatedDependencies = allAccumulated;
      }
    },
    updateAccumulated: (
      state,
      action: PayloadAction<Record<string, AccumulatedNode>>
    ) => {
      state.accumulatedDependencies = action.payload;
    },
    importNode: (
      state,
      action: PayloadAction<{
        sourceTreeId: string;
        sourceNodeId: string;
        targetTreeId: string;
        isNewTree?: boolean; // Flag to indicate if this is a newly created tree
        isUnimport?: boolean; // Flag to indicate this is an un-import operation
      }>
    ) => {
      const { sourceTreeId, sourceNodeId, targetTreeId, isNewTree, isUnimport } = action.payload;
      const sourceTree = state.dependencyTrees[sourceTreeId];
      const targetTree = state.dependencyTrees[targetTreeId];

      if (!sourceTree) {
        console.error("Source tree not found");
        return;
      }

      // For unimporting, we might not have the target tree anymore if it was deleted
      if (!targetTree && !isUnimport) {
        console.error("Target tree not found");
        return;
      }

      // Find the source node
      const findNode = (tree: DependencyNode, nodeId: string): DependencyNode | null => {
        if (tree.uniqueId === nodeId) {
          return tree;
        }

        if (tree.children) {
          for (const child of tree.children) {
            const found = findNode(child, nodeId);
            if (found) return found;
          }
        }
        return null;
      };

      const sourceNode = findNode(sourceTree, sourceNodeId);
      if (!sourceNode) {
        console.error("Source node not found");
        return;
      }

      // If source node is already an import node or we're explicitly un-importing
      if (sourceNode.isImport || isUnimport) {
        // Restore the node's previous state
        sourceNode.isImport = false;
        if (sourceNode.originalChildren) {
          sourceNode.children = sourceNode.originalChildren;
          delete sourceNode.originalChildren;
        }

        // Find and update the target tree's root node
        if (sourceNode.importedFrom) {
          const targetRoot = state.dependencyTrees[sourceNode.importedFrom];
          if (targetRoot) {
            // Subtract the amount when un-importing
            targetRoot.amount -= sourceNode.amount;
            
            // Only delete the tree if it has no production (amount <= 0) AND no excess
            // If it has excess, we want to keep it even if the amount is zero
            if (targetRoot.amount <= 0 && (!targetRoot.excess || targetRoot.excess <= 0)) {
              delete state.dependencyTrees[sourceNode.importedFrom];
            } else if (targetRoot.amount <= 0) {
              // If there's excess but no production, keep the tree but set amount to 0
              // This ensures we don't end up with negative production values
              targetRoot.amount = 0;
            }
          }
          delete sourceNode.importedFrom;
        }
      } else {
        // Convert to import node
        sourceNode.isImport = true;
        // Save original children
        sourceNode.originalChildren = [...(sourceNode.children || [])];
        // Clear children for import node
        sourceNode.children = [];

        // Only proceed with target tree operations if we have a valid target
        if (targetTree) {
          // If this is a newly created tree, we've already set the correct amount
          // so don't modify the target tree's amount
          if (isNewTree) {
            sourceNode.importedFrom = targetTreeId;
          } else {
            // For existing trees, find the root and add the amount
            // Store the original excess value to preserve it
            const originalExcess = targetTree.excess || 0;
            // Add amount for the import
            targetTree.amount += sourceNode.amount;
            // Preserve the original excess value
            targetTree.excess = originalExcess;
            sourceNode.importedFrom = targetTreeId;
          }
        }
      }

      // Update accumulated dependencies
      const allAccumulated: Record<string, AccumulatedNode> = {};
      Object.values(state.dependencyTrees).forEach(tree => {
        const treeAccumulated = calculateAccumulatedFromTree(tree);
        Object.assign(allAccumulated, treeAccumulated);
      });

      // Double-check to make sure no import nodes are included
      for (const nodeId in allAccumulated) {
        const node = findNode(sourceTree, nodeId);
        if (node && node.isImport) {
          delete allAccumulated[nodeId];
        }
      }
      
      state.accumulatedDependencies = allAccumulated;
    },
    loadSavedState: (state, action: PayloadAction<DependencyState>) => {
      // Replace the entire state with the saved state
      return action.payload;
    }
  },
});

export const { 
  setDependencies, 
  deleteTree, 
  updateAccumulated, 
  importNode, 
  loadSavedState 
} = dependencySlice.actions;
export default dependencySlice.reducer;
