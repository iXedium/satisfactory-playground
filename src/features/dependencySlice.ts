import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DependencyNode, restoreOriginalChildren } from "../utils/calculateDependencyTree";
import { AccumulatedNode, calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";
import { 
  setImportReference, 
  clearImportReference, 
  findNodeById,
  toggleChildrenVisibility,
  wouldCreateCircularReference,
  hasImportReference,
  getImportReference
} from "../utils/nodeReferenceUtils";

interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;  // Map of treeId to DependencyNode
  accumulatedDependencies: Record<string, AccumulatedNode>;
  // Additional properties for better state management
  errors?: string[]; // Track errors like circular references
}

const initialState: DependencyState = {
  dependencyTrees: {},
  accumulatedDependencies: {},
  errors: []
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
      console.debug(`[EXCESS DEBUG] Redux setDependencies called for tree: ${action.payload.treeId}`);
      console.debug(`[EXCESS DEBUG] Accumulated nodes count: ${Object.keys(action.payload.accumulated).length}`);
      
      // Create completely new references to ensure React detects changes
      state.dependencyTrees = {
        ...state.dependencyTrees,
        [action.payload.treeId]: action.payload.tree 
      };
      
      // Always create a fresh object for accumulated dependencies
      state.accumulatedDependencies = action.payload.accumulated;
      
      console.debug('[EXCESS DEBUG] Redux state updated');
    },
    
    deleteTree: (
      state,
      action: PayloadAction<{
        treeId: string;
      }>
    ) => {
      const treeIdToDelete = action.payload.treeId;
      
      // Clear any previous errors
      state.errors = [];
      
      // Use helper function to find all nodes importing from the deleted tree
      const findNodesImportingFromTree = (trees: Record<string, DependencyNode>, targetTreeId: string): {
        tree: DependencyNode;
        node: DependencyNode;
      }[] => {
        const results: { tree: DependencyNode; node: DependencyNode }[] = [];
        
        // Check all trees
        Object.values(trees).forEach(tree => {
          // Recursive helper to check each node
          const checkNode = (node: DependencyNode, currentTree: DependencyNode) => {
            // Check if this node is importing from the target tree
            const importRef = getImportReference(node);
            if (importRef && importRef.targetTreeId === targetTreeId) {
              results.push({ tree: currentTree, node });
            }
            
            // Check all children
            if (node.children) {
              node.children.forEach(child => checkNode(child, currentTree));
            }
          };
          
          // Start at the root of each tree
          checkNode(tree, tree);
        });
        
        return results;
      };
      
      // Find all nodes importing from the to-be-deleted tree
      const affectedNodes = findNodesImportingFromTree(state.dependencyTrees, treeIdToDelete);
      
      // For each affected node, clear the import reference
      affectedNodes.forEach(({ node }) => {
        console.log(`Restoring node ${node.id} that was importing from deleted tree ${treeIdToDelete}`);
        
        // Use our reference-based utility to properly clear import reference
        const clearedNode = clearImportReference(node);
        
        // Apply changes to the node in place
        Object.assign(node, clearedNode);
      });
      
      // Delete the tree
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
      }>
    ) => {
      const { sourceTreeId, sourceNodeId, targetTreeId, isNewTree } = action.payload;
      const sourceTree = state.dependencyTrees[sourceTreeId];
      const targetTree = state.dependencyTrees[targetTreeId];

      // Clear any previous errors
      state.errors = [];
      
      if (!sourceTree || !targetTree) {
        console.error("Source or target tree not found");
        state.errors?.push("Source or target tree not found");
        return;
      }
      
      // Check for circular references
      if (!isNewTree && wouldCreateCircularReference(state.dependencyTrees, sourceTreeId, targetTreeId)) {
        console.error("Circular reference detected - cannot import");
        state.errors?.push("Cannot create circular import reference");
        return;
      }

      // Find the source node
      const sourceNode = findNodeById(sourceTree, sourceNodeId);
      if (!sourceNode) {
        console.error("Source node not found");
        state.errors?.push("Source node not found");
        return;
      }

      console.log("Found source node:", sourceNode);

      // If this is already an import node, toggle import off
      if (hasImportReference(sourceNode) || sourceNode.isImport) {
        console.log("[UNIMPORT DEBUG] Toggling import off for node:", sourceNode.uniqueId);
        
        // Use reference-based approach to clear the import reference
        const updatedSourceNode = clearImportReference(sourceNode);
        
        // Apply changes to source node
        Object.assign(sourceNode, updatedSourceNode);
        
        // Reduce the target tree's amount by the amount that was imported
        if (targetTree) {
          console.log("[UNIMPORT DEBUG] Reducing target tree amount by:", sourceNode.amount);
          
          // Reduce the amount in the target tree
          targetTree.amount -= sourceNode.amount;
          
          // If the target tree is empty (zero or negative amount AND no excess), delete it
          if (targetTree.amount <= 0 && (!targetTree.excess || targetTree.excess <= 0)) {
            console.log("[UNIMPORT DEBUG] Removing empty target tree:", targetTreeId);
            delete state.dependencyTrees[targetTreeId];
          } else {
            // Ensure amount is never negative
            targetTree.amount = Math.max(0, targetTree.amount);
            console.log("[UNIMPORT DEBUG] Target tree has been updated to amount:", targetTree.amount);
          }
        }
      } else {
        console.log("Converting to import node");
        
        // Store original recipe selections in children for restoration later
        if (sourceNode.children && sourceNode.children.length > 0) {
          console.log("[IMPORT DEBUG] Storing recipe selections for later restoration");
          
          // Store original recipe selection in children
          const storeRecipeSelections = (children) => {
            if (!children) return;
            
            children.forEach(child => {
              // Store recipe ID for restoration
              if (child.selectedRecipeId) {
                child.originalRecipeId = child.selectedRecipeId;
                console.log(`[IMPORT DEBUG] Stored recipe ID ${child.selectedRecipeId} for ${child.id}`);
              }
              
              // Recursively store for nested children
              if (child.children && child.children.length > 0) {
                storeRecipeSelections(child.children);
              }
            });
          };
          
          storeRecipeSelections(sourceNode.children);
        }
        
        // Use reference-based approach to set import reference
        const updatedSourceNode = setImportReference(sourceNode, targetTreeId, targetTree.uniqueId);
        
        // Apply changes to source node
        Object.assign(sourceNode, updatedSourceNode);
        
        // If this is a newly created tree, we've already set the correct amount
        // so don't modify the target tree's amount
        if (isNewTree) {
          console.log("Using newly created tree - amount already set");
        } else {
          // For existing trees, find the root and add the amount
          console.log("Adding to existing root:", targetTree);
          // Preserve the excess value when setting up the import relationship
          const currentExcess = targetTree.excess || 0;
          targetTree.amount += sourceNode.amount;
          // Maintain the excess value
          targetTree.excess = currentExcess;
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
    
    loadSavedState: (state, action: PayloadAction<DependencyState>) => {
      // Replace the entire state with the saved state
      return action.payload;
    },
    
    updateNodeProperties: (
      state,
      action: PayloadAction<{
        nodeId: string;
        updatedNode: Partial<DependencyNode>;
      }>
    ) => {
      const { nodeId, updatedNode } = action.payload;
      
      // Update the node in all trees
      const updateNodeInTree = (tree: DependencyNode): boolean => {
        if (tree.uniqueId === nodeId) {
          // Apply the updates to this node
          Object.assign(tree, updatedNode);
          return true;
        }
        
        if (tree.children) {
          for (const child of tree.children) {
            if (updateNodeInTree(child)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      // Try to update the node in all trees
      Object.values(state.dependencyTrees).forEach(tree => {
        updateNodeInTree(tree);
      });
    },
    
    clearErrors: (state) => {
      state.errors = [];
    }
  },
});

export const { 
  setDependencies, 
  deleteTree, 
  updateAccumulated, 
  importNode, 
  loadSavedState,
  updateNodeProperties,
  clearErrors
} = dependencySlice.actions;
export default dependencySlice.reducer;

// Helper function to find and replace a node in a tree by its uniqueId
export const findAndReplaceNode = (tree: DependencyNode, nodeId: string, replacement: DependencyNode): boolean => {
  // Check if this is the node to replace
  if (tree.uniqueId === nodeId) {
    // Cannot replace the root node this way
    console.error("Cannot replace the root node");
    return false;
  }
  
  // Check direct children first
  if (tree.children) {
    for (let i = 0; i < tree.children.length; i++) {
      if (tree.children[i].uniqueId === nodeId) {
        // Replace the node
        console.log(`[UNIMPORT DEBUG] Replacing node ${nodeId} in tree`);
        tree.children[i] = replacement;
        return true;
      }
    }
    
    // Check nested children
    for (let i = 0; i < tree.children.length; i++) {
      if (findAndReplaceNode(tree.children[i], nodeId, replacement)) {
        return true;
      }
    }
  }
  return false;
};
