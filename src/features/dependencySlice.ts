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
      console.log("============ IMPORT NODE REDUCER START ============");
      console.log("Import action:", action.payload);
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
      console.log("Found source node:", sourceNode);
      if (!sourceNode) {
        console.error("Source node not found");
        return;
      }

      // If source node is already an import node or we're explicitly un-importing
      if (sourceNode.isImport || isUnimport) {
        console.log("Converting import node back to normal node");
        
        // For unimporting, find the source tree root and subtract amount
        if (isUnimport) {
          // Find the root of the source tree
          const sourceTree = state.dependencyTrees[sourceTreeId];
          if (sourceTree) {
            console.log(`Updating source tree ${sourceTreeId} amount from ${sourceTree.amount} to ${Math.max(0, sourceTree.amount - sourceNode.amount)}`);
            // Subtract the amount when unimporting
            sourceTree.amount = Math.max(0, sourceTree.amount - sourceNode.amount);
          }
        }
        
        // Restore the node's previous state
        sourceNode.isImport = false;
        if (sourceNode.originalChildren) {
          sourceNode.children = sourceNode.originalChildren;
          delete sourceNode.originalChildren;
        }

        // Find and update the target tree's root node if it still exists
        if (sourceNode.importedFrom) {
          const targetRoot = state.dependencyTrees[sourceNode.importedFrom];
          if (targetRoot) {
            // Calculate the new amount - subtracting the source node's amount
            const newAmount = Math.max(0, targetRoot.amount - sourceNode.amount);
            console.log(`Updating target tree ${sourceNode.importedFrom} amount from ${targetRoot.amount} to ${newAmount}`);
            
            // Update the target tree's amount when un-importing
            targetRoot.amount = newAmount;
            
            // Only delete the tree if it has no production (amount <= 0) AND no excess
            // If it has excess, we want to keep it even if the amount is zero
            if (targetRoot.amount <= 0 && (!targetRoot.excess || targetRoot.excess <= 0)) {
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

        // Find the source tree and update its amount
        const sourceTree = state.dependencyTrees[sourceTreeId];
        if (sourceTree) {
          console.log(`Updating source tree ${sourceTreeId} amount from ${sourceTree.amount} to ${sourceTree.amount + sourceNode.amount}`);
          // Add to the source tree's amount
          sourceTree.amount += sourceNode.amount;
        }

        // Only proceed with target tree operations if we have a valid target
        if (targetTree) {
          // Store the reference to the target tree
          sourceNode.importedFrom = targetTreeId;
          
          // If this is a newly created tree, we've already set the correct amount
          // so don't modify the target tree's amount
          if (!isNewTree) {
            // For existing trees, add the source node amount to the target tree
            const originalExcess = targetTree.excess || 0;
            const newAmount = targetTree.amount + sourceNode.amount;
            console.log(`Updating target tree ${targetTreeId} amount from ${targetTree.amount} to ${newAmount}`);
            
            // Add amount for the import
            targetTree.amount = newAmount;
            // Preserve the original excess value
            targetTree.excess = originalExcess;
          }

          console.log("Final state of node after import:", sourceNode);
          console.log("Final state of target tree:", targetTree);
        }
      }

      // Update accumulated dependencies - combining all trees except import nodes
      const allAccumulated: Record<string, AccumulatedNode> = {};
      
      // Helper function to collect non-import nodes from a tree
      const collectNonImportNodes = (treeId: string, tree: DependencyNode, accumulated: Record<string, AccumulatedNode>) => {
        // Don't process a tree that no longer exists
        if (!state.dependencyTrees[treeId]) return;
        
        const processNode = (node: DependencyNode, parentPath: string = '', depth: number = 0) => {
          // Skip import nodes completely - they shouldn't be in accumulated view
          if (node.isImport) return;
          
          // Add this node to accumulated
          const nodePath = parentPath ? `${parentPath} > ${node.id}` : node.id;
          accumulated[node.uniqueId] = {
            itemId: node.id,
            amount: node.amount,
            recipeId: node.selectedRecipeId || "",
            isByproduct: node.isByproduct || false,
            isImport: false,
            isExtension: false,
            depth: depth
          };
          
          // Process children recursively
          if (node.children) {
            node.children.forEach(child => {
              if (!child.isImport) {
                processNode(child, nodePath, depth + 1);
              }
            });
          }
        };
        
        // Process the tree
        processNode(tree);
      };
      
      // Process each tree to build accumulated dependencies
      Object.entries(state.dependencyTrees).forEach(([treeId, tree]) => {
        collectNonImportNodes(treeId, tree, allAccumulated);
      });
      
      // Replace the accumulated dependencies with the new set
      state.accumulatedDependencies = allAccumulated;
      console.log("============ IMPORT NODE REDUCER END ============");
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
