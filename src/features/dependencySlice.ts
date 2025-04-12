import { createSlice, PayloadAction, createAction, ActionReducerMapBuilder } from "@reduxjs/toolkit";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { AccumulatedNode, calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";
import { 
  clearImportReference, 
  getImportReference, 
  hasImportReference,
  setImportReference,
  findNodeById
} from "../utils/nodeReferenceUtils";
import { getRecipeById, getRecipeByOutput } from "../data/dbQueries";
import { AppDispatch } from "../store";
import { machine } from "../data/machine";
import { AppThunk } from "../store";
import { Recipe } from "../types";
import { 
  findNodesImportingToTree
} from "../utils/nodeReferenceUtils";

interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;  // Map of treeId to DependencyNode
  accumulatedDependencies: Record<string, AccumulatedNode>;
  // Additional properties for better state management
  errors: string[]; // Track errors like circular references
}

// Export the state interface for use in tests
export type { DependencyState };

const initialState: DependencyState = {
  dependencyTrees: {},
  accumulatedDependencies: {},
  errors: []
};

// Helper function to find nodes importing to a specific tree
function findNodesImportingToTree(trees: Record<string, DependencyNode>, targetTreeId: string): DependencyNode[] {
  const results: DependencyNode[] = [];
  
  // Helper function to check nodes recursively
  const checkNode = (node: DependencyNode) => {
    // Check if this node imports from the target tree
    if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
        (node.isImport && node.importedFrom === targetTreeId)) {
      results.push(node);
    }
    
    // Check children
    if (node.children && node.children.length > 0) {
      node.children.forEach(checkNode);
    }
  };
  
  // Check all trees
  Object.values(trees).forEach(tree => {
    checkNode(tree);
  });
  
  return results;
}

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
      console.debug(`[REDUX DEBUG] setDependencies called for tree: ${action.payload.treeId}`);
      console.debug(`[REDUX DEBUG] Tree amount: ${action.payload.tree.amount}`);
      console.debug(`[REDUX DEBUG] Accumulated nodes count: ${Object.keys(action.payload.accumulated).length}`);
      
      // Check if this tree already exists
      const existingTree = state.dependencyTrees[action.payload.treeId];
      if (existingTree) {
        console.debug(`[REDUX DEBUG] Updating existing tree: ${action.payload.treeId}`);
        console.debug(`[REDUX DEBUG] Previous amount: ${existingTree.amount}, New amount: ${action.payload.tree.amount}`);
        
        // Check if this is an imported tree with nodes importing from it
        const importingNodes = findNodesImportingToTree(state.dependencyTrees, action.payload.treeId);
        if (importingNodes.length > 0) {
          console.debug(`[REDUX DEBUG] Tree ${action.payload.treeId} has ${importingNodes.length} nodes importing from it`);
          importingNodes.forEach((node, idx) => {
            console.debug(`[REDUX DEBUG] Node #${idx+1} importing from this tree: ${node.id} (${node.uniqueId}) with amount ${node.amount}`);
          });
        }
      } else {
        console.debug(`[REDUX DEBUG] Creating new tree: ${action.payload.treeId}`);
      }
      
      // Create completely new references to ensure React detects changes
      state.dependencyTrees = {
        ...state.dependencyTrees,
        [action.payload.treeId]: action.payload.tree 
      };
      
      // Always create a fresh object for accumulated dependencies
      state.accumulatedDependencies = action.payload.accumulated;
      
      console.debug('[REDUX DEBUG] Redux state updated');
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
        nodeId: string;
        targetTreeId: string;
        sourceTreeId: string;
        shouldImport: boolean;
      }>
    ) => {
      const { nodeId, targetTreeId, sourceTreeId, shouldImport } = action.payload;
      console.log('Found source node:', state.dependencyTrees[sourceTreeId]?.children?.find(c => c.uniqueId === nodeId));

      const sourceTree = state.dependencyTrees[sourceTreeId];
      if (!sourceTree) return;

      // Find the node to be imported/unimported
      const nodeToToggle = findNodeById(sourceTree, nodeId);
      if (!nodeToToggle) return;

      if (shouldImport === false) {
        console.log(`[UNIMPORT DEBUG] Toggling import off for node: ${nodeId}`);
        
        // Clear import reference which restores original children if available
        const clearedNode = clearImportReference(nodeToToggle);

        // Apply changes back to source tree by replacing the node
        const updatedSourceTree = replaceNode(sourceTree, nodeId, clearedNode);
        state.dependencyTrees = {
          ...state.dependencyTrees,
          [sourceTreeId]: updatedSourceTree
        };

        // Reduce amount in target tree
        if (targetTreeId && state.dependencyTrees[targetTreeId]) {
          console.log(`[UNIMPORT DEBUG] Reducing target tree amount by: ${nodeToToggle.amount}`);
          
          // Get the total amount from all importing nodes across all trees
          let totalRequiredAmount = 0;
          
          // Collect all nodes that import from this target tree
          Object.values(state.dependencyTrees).forEach((tree) => {
            // Skip the source tree since we're already removing its import
            if (tree.uniqueId === sourceTreeId) return;
            
            // Function to find import nodes within a tree
            const findImportsToTarget = (node: DependencyNode): number => {
              let amount = 0;
              
              // Check if this node imports from our target
              if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
                  (node.isImport && node.importedFrom === targetTreeId)) {
                amount += node.amount || 0;
              }
              
              // Check children
              if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                  amount += findImportsToTarget(child);
                }
              }
              
              return amount;
            };
            
            totalRequiredAmount += findImportsToTarget(tree);
          });
          
          // Update the target tree with the aggregated amount
          const targetTree = state.dependencyTrees[targetTreeId];

          // Only remove the tree if no other trees are importing from it
          if (totalRequiredAmount <= 0) {
            console.log(`[UNIMPORT DEBUG] No imports left, setting target tree to original amount: 0`);
            // Set back to original amount (0) instead of removing
            state.dependencyTrees = {
              ...state.dependencyTrees,
              [targetTreeId]: {
                ...targetTree,
                amount: 0
              }
            };
          } else {
            console.log(`[UNIMPORT DEBUG] Target tree has been updated to amount: ${totalRequiredAmount}`);
            // Update with the total amount from other imports
            state.dependencyTrees = {
              ...state.dependencyTrees,
              [targetTreeId]: {
                ...targetTree,
                amount: totalRequiredAmount
              }
            };
          }
        }
        
        return;
      }

      console.log('Converting to import node');
      
      // Store original recipe selections for later restoration when unimporting
      console.log('[IMPORT DEBUG] Storing recipe selections for later restoration');
      
      // Find the target tree to import from
      let targetTree = state.dependencyTrees[targetTreeId];
      
      // Add explicit debug logging for target tree existence
      if (!targetTree) {
        console.error(`[IMPORT ERROR] Target tree with ID '${targetTreeId}' not found in state!`);
        console.log(`[IMPORT DEBUG] Available tree IDs:`, Object.keys(state.dependencyTrees));
      } else {
        console.log(`[IMPORT DEBUG] Found target tree with ID '${targetTreeId}'`, targetTree);
      }
      
      // If target tree doesn't exist, create it based on the imported node
      if (!targetTree) {
        console.log(`[IMPORT DEBUG] Creating new target tree: ${targetTreeId}`);
        // Create a new tree with the same ID as the node being imported
        targetTree = {
          id: nodeToToggle.id,
          amount: nodeToToggle.amount || 0,
          uniqueId: targetTreeId,
          isRoot: true,
          children: []
        };
        
        // Add it to state
        state.dependencyTrees = {
          ...state.dependencyTrees,
          [targetTreeId]: targetTree
        };
      } else {
        console.log('Adding to existing root:', targetTree);
      }
      
      // Create an import node using the node reference utilities
      // IMPORTANT: This is the key fix - we need to create a properly formed import reference
      const importedNode = setImportReference(
        nodeToToggle, 
        {
          targetTreeId,
          targetNodeId: targetTree.uniqueId || targetTreeId, // Use tree uniqueId or fallback to treeId
        }
      );
      
      // Apply the imported node to the source tree by replacing the original node
      const updatedSourceTree = replaceNode(sourceTree, nodeId, importedNode);
      
      // Update state with the modified source tree
      state.dependencyTrees = {
        ...state.dependencyTrees,
        [sourceTreeId]: updatedSourceTree
      };
      
      // Calculate the total required amount from all importing nodes
      let totalRequiredAmount = 0;
      
      // Log the pre-calculation state for debugging
      console.log(`[IMPORT AGGREGATION DEBUG] Calculating total required amount for target tree ${targetTreeId}`);
      console.log(`[IMPORT AGGREGATION DEBUG] Current tree IDs in state:`, Object.keys(state.dependencyTrees));
      
      // Collect imports from all trees, including the updated source tree
      Object.values({
        ...state.dependencyTrees,
        [sourceTreeId]: updatedSourceTree // Use the updated source tree
      }).forEach(tree => {
        // Function to find import nodes within a tree
        const findImportsToTarget = (node: DependencyNode): number => {
          let amount = 0;
          
          // Check if this node imports from our target
          if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
              (node.isImport && node.importedFrom === targetTreeId)) {
            amount += node.amount || 0;
            console.log(`[IMPORT AGGREGATION] Found import node ${node.id} (${node.uniqueId}) with amount ${amount}`);
          }
          
          // Check children
          if (node.children && node.children.length > 0) {
            for (const child of node.children) {
              amount += findImportsToTarget(child);
            }
          }
          
          return amount;
        };
        
        const treeAmount = findImportsToTarget(tree);
        totalRequiredAmount += treeAmount;
        console.log(`[IMPORT AGGREGATION] Tree ${tree.uniqueId} contributes ${treeAmount} to total`);
      });
      
      console.log(`[IMPORT AGGREGATION] Final aggregated amount for ${targetTreeId}: ${totalRequiredAmount}`);
      
      // Update the target tree with the aggregated amount
      state.dependencyTrees = {
        ...state.dependencyTrees,
        [targetTreeId]: {
          ...targetTree,
          amount: totalRequiredAmount
        }
      };
      
      // The critical fix: When a tree's amount changes due to import/unimport,
      // we need to propagate this change through its entire production chain
      // by recalculating the amount for each child node
      const updatedTargetTree = state.dependencyTrees[targetTreeId];
      if (updatedTargetTree && updatedTargetTree.children && updatedTargetTree.children.length > 0) {
        // Calculate the total production (forced + excess)
        const totalProduction = (updatedTargetTree.amount || 0) + (updatedTargetTree.excess || 0);
        console.log(`[IMPORT DEBUG] Propagating total production of ${totalProduction} through the chain`);
        
        // Helper function to recursively update amounts in the chain
        const updateChildAmounts = (node: DependencyNode, amount: number) => {
          if (!node.children || node.children.length === 0) return;
          
          node.children.forEach(child => {
            if (!child.isImport && !child.importReference) {
              // Only update non-import nodes (import nodes get their amount from their source)
              child.amount = amount;
              console.log(`[IMPORT DEBUG] Updated child ${child.id} amount to ${amount}`);
              
              // Recursively update nested children
              updateChildAmounts(child, amount);
            } else {
              // Important fix for nested imports: update the amount of imported nodes too
              // This ensures that when a tree's total production changes, the imported nodes
              // within this tree also get updated with the new amount
              child.amount = amount;
              console.log(`[IMPORT DEBUG] Updated imported child ${child.id} amount to ${amount}`);
              
              // Update the tree that this node imports from
              if (child.importReference && child.importReference.targetTreeId) {
                const importTargetTreeId = child.importReference.targetTreeId;
                if (state.dependencyTrees[importTargetTreeId]) {
                  // Update the imported tree's amount to match
                  state.dependencyTrees = {
                    ...state.dependencyTrees,
                    [importTargetTreeId]: {
                      ...state.dependencyTrees[importTargetTreeId],
                      amount: amount
                    }
                  };
                  console.log(`[IMPORT DEBUG] Updated imported tree ${importTargetTreeId} amount to ${amount}`);
                  
                  // Recursively update the imported tree's children as well
                  updateChildAmounts(state.dependencyTrees[importTargetTreeId], amount);
                }
              }
            }
          });
        };
        
        // Update all child nodes in the tree with the total production amount
        updateChildAmounts(updatedTargetTree, totalProduction);
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
    },

    // New reducer to handle import/unimport actions
    handleNodeImport: (state, action: ReturnType<typeof importNodeAction>) => {
      const { nodeId, targetTreeId, sourceTreeId, shouldImport } = action.payload;
      console.log('Found source node:', state.dependencyTrees[sourceTreeId]?.children?.find(c => c.uniqueId === nodeId));

      const sourceTree = state.dependencyTrees[sourceTreeId];
      if (!sourceTree) return;

      // Find the node to be imported/unimported
      const nodeToToggle = findNodeById(sourceTree, nodeId);
      if (!nodeToToggle) return;

      if (shouldImport === false) {
        console.log(`[UNIMPORT DEBUG] Toggling import off for node: ${nodeId}`);
        
        // Clear import reference which restores original children if available
        const clearedNode = clearImportReference(nodeToToggle);

        // Ensure excess value is preserved when unimporting
        if (nodeToToggle.excess !== undefined && nodeToToggle.excess > 0) {
          clearedNode.excess = nodeToToggle.excess;
        }

        // Apply changes back to source tree by replacing the node
        const updatedSourceTree = replaceNode(sourceTree, nodeId, clearedNode);
        state.dependencyTrees = {
          ...state.dependencyTrees,
          [sourceTreeId]: updatedSourceTree
        };

        // Reduce amount in target tree
        if (targetTreeId && state.dependencyTrees[targetTreeId]) {
          console.log(`[UNIMPORT DEBUG] Reducing target tree amount by: ${nodeToToggle.amount}`);
          
          // Get the total amount from all importing nodes across all trees
          let totalRequiredAmount = 0;
          
          // Collect all nodes that import from this target tree
          Object.values(state.dependencyTrees).forEach((tree) => {
            // Skip the source tree since we're already removing its import
            if (tree.uniqueId === sourceTreeId) return;
            
            // Function to find import nodes within a tree
            const findImportsToTarget = (node: DependencyNode): number => {
              let amount = 0;
              
              // Check if this node imports from our target
              if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
                  (node.isImport && node.importedFrom === targetTreeId)) {
                amount += node.amount || 0;
              }
              
              // Check children
              if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                  amount += findImportsToTarget(child);
                }
              }
              
              return amount;
            };
            
            totalRequiredAmount += findImportsToTarget(tree);
          });
          
          // Update the target tree with the aggregated amount
          const targetTree = state.dependencyTrees[targetTreeId];
          
          // Only remove the tree if no other trees are importing from it
          if (totalRequiredAmount <= 0) {
            console.log(`[UNIMPORT DEBUG] No imports left, setting target tree to original amount: 0`);
            // Set back to original amount (0) instead of removing
            state.dependencyTrees = {
              ...state.dependencyTrees,
              [targetTreeId]: {
                ...targetTree,
                amount: 0
              }
            };
          } else {
            console.log(`[UNIMPORT DEBUG] Target tree has been updated to amount: ${totalRequiredAmount}`);
            // Update with the total amount from other imports
            state.dependencyTrees = {
              ...state.dependencyTrees,
              [targetTreeId]: {
                ...targetTree,
                amount: totalRequiredAmount
              }
            };
          }
        }
        
        return;
      }

      console.log('Converting to import node');
      
      // Store original recipe selections for later restoration when unimporting
      console.log('[IMPORT DEBUG] Storing recipe selections for later restoration');
      
      // Find the target tree to import from
      let targetTree = state.dependencyTrees[targetTreeId];
      
      // Add explicit debug logging for target tree existence
      if (!targetTree) {
        console.error(`[IMPORT ERROR] Target tree with ID '${targetTreeId}' not found in state!`);
        console.log(`[IMPORT DEBUG] Available tree IDs:`, Object.keys(state.dependencyTrees));
      } else {
        console.log(`[IMPORT DEBUG] Found target tree with ID '${targetTreeId}'`, targetTree);
      }
      
      // If target tree doesn't exist, create it based on the imported node
      if (!targetTree) {
        console.log(`[IMPORT DEBUG] Creating new target tree: ${targetTreeId}`);
        // Create a new tree with the same ID as the node being imported
        targetTree = {
          id: nodeToToggle.id,
          amount: nodeToToggle.amount || 0,
          uniqueId: targetTreeId,
          isRoot: true,
          children: []
        };
        
        // Add it to state
        state.dependencyTrees = {
          ...state.dependencyTrees,
          [targetTreeId]: targetTree
        };
      } else {
        console.log('Adding to existing root:', targetTree);
      }
      
      // Create an import node using the node reference utilities
      // IMPORTANT: This is the key fix - we need to create a properly formed import reference
      const importedNode = setImportReference(
        nodeToToggle, 
        {
          targetTreeId,
          targetNodeId: targetTree.uniqueId || targetTreeId, // Use tree uniqueId or fallback to treeId
        }
      );
      
      // Apply the imported node to the source tree by replacing the original node
      const updatedSourceTree = replaceNode(sourceTree, nodeId, importedNode);
      
      // Update state with the modified source tree
      state.dependencyTrees = {
        ...state.dependencyTrees,
        [sourceTreeId]: updatedSourceTree
      };
      
      // Calculate the total required amount from all importing nodes
      let totalRequiredAmount = 0;
      
      // Log the pre-calculation state for debugging
      console.log(`[IMPORT AGGREGATION DEBUG] Calculating total required amount for target tree ${targetTreeId}`);
      console.log(`[IMPORT AGGREGATION DEBUG] Current tree IDs in state:`, Object.keys(state.dependencyTrees));
      
      // Collect imports from all trees, including the updated source tree
      Object.values({
        ...state.dependencyTrees,
        [sourceTreeId]: updatedSourceTree // Use the updated source tree
      }).forEach(tree => {
        // Function to find import nodes within a tree
        const findImportsToTarget = (node: DependencyNode): number => {
          let amount = 0;
          
          // Check if this node imports from our target
          if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
              (node.isImport && node.importedFrom === targetTreeId)) {
            amount += node.amount || 0;
            console.log(`[IMPORT AGGREGATION] Found import node ${node.id} (${node.uniqueId}) with amount ${amount}`);
          }
          
          // Check children
          if (node.children && node.children.length > 0) {
            for (const child of node.children) {
              amount += findImportsToTarget(child);
            }
          }
          
          return amount;
        };
        
        const treeAmount = findImportsToTarget(tree);
        totalRequiredAmount += treeAmount;
        console.log(`[IMPORT AGGREGATION] Tree ${tree.uniqueId} contributes ${treeAmount} to total`);
      });
      
      console.log(`[IMPORT AGGREGATION] Final aggregated amount for ${targetTreeId}: ${totalRequiredAmount}`);
      
      // Update the target tree with the aggregated amount
      state.dependencyTrees = {
        ...state.dependencyTrees,
        [targetTreeId]: {
          ...targetTree,
          amount: totalRequiredAmount
        }
      };
      
      // The critical fix: When a tree's amount changes due to import/unimport,
      // we need to propagate this change through its entire production chain
      // by recalculating the amount for each child node
      const updatedTargetTree = state.dependencyTrees[targetTreeId];
      if (updatedTargetTree && updatedTargetTree.children && updatedTargetTree.children.length > 0) {
        // Calculate the total production (forced + excess)
        const totalProduction = (updatedTargetTree.amount || 0) + (updatedTargetTree.excess || 0);
        console.log(`[IMPORT DEBUG] Propagating total production of ${totalProduction} through the chain`);
        
        // Helper function to recursively update amounts in the chain
        const updateChildAmounts = (node: DependencyNode, amount: number) => {
          if (!node.children || node.children.length === 0) return;
          
          node.children.forEach(child => {
            if (!child.isImport && !child.importReference) {
              // Only update non-import nodes (import nodes get their amount from their source)
              child.amount = amount;
              console.log(`[IMPORT DEBUG] Updated child ${child.id} amount to ${amount}`);
              
              // Recursively update nested children
              updateChildAmounts(child, amount);
            } else {
              // Important fix for nested imports: update the amount of imported nodes too
              // This ensures that when a tree's total production changes, the imported nodes
              // within this tree also get updated with the new amount
              child.amount = amount;
              console.log(`[IMPORT DEBUG] Updated imported child ${child.id} amount to ${amount}`);
              
              // Update the tree that this node imports from
              if (child.importReference && child.importReference.targetTreeId) {
                const importTargetTreeId = child.importReference.targetTreeId;
                if (state.dependencyTrees[importTargetTreeId]) {
                  // Update the imported tree's amount to match
                  state.dependencyTrees = {
                    ...state.dependencyTrees,
                    [importTargetTreeId]: {
                      ...state.dependencyTrees[importTargetTreeId],
                      amount: amount
                    }
                  };
                  console.log(`[IMPORT DEBUG] Updated imported tree ${importTargetTreeId} amount to ${amount}`);
                  
                  // Recursively update the imported tree's children as well
                  updateChildAmounts(state.dependencyTrees[importTargetTreeId], amount);
                }
              }
            }
          });
        };
        
        // Update all child nodes in the tree with the total production amount
        updateChildAmounts(updatedTargetTree, totalProduction);
      }

      // Update accumulated dependencies
      const allAccumulated: Record<string, AccumulatedNode> = {};
      Object.values(state.dependencyTrees).forEach(tree => {
        const treeAccumulated = calculateAccumulatedFromTree(tree);
        Object.assign(allAccumulated, treeAccumulated);
      });
      
      state.accumulatedDependencies = allAccumulated;
    },
    
    // New reducer to handle unimport action (for backwards compatibility)
    handleNodeUnimport: (state, action: ReturnType<typeof unimportNode>) => {
      const { nodeId, targetTreeId, sourceTreeId } = action.payload;
      
      // Call the import handler with shouldImport=false
      dependencySlice.caseReducers.handleNodeImport(state, {
        type: importNodeAction.type,
        payload: {
          nodeId,
          targetTreeId,
          sourceTreeId,
          shouldImport: false
        }
      });
    },
    
    // Add these new reducers to the slice
    applyExcessProduction: (
      state,
      action: PayloadAction<{
        nodeId: string;
        treeId: string;
        amount: number;
      }>
    ) => {
      const { nodeId, treeId, amount } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (!tree) return;
      
      // Find and update the node's excess value
      const updateNodeInTree = (node: DependencyNode): boolean => {
        if (node.uniqueId === nodeId) {
          node.excess = amount;
          return true;
        }
        
        if (node.children) {
          for (const child of node.children) {
            if (updateNodeInTree(child)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      updateNodeInTree(tree);
    },
    
    applyForcedProduction: (
      state,
      action: PayloadAction<{
        nodeId: string;
        treeId: string;
        amount: number;
      }>
    ) => {
      const { nodeId, treeId, amount } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (!tree) return;
      
      // Find and update the node's amount value (forced production)
      const updateNodeInTree = (node: DependencyNode): boolean => {
        if (node.uniqueId === nodeId) {
          node.amount = amount;
          return true;
        }
        
        if (node.children) {
          for (const child of node.children) {
            if (updateNodeInTree(child)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      updateNodeInTree(tree);
    }
  },
  extraReducers: (builder) => {
    // Add production update handlers
    productionSliceExtraReducers(builder);
  }
});

export const { 
  setDependencies, 
  deleteTree, 
  updateAccumulated, 
  importNode, 
  loadSavedState,
  updateNodeProperties,
  clearErrors,
  applyExcessProduction,
  applyForcedProduction
} = dependencySlice.actions;
export default dependencySlice.reducer;

// Define custom actions for excess handling
export const setExcess = createAction<{
  excess: number;
  nodeId: string;
  treeId: string;
}>('dependency/setExcess');

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

// Define import/export actions - renamed to avoid duplicate declaration
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

// Error handling action
export const setError = createAction<string>('dependency/setError');

// Helper function to replace a node in a tree by its ID
// This maintains the tree structure while updating a specific node
const replaceNode = (tree: DependencyNode, nodeId: string, newNode: DependencyNode): DependencyNode => {
  // If this is the node to replace, return the new node
  if (tree.uniqueId === nodeId) {
    return newNode;
  }
  
  // If no children, no need to traverse further
  if (!tree.children || tree.children.length === 0) {
    return tree;
  }
  
  // Recursively check children
  return {
    ...tree,
    children: tree.children.map((child) => replaceNode(child, nodeId, newNode))
  };
};

// Add new action types for granular production control
export const updateExcessProduction = createAction<{
  nodeId: string;
  treeId: string;
  amount: number;
}>('dependencies/updateExcessProduction');

export const updateForcedProduction = createAction<{
  nodeId: string;
  treeId: string;
  amount: number;
}>('dependencies/updateForcedProduction');

export const updateImportedProduction = createAction<{
  nodeId: string;
  treeId: string;
  targetTreeId: string;
  amount: number;
}>('dependencies/updateImportedProduction');

// Helper function to determine which nodes are affected by a production change
function calculateAffectedNodes(
  trees: Record<string, DependencyNode>,
  treeId: string,
  nodeId: string,
  productionType: 'excess' | 'forced' | 'imported',
  amount: number
) {
  const result: Array<{
    nodeId: string;
    treeId: string;
    productionType: 'excess' | 'forced' | 'imported';
    amount: number;
    targetTreeId?: string;
    needsRecipe?: boolean;
  }> = [];
  
  // Get the current tree and node
  const tree = trees[treeId];
  if (!tree) {
    console.error(`[AFFECTED] Tree ${treeId} not found`);
    return result;
  }
  
  // Find the specific node in the tree
  const node = findNodeById(tree, nodeId);
  if (!node) {
    console.error(`[AFFECTED] Node ${nodeId} not found in tree ${treeId}`);
    console.log(`[AFFECTED] Available nodes in tree:`, getAllNodeIds(tree));
    return result;
  }
  
  console.log(`[AFFECTED] Processing node: ${node.id} (${node.uniqueId}), with children: ${node.children?.length || 0}`);
  
  // Debug node properties
  console.log(`[AFFECTED] Node properties:`, {
    id: node.id,
    uniqueId: node.uniqueId,
    amount: node.amount,
    excess: node.excess,
    hasRecipe: !!node.recipe,
    recipeId: node.selectedRecipeId,
    hasChildren: node.children && node.children.length > 0,
    isImport: hasImportReference(node)
  });
  
  // Check if this is an import node
  if (hasImportReference(node)) {
    // If it's an import node being updated, we need to update its target tree
    if (productionType === 'excess' || productionType === 'forced') {
      const importRef = getImportReference(node);
      if (importRef) {
        // Pass the production to the target tree's root as forced production
        console.log(`[AFFECTED] Node is an import, updating target tree: ${importRef.targetTreeId}`);
        
        // The fix: For imports, we must carefully pass the exact amount the node will contribute
        // This ensures proper aggregation when multiple nodes import from the same target
        result.push({
          nodeId: importRef.targetNodeId || 'root',
          treeId: importRef.targetTreeId,
          productionType: 'forced', // Always use forced for import contributions
          amount: amount,
          targetTreeId: importRef.targetTreeId
        });
      }
    }
  } 
  // For regular nodes, update the children based on recipe
  else if (node.children && node.children.length > 0) {
    // We'll need to add the recipe loading here...
    const hasRecipeNeeded = !node.recipe && !!node.selectedRecipeId;
    
    // Calculate total production based on the update type
    let totalProduction = node.amount || 0;
    
    if (productionType === 'excess') {
      // Use the new excess value to calculate total production
      totalProduction += amount;
      console.log(`[PROPAGATION] Node ${node.id} has total production: ${totalProduction} (amount: ${node.amount}, excess: ${amount})`);
    } else if (productionType === 'forced') {
      // For forced production updates, use the provided amount plus existing excess
      totalProduction = amount + (node.excess || 0);
      console.log(`[PROPAGATION] Node ${node.id} has total production: ${totalProduction} (forced: ${amount}, excess: ${node.excess || 0})`);
    }
    
    // Push an update for each child, even if we don't have the recipe yet
    // This ensures the propagation doesn't stop
    node.children.forEach(child => {
      // Pass the same forced production to all children
      result.push({
        nodeId: child.uniqueId,
        treeId: treeId,
        productionType: 'forced',
        // If we don't have the recipe yet, pass the same amount to ensure propagation continues
        amount: totalProduction,
        needsRecipe: hasRecipeNeeded
      });
    });
    
    // If we have the recipe, we can calculate more accurate child amounts
    if (node.recipe) {
      console.log(`[AFFECTED] Node has recipe ${node.selectedRecipeId} with outputs:`, 
        Object.keys(node.recipe.out).join(', '));
      
      // Get recipe output amount to calculate cycles
      const outputAmount = node.recipe.out[node.id] || 1;
      const cyclesNeeded = totalProduction / outputAmount;
      console.log(`[PROPAGATION] Cycles needed: ${cyclesNeeded} (total: ${totalProduction} / output: ${outputAmount})`);
      
      // Update the result with correct amounts
      const updatedResult = result.map(item => {
        // Find the corresponding child
        const child = node.children?.find(c => c.uniqueId === item.nodeId);
        if (child) {
          const inputAmount = node.recipe?.in[child.id] || 0;
          const childAmount = inputAmount * cyclesNeeded;
          console.log(`[PROPAGATION] Child ${child.id} needs: ${childAmount} (input: ${inputAmount} * cycles: ${cyclesNeeded})`);
          
          // Update the amount in the result
          return {
            ...item,
            amount: childAmount
          };
        }
        return item;
      });
      
      // Replace the result with updated amounts
      result.length = 0;
      result.push(...updatedResult);
    } else {
      console.error(`[AFFECTED] Node ${node.id} has no recipe, cannot calculate precise child amounts`);
      
      // Try to find a recipe if there isn't one already
      if (node.selectedRecipeId) {
        console.log(`[AFFECTED] Node has selectedRecipeId ${node.selectedRecipeId}, but no recipe object`);
        console.log(`[AFFECTED] Continuing propagation with estimated values. Recipe will be loaded during calculation.`);
      }
    }
  } else {
    console.log(`[AFFECTED] Node has no children to update`);
  }
  
  // Log the result
  console.log(`[AFFECTED] Returning ${result.length} affected nodes`);
  return result;
}

// Helper function to get all node IDs in a tree for debugging
function getAllNodeIds(tree: DependencyNode): string[] {
  const ids: string[] = [tree.uniqueId];
  
  if (tree.children && tree.children.length > 0) {
    tree.children.forEach(child => {
      ids.push(...getAllNodeIds(child));
    });
  }
  
  return ids;
}

// Handle the external action types inside the slice's extraReducers
export const productionSliceExtraReducers = (builder: ActionReducerMapBuilder<DependencyState>) => {
  builder
    .addCase(updateExcessProduction, (state: DependencyState, action: PayloadAction<{
      nodeId: string;
      treeId: string;
      amount: number;
    }>) => {
      const { nodeId, treeId, amount } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (!tree) return;
      
      // Find and update the node's excess value
      const updateNodeInTree = (node: DependencyNode): boolean => {
        if (node.uniqueId === nodeId) {
          node.excess = amount;
          return true;
        }
        
        if (node.children) {
          for (const child of node.children) {
            if (updateNodeInTree(child)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      updateNodeInTree(tree);
    })
    .addCase(updateForcedProduction, (state: DependencyState, action: PayloadAction<{
      nodeId: string;
      treeId: string;
      amount: number;
    }>) => {
      const { nodeId, treeId, amount } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (!tree) return;
      
      // Find and update the node's amount value (forced production)
      const updateNodeInTree = (node: DependencyNode): boolean => {
        if (node.uniqueId === nodeId) {
          node.amount = amount;
          return true;
        }
        
        if (node.children) {
          for (const child of node.children) {
            if (updateNodeInTree(child)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      updateNodeInTree(tree);
    })
    .addCase(updateImportedProduction, (state: DependencyState, action: PayloadAction<{
      nodeId: string;
      treeId: string;
      targetTreeId: string;
      amount: number;
    }>) => {
      const { nodeId, treeId, targetTreeId, amount } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (!tree) return;
      
      console.log(`[IMPORT AGGREGATION FIX] Starting critical update for import ${nodeId} with amount ${amount} to target ${targetTreeId}`);
      
      // For import nodes, we update both the source import node
      // and add a forced production to the target tree
      const updateImportNode = (node: DependencyNode): boolean => {
        if (node.uniqueId === nodeId) {
          // Store previous amount before updating to track the difference
          const previousAmount = node.amount || 0;
          
          // Update the import node's amount
          node.amount = amount;
          
          console.log(`[IMPORT UPDATE] Updating import node ${node.id} (${node.uniqueId}) amount from ${previousAmount} to ${amount}`);
          return true;
        }
        
        if (node.children) {
          for (const child of node.children) {
            if (updateImportNode(child)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      // Update the import node in the source tree 
      updateImportNode(tree);
      
      // CRITICAL FIX: After updating our source node, we need to recalculate 
      // ALL contributions to the target tree from ALL trees
      // Rather than using the calculated amount parameter that came in
      
      // Step 1: Find the target tree
      const targetTree = state.dependencyTrees[targetTreeId];
      if (!targetTree) {
        console.error(`[IMPORT AGGREGATION FIX] Target tree ${targetTreeId} not found in state!`);
        console.log(`[IMPORT AGGREGATION FIX] Available trees: ${Object.keys(state.dependencyTrees).join(', ')}`);
        return;
      }
      
      console.log(`[IMPORT AGGREGATION FIX] Found target tree ${targetTreeId}`);
      
      // Step 2: Find and collect ALL contributions to this target tree
      const contributions: {treeId: string, nodeId: string, amount: number}[] = [];
      
      // Scan ALL trees for nodes that import from this target
      Object.entries(state.dependencyTrees).forEach(([currentTreeId, currentTree]) => {
        // Helper to find import nodes recursively 
        const findImportNodes = (node: DependencyNode) => {
          // Check if this node imports from our target
          const importRef = getImportReference(node);
          if (importRef && importRef.targetTreeId === targetTreeId) {
            contributions.push({
              treeId: currentTreeId,
              nodeId: node.uniqueId,
              amount: node.amount || 0
            });
            console.log(`[IMPORT AGGREGATION FIX] Found contribution from ${node.id} (${node.uniqueId}) with amount ${node.amount || 0}`);
          } 
          // Legacy format check
          else if (node.isImport && node.importedFrom === targetTreeId) {
            contributions.push({
              treeId: currentTreeId, 
              nodeId: node.uniqueId,
              amount: node.amount || 0
            });
            console.log(`[IMPORT AGGREGATION FIX] Found legacy contribution from ${node.id} (${node.uniqueId}) with amount ${node.amount || 0}`);
          }
          
          // Recursively check children
          if (node.children) {
            node.children.forEach(findImportNodes);
          }
        };
        
        // Start at the root of each tree
        findImportNodes(currentTree);
      });
      
      // Step 3: Calculate the total from ALL contributions
      let totalImportAmount = 0;
      contributions.forEach(contribution => {
        totalImportAmount += contribution.amount;
        console.log(`[IMPORT AGGREGATION FIX] Contribution: ${contribution.treeId} -> ${contribution.nodeId} = ${contribution.amount}`);
      });
      
      console.log(`[IMPORT AGGREGATION FIX] Total from ${contributions.length} contributors: ${totalImportAmount}`);
      
      // Step 4: Update the target tree with the total aggregated amount
      targetTree.amount = totalImportAmount;
      console.log(`[IMPORT AGGREGATION FIX] Set target tree ${targetTreeId} amount to ${totalImportAmount}`);
      
      // Step 5: Propagate this aggregated amount to all children in the target tree
      if (targetTree.children && targetTree.children.length > 0) {
        console.log(`[IMPORT AGGREGATION FIX] Propagating updates to ${targetTree.children.length} children`);
        
        // Total production includes forced + excess
        const totalProduction = totalImportAmount + (targetTree.excess || 0);
        
        // Recursive helper to update children
        const updateChildren = (node: DependencyNode, amount: number) => {
          if (!node.children || node.children.length === 0) return;
          
          node.children.forEach(child => {
            if (!hasImportReference(child) && !child.isImport) {
              // Only update non-import children
              child.amount = amount;
              console.log(`[IMPORT AGGREGATION FIX] Updated child ${child.id} (${child.uniqueId}) to ${amount}`);
              
              // Recursively process its children
              updateChildren(child, amount);
            }
          });
        };
        
        // Start updating from the target tree's children 
        updateChildren(targetTree, totalProduction);
      }
    });
};

// Sequential production update thunk
export const updateTreeProduction = 
  (nodeId: string, treeId: string, productionType: 'excess' | 'forced' | 'imported', amount: number, targetTreeId?: string) => 
  async (dispatch: AppDispatch, getState: () => { dependencies: DependencyState }) => {
    console.log(`[PRODUCTION UPDATE] Starting update for ${nodeId} in tree ${treeId}, type: ${productionType}, amount: ${amount}`);
    
    // CRITICAL DEBUGGING: Check that the node exists before we try to update it
    const initialState = getState();
    const tree = initialState.dependencies.dependencyTrees[treeId];
    if (!tree) {
      console.error(`[FATAL] Tree ${treeId} not found in state`);
      return;
    }
    
    // Find the node we're trying to update
    const nodeToUpdate = findNodeById(tree, nodeId);
    if (!nodeToUpdate) {
      console.error(`[FATAL] Node ${nodeId} not found in tree ${treeId}`);
      console.log(`[DEBUG] Available nodes in tree:`, getAllNodeIds(tree));
      return;
    }
    
    console.log(`[NODE FOUND] Will update node ${nodeToUpdate.id} (${nodeToUpdate.uniqueId})`);
    
    // For an import node, check if we're already tracking this import 
    // to avoid double-counting when updating amounts
    const isImportNode = hasImportReference(nodeToUpdate) || nodeToUpdate.isImport;
    
    if (isImportNode) {
      console.log(`[IMPORT UPDATE] Node ${nodeToUpdate.id} is an import node`);
      
      // Get import reference (either new format or legacy)
      const importRef = getImportReference(nodeToUpdate);
      const importTargetTreeId = importRef ? importRef.targetTreeId : nodeToUpdate.importedFrom;
      
      if (importTargetTreeId) {
        console.log(`[IMPORT UPDATE] Importing from tree ${importTargetTreeId}`);
        
        // Store the previous amount to track changes
        const previousAmount = nodeToUpdate.amount || 0;
        
        // For import nodes, when updating amounts we need to track what changes
        // This ensures proper aggregation across multiple imports to the same target
        console.log(`[IMPORT UPDATE] Amount changing from ${previousAmount} to ${amount} (diff: ${amount - previousAmount})`);
        
        // CRITICAL FIX: Keep track of this specific import in the target tree's metadata
        // to ensure proper aggregation with multiple imports
        const targetTree = initialState.dependencies.dependencyTrees[importTargetTreeId];
        
        if (targetTree) {
          // Let's update the import immediately to make sure it's reflected in the state
          // for future calculations
          dispatch(updateImportedProduction({ 
            nodeId, 
            treeId, 
            targetTreeId: importTargetTreeId, 
            amount 
          }));
          
          // Wait for state to update
          await Promise.resolve();
          
          // After updating this import, we need to recalculate the aggregated amount for the target tree
          // based on ALL trees that import from it
          const updatedState = getState();
          const allTrees = updatedState.dependencies.dependencyTrees;
          
          // Calculate the total required amount from all importing nodes
          let totalImportAmount = 0;
          const contributors: {treeId: string, nodeId: string, amount: number}[] = [];
          
          // Find ALL nodes across ALL trees that import from this target
          Object.entries(allTrees).forEach(([currTreeId, currTree]) => {
            // Skip the target tree itself
            if (currTreeId === importTargetTreeId) return;
            
            // Helper to find imports recursively
            const findImports = (node: DependencyNode) => {
              // Check for import reference (new format)
              const nodeImportRef = getImportReference(node);
              if (nodeImportRef && nodeImportRef.targetTreeId === importTargetTreeId) {
                contributors.push({
                  treeId: currTreeId,
                  nodeId: node.uniqueId,
                  amount: node.amount || 0
                });
                
                // Add this node's contribution to the total
                totalImportAmount += (node.amount || 0);
                console.log(`[AGGREGATE DEBUG] Found import from ${currTreeId}:${node.id} with amount ${node.amount || 0}`);
              }
              // Check for legacy import format
              else if (node.isImport && node.importedFrom === importTargetTreeId) {
                contributors.push({
                  treeId: currTreeId,
                  nodeId: node.uniqueId,
                  amount: node.amount || 0
                });
                
                // Add this node's contribution to the total
                totalImportAmount += (node.amount || 0);
                console.log(`[AGGREGATE DEBUG] Found legacy import from ${currTreeId}:${node.id} with amount ${node.amount || 0}`);
              }
              
              // Check children
              if (node.children) {
                node.children.forEach(findImports);
              }
            };
            
            // Start at the tree root
            findImports(currTree);
          });
          
          console.log(`[AGGREGATE DEBUG] Total contributors: ${contributors.length}, total amount: ${totalImportAmount}`);
          
          // Ensure the target tree amount is updated with the total from ALL contributors
          if (totalImportAmount > 0) {
            // We need to update the target tree directly with the aggregated amount
            dispatch(updateForcedProduction({
              nodeId: targetTree.uniqueId,
              treeId: importTargetTreeId,
              amount: totalImportAmount
            }));
            
            // Wait for state to update
            await Promise.resolve();
            
            // Now propagate this updated amount through the target tree's children
            const finalState = getState();
            const finalTargetTree = finalState.dependencies.dependencyTrees[importTargetTreeId];
            
            if (finalTargetTree) {
              // Calculate the total production (forced + excess)
              const totalProduction = (finalTargetTree.amount || 0) + (finalTargetTree.excess || 0);
              
              // Propagate this amount through the target tree's children
              if (finalTargetTree.children && finalTargetTree.children.length > 0) {
                for (const child of finalTargetTree.children) {
                  // Skip import nodes within the target tree
                  if (!hasImportReference(child) && !child.isImport) {
                    await dispatch(updateTreeProduction(
                      child.uniqueId,
                      importTargetTreeId,
                      'forced',
                      totalProduction
                    ));
                  }
                }
              }
            }
          }
          
          // We've handled the import completely, so we can return
          return Promise.resolve();
        }
      }
    }
    
    // Step 1: Update the node's production value based on type
    if (productionType === 'excess') {
      dispatch(updateExcessProduction({ nodeId, treeId, amount }));
    } 
    else if (productionType === 'forced') {
      dispatch(updateForcedProduction({ nodeId, treeId, amount }));
    } 
    else if (productionType === 'imported' && targetTreeId) {
      dispatch(updateImportedProduction({ nodeId, treeId, targetTreeId, amount }));
    }
    
    // Step 2: Get the updated state after the first action
    const state = getState();
    const { dependencyTrees } = state.dependencies;
    
    // Check if the node needs a recipe and load it if needed
    const updatedNode = findNodeById(dependencyTrees[treeId], nodeId);
    if (updatedNode && updatedNode.selectedRecipeId && !updatedNode.recipe) {
      console.log(`[RECIPE AUTO-LOAD] Node ${nodeId} has recipeId ${updatedNode.selectedRecipeId} but no recipe object. Loading now...`);
      
      try {
        // Load the recipe from the database
        const recipe = await getRecipeById(updatedNode.selectedRecipeId);
        if (recipe) {
          console.log(`[RECIPE AUTO-LOAD] Successfully loaded recipe ${recipe.id} for node ${nodeId}`);
          
          // Update the node with the loaded recipe
          dispatch(updateNodeProperties({
            nodeId,
            updatedNode: {
              recipe
            }
          }));
          
          // Get updated state after recipe loading
          const updatedState = getState();
          const updatedDependencyTrees = updatedState.dependencies.dependencyTrees;
          
          // Step 3: Calculate affected nodes with the updated node that has a recipe
          const affectedNodes = calculateAffectedNodes(
            updatedDependencyTrees,
            treeId,
            nodeId,
            productionType,
            amount
          );
          
          console.log(`[PROPAGATION] Found ${affectedNodes.length} affected nodes to update after recipe loading`);
          
          // Step 4: Process each affected node sequentially
          for (const node of affectedNodes) {
            console.log(`[PROPAGATION] Updating child node: ${node.nodeId} in tree ${node.treeId} with amount ${node.amount}`);
            
            // Check if we need to load a recipe for this node
            if (node.needsRecipe) {
              console.log(`[RECIPE LOADING] Child node ${node.nodeId} needs recipe, will be loaded during its processing`);
            }
            
            await dispatch(updateTreeProduction(
              node.nodeId,
              node.treeId,
              node.productionType,
              node.amount,
              node.targetTreeId
            ));
          }
          
          return Promise.resolve();
        } else {
          console.error(`[RECIPE AUTO-LOAD] Failed to load recipe ${updatedNode.selectedRecipeId}`);
        }
      } catch (error) {
        console.error(`[RECIPE AUTO-LOAD] Error loading recipe:`, error);
      }
    }
    
    // Step 3: Calculate affected nodes
    const affectedNodes = calculateAffectedNodes(
      dependencyTrees,
      treeId,
      nodeId,
      productionType,
      amount
    );
    
    console.log(`[PROPAGATION] Found ${affectedNodes.length} affected nodes to update`);
    
    // Step 4: Process each affected node sequentially
    for (const node of affectedNodes) {
      console.log(`[PROPAGATION] Updating child node: ${node.nodeId} in tree ${node.treeId} with amount ${node.amount}`);
      
      await dispatch(updateTreeProduction(
        node.nodeId,
        node.treeId,
        node.productionType,
        node.amount,
        node.targetTreeId
      ));
    }
    
    return Promise.resolve();
  };

// Action to load a recipe for a node
export const loadNodeRecipe = 
  (nodeId: string, treeId: string) => 
  async (dispatch: AppDispatch, getState: () => { dependencies: DependencyState }) => {
    console.log(`[RECIPE LOADER] Loading recipe for node ${nodeId} in tree ${treeId}`);
    
    const state = getState();
    const tree = state.dependencies.dependencyTrees[treeId];
    if (!tree) {
      console.error(`[RECIPE LOADER] Tree ${treeId} not found`);
      return;
    }
    
    const node = findNodeById(tree, nodeId);
    if (!node) {
      console.error(`[RECIPE LOADER] Node ${nodeId} not found in tree ${treeId}`);
      return;
    }
    
    // Check if the node already has a recipe
    if (node.recipe) {
      console.log(`[RECIPE LOADER] Node ${nodeId} already has a recipe`);
      return;
    }
    
    // Get the recipe ID from the node
    const recipeId = node.selectedRecipeId;
    if (!recipeId) {
      console.error(`[RECIPE LOADER] Node ${nodeId} has no selectedRecipeId`);
      
      // Try to get a default recipe for this item
      try {
        console.log(`[RECIPE LOADER] Attempting to get default recipe for item ${node.id}`);
        const recipe = await getRecipeByOutput(node.id);
        if (recipe) {
          console.log(`[RECIPE LOADER] Found default recipe ${recipe.id} for item ${node.id}`);
          
          // Update the node with the recipe
          dispatch(updateNodeProperties({
            nodeId,
            updatedNode: {
              recipe,
              selectedRecipeId: recipe.id
            }
          }));
          
          return;
        } else {
          console.error(`[RECIPE LOADER] No default recipe found for item ${node.id}`);
        }
      } catch (error) {
        console.error(`[RECIPE LOADER] Error getting default recipe:`, error);
      }
      
      return;
    }
    
    // Load the recipe from the database
    try {
      console.log(`[RECIPE LOADER] Loading recipe ${recipeId} for node ${nodeId}`);
      const recipe = await getRecipeById(recipeId);
      if (recipe) {
        console.log(`[RECIPE LOADER] Successfully loaded recipe ${recipe.id}`);
        
        // Update the node with the loaded recipe
        dispatch(updateNodeProperties({
          nodeId,
          updatedNode: {
            recipe
          }
        }));
      } else {
        console.error(`[RECIPE LOADER] Failed to load recipe ${recipeId}`);
      }
    } catch (error) {
      console.error(`[RECIPE LOADER] Error loading recipe:`, error);
    }
  };
