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
      // Delete the tree with the specified ID
      delete state.dependencyTrees[action.payload.treeId];
      
      // Clear accumulated dependencies if no trees remain
      if (Object.keys(state.dependencyTrees).length === 0) {
        state.accumulatedDependencies = {};
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
      }>
    ) => {
      console.log("Import action:", action.payload);
      const { sourceTreeId, sourceNodeId, targetTreeId, isNewTree } = action.payload;
      const sourceTree = state.dependencyTrees[sourceTreeId];
      const targetTree = state.dependencyTrees[targetTreeId];

      if (!sourceTree || !targetTree) {
        console.error("Source or target tree not found");
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

      console.log("Found source node:", sourceNode);

      // If source node is already an import node, toggle it back
      if (sourceNode.isImport) {
        console.log("Toggling import off");
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
            targetRoot.amount -= sourceNode.amount;
            if (targetRoot.amount <= 0) {
              delete state.dependencyTrees[sourceNode.importedFrom];
            }
          }
          delete sourceNode.importedFrom;
        }
      } else {
        console.log("Converting to import node");
        // Convert to import node
        sourceNode.isImport = true;
        // Save original children
        sourceNode.originalChildren = [...(sourceNode.children || [])];
        // Clear children for import node
        sourceNode.children = [];

        // If this is a newly created tree, we've already set the correct amount
        // so don't modify the target tree's amount
        if (isNewTree) {
          console.log("Using newly created tree - amount already set");
          sourceNode.importedFrom = targetTreeId;
        } else {
          // For existing trees, find the root and add the amount
          console.log("Adding to existing root:", targetTree);
          targetTree.amount += sourceNode.amount;
          sourceNode.importedFrom = targetTreeId;
        }
      }

      // Update accumulated dependencies
      const allAccumulated: Record<string, AccumulatedNode> = {};
      Object.values(state.dependencyTrees).forEach(tree => {
        const treeAccumulated = calculateAccumulatedFromTree(tree);
        Object.assign(allAccumulated, treeAccumulated);
      });
      state.accumulatedDependencies = allAccumulated;
    },
  },
});

export const { setDependencies, deleteTree, updateAccumulated, importNode } = dependencySlice.actions;
export default dependencySlice.reducer;
