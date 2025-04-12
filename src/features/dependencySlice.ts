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
import { createAction } from "@reduxjs/toolkit";

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
          Object.entries(state.dependencyTrees).forEach(([treeId, tree]) => {
            // Skip the source tree since we're already removing its import
            if (treeId === sourceTreeId) return;
            
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
      
      // Collect imports from all trees, including the updated source tree
      Object.entries({
        ...state.dependencyTrees,
        [sourceTreeId]: updatedSourceTree // Use the updated source tree
      }).forEach(([treeId, tree]) => {
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
          Object.entries(state.dependencyTrees).forEach(([treeId, tree]) => {
            // Skip the source tree since we're already removing its import
            if (treeId === sourceTreeId) return;
            
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
      
      // Collect imports from all trees, including the updated source tree
      Object.entries({
        ...state.dependencyTrees,
        [sourceTreeId]: updatedSourceTree // Use the updated source tree
      }).forEach(([treeId, tree]) => {
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
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(importNodeAction, (state, action) => {
        dependencySlice.caseReducers.handleNodeImport(state, action);
      })
      .addCase(unimportNode, (state, action) => {
        dependencySlice.caseReducers.handleNodeUnimport(state, action);
      })
      .addCase(setExcess, (state, action) => {
        const { excess, nodeId, treeId } = action.payload;
        const tree = state.dependencyTrees[treeId];
        
        if (!tree) return;
        
        console.debug(`[REDUX DEBUG] Setting excess for node ${nodeId} in tree ${treeId} to ${excess}`);
        
        // If the nodeId is the tree ID itself, update the root node
        if (nodeId === treeId) {
          state.dependencyTrees = {
            ...state.dependencyTrees,
            [treeId]: {
              ...tree,
              excess: excess
            }
          };
          
          // Now propagate the total production (amount + excess) through the tree's chain
          const updatedTree = state.dependencyTrees[treeId];
          if (updatedTree && updatedTree.children && updatedTree.children.length > 0) {
            // Calculate the total production (forced + excess)
            const totalProduction = (updatedTree.amount || 0) + (updatedTree.excess || 0);
            console.log(`[EXCESS DEBUG] Propagating total production of ${totalProduction} through the chain`);
            
            // Helper function to recursively update amounts in the chain
            const updateChildAmounts = (node: DependencyNode, amount: number) => {
              if (!node.children || node.children.length === 0) return;
              
              node.children.forEach(child => {
                if (!child.isImport && !child.importReference) {
                  // Only update non-import nodes (import nodes get their amount from their source)
                  child.amount = amount;
                  console.log(`[EXCESS DEBUG] Updated child ${child.id} amount to ${amount}`);
                  
                  // Recursively update nested children
                  updateChildAmounts(child, amount);
                } else {
                  // Important fix for nested imports: update the amount of imported nodes too
                  // This ensures that when a tree's total production changes, the imported nodes
                  // within this tree also get updated with the new amount
                  child.amount = amount;
                  console.log(`[EXCESS DEBUG] Updated imported child ${child.id} amount to ${amount}`);
                  
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
                      console.log(`[EXCESS DEBUG] Updated imported tree ${importTargetTreeId} amount to ${amount}`);
                      
                      // Recursively update the imported tree's children as well
                      updateChildAmounts(state.dependencyTrees[importTargetTreeId], amount);
                    }
                  }
                }
              });
            };
            
            // Update all child nodes in the tree with the total production amount
            updateChildAmounts(updatedTree, totalProduction);
          }
        } else {
          // Otherwise, find and update the specific node
          const updatedTree = replaceNode(tree, nodeId, {
            ...findNodeById(tree, nodeId)!,
            excess: excess
          });
          
          state.dependencyTrees = {
            ...state.dependencyTrees,
            [treeId]: updatedTree
          };
          
          // Check if we need to propagate the change to children of the specific node
          const updatedNode = findNodeById(state.dependencyTrees[treeId], nodeId);
          if (updatedNode && updatedNode.children && updatedNode.children.length > 0) {
            // Calculate the total production for this specific node
            const totalNodeProduction = (updatedNode.amount || 0) + (updatedNode.excess || 0);
            console.log(`[EXCESS DEBUG] Propagating node's total production of ${totalNodeProduction} through its children`);
            
            // Helper function to recursively update amounts in the chain
            const updateChildAmounts = (node: DependencyNode, amount: number) => {
              if (!node.children || node.children.length === 0) return;
              
              node.children.forEach(child => {
                if (!child.isImport && !child.importReference) {
                  // Only update non-import nodes
                  child.amount = amount;
                  console.log(`[EXCESS DEBUG] Updated node's child ${child.id} amount to ${amount}`);
                  
                  // Recursively update nested children
                  updateChildAmounts(child, amount);
                } else {
                  // Important fix for nested imports: update the amount of imported nodes too
                  child.amount = amount;
                  console.log(`[EXCESS DEBUG] Updated node's imported child ${child.id} amount to ${amount}`);
                  
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
                      console.log(`[EXCESS DEBUG] Updated imported tree ${importTargetTreeId} amount to ${amount}`);
                      
                      // Recursively update the imported tree's children as well
                      updateChildAmounts(state.dependencyTrees[importTargetTreeId], amount);
                    }
                  }
                }
              });
            };
            
            // Update all children of this specific node
            updateChildAmounts(updatedNode, totalNodeProduction);
          }
        }
      });
  }
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
