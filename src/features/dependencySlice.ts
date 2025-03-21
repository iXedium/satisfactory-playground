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
        console.log("Source node state before conversion:", JSON.stringify({
          id: sourceNode.id,
          uniqueId: sourceNode.uniqueId,
          amount: sourceNode.amount,
          isImport: sourceNode.isImport,
          originalAmount: sourceNode.originalAmount,
          importedFrom: sourceNode.importedFrom
        }));
        
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
            console.log("Target root tree found:", JSON.stringify({
              id: targetRoot.id,
              uniqueId: targetRoot.uniqueId,
              amount: targetRoot.amount,
              excess: targetRoot.excess
            }));
            
            // Get the original amount that was added to the target
            // If originalAmount is 0 or undefined, we need to determine a reasonable value to subtract
            // In a real scenario, we would never import a node with 0 amount, so if we see 0 here
            // it's likely a test case or edge case that we should handle carefully
            let originalAmount = sourceNode.originalAmount || 0;
            
            if (isUnimport) {
              console.log("Explicit unimport operation detected");
              // For explicit unimport operations, calculate the total amount needed by ALL remaining imports
              // This is a more reliable approach than just subtracting the original amount
              let totalRequiredAmount = 0;
              
              // Scan all trees for import nodes that refer to this target
              Object.values(state.dependencyTrees).forEach(tree => {
                const scanForImports = (node: DependencyNode) => {
                  // Skip the current node being unimported
                  if (node === sourceNode) return;
                  
                  if (node.isImport && node.importedFrom === sourceNode.importedFrom) {
                    totalRequiredAmount += node.amount;
                  }
                  
                  if (node.children) {
                    node.children.forEach(child => scanForImports(child));
                  }
                };
                
                scanForImports(tree);
              });
              
              console.log(`Calculated total required amount from remaining imports: ${totalRequiredAmount}`);
              console.log(`Current target tree amount: ${targetRoot.amount}`);
              
              // Update the target tree to match exactly what's needed by remaining imports
              targetRoot.amount = totalRequiredAmount;
              
              // If there are no more imports, explicitly force excess to 0 to ensure clean deletion
              if (totalRequiredAmount <= 0) {
                console.log(`No more imports required from tree ${sourceNode.importedFrom}, forcing excess to 0`);
                targetRoot.excess = 0;
              }
              
              console.log(`Setting target tree ${sourceNode.importedFrom} amount to exactly: ${totalRequiredAmount}`);
              
              // Check if target tree has any excess
              console.log(`Target tree excess: ${targetRoot.excess}`);
              console.log(`Target tree excess (via || 0): ${targetRoot.excess || 0}`);
              console.log(`Target tree excess type: ${typeof targetRoot.excess}`);
              
              // Force excess to be a number to avoid type issues
              const numericExcess = Number(targetRoot.excess || 0);
              console.log(`Target tree numeric excess: ${numericExcess}`);
              
              // Only delete the tree if it has no production (amount <= 0) AND no excess
              // If it has excess, we want to keep it even if the amount is zero
              if (targetRoot.amount <= 0 && numericExcess <= 0) {
                console.log(`Target tree ${sourceNode.importedFrom} has no production (${targetRoot.amount}) or excess (${numericExcess}), deleting it`);
                delete state.dependencyTrees[sourceNode.importedFrom];
              } else {
                console.log(`Target tree ${sourceNode.importedFrom} not deleted because:`);
                if (targetRoot.amount > 0) {
                  console.log(`- It still has a positive amount: ${targetRoot.amount}`);
                }
                if (numericExcess > 0) {
                  console.log(`- It still has excess: ${numericExcess}`);
                }
              }
            } else {
              // If we're unimporting but the originalAmount is 0, try to infer a more reasonable value
              // This is needed because in some scenarios (like tests), nodes might be imported with 0 amount
              if (originalAmount === 0) {
                // Try to determine a more meaningful amount from the current structure if possible
                // Here we look at the current children to see if they can guide us
                if (sourceNode.children && sourceNode.children.length > 0) {
                  // Sum up the amounts from children as a heuristic
                  originalAmount = sourceNode.children.reduce(
                    (sum, child) => sum + (child.amount || 0), 
                    0
                  );
                  console.log(`Calculated amount from children: ${originalAmount}`);
                }
                
                // If we still have 0, use a small default (e.g., 1) to ensure some subtraction happens
                if (originalAmount === 0) {
                  originalAmount = 1; // Minimal default to ensure some change
                  console.log(`Using minimal default amount: ${originalAmount}`);
                }
              }
              
              console.log(`Unimporting node with original amount: ${originalAmount}`);
              
              // Calculate the new amount - subtracting the source node's original amount
              // Make sure we don't go below 0
              const newAmount = Math.max(0, targetRoot.amount - originalAmount);
              console.log(`Updating target tree ${sourceNode.importedFrom} amount from ${targetRoot.amount} to ${newAmount}`);
              
              // Update the target tree's amount when un-importing
              targetRoot.amount = newAmount;
              
              // If there are no more imports, explicitly force excess to 0 to ensure clean deletion
              if (newAmount <= 0) {
                console.log(`Target tree amount is now 0, forcing excess to 0 to ensure proper cleanup`);
                targetRoot.excess = 0;
              }
              
              // Check for excess on the target tree
              console.log(`Target tree excess: ${targetRoot.excess}`);
              console.log(`Target tree excess (via || 0): ${targetRoot.excess || 0}`);
              console.log(`Target tree excess type: ${typeof targetRoot.excess}`);
              
              // Force excess to be a number to avoid type issues
              const numericExcess2 = Number(targetRoot.excess || 0);
              console.log(`Target tree numeric excess: ${numericExcess2}`);
              
              // Only delete the tree if it has no production (amount <= 0) AND no excess
              // If it has excess, we want to keep it even if the amount is zero
              if (targetRoot.amount <= 0 && numericExcess2 <= 0) {
                console.log(`Target tree ${sourceNode.importedFrom} has no production (${targetRoot.amount}) or excess (${numericExcess2}), deleting it`);
                delete state.dependencyTrees[sourceNode.importedFrom];
              } else {
                console.log(`Target tree ${sourceNode.importedFrom} not deleted because:`);
                if (targetRoot.amount > 0) {
                  console.log(`- It still has a positive amount: ${targetRoot.amount}`);
                }
                if (numericExcess2 > 0) {
                  console.log(`- It still has excess: ${numericExcess2}`);
                }
              }
            }
            delete sourceNode.importedFrom;
            delete sourceNode.originalAmount;
          } else {
            console.log(`Target tree ${sourceNode.importedFrom} not found for unimport operation`);
            delete sourceNode.importedFrom;
            delete sourceNode.originalAmount;
          }
        } else {
          console.log("No importedFrom reference found on source node during unimport");
        }
      } else {
        console.log("Converting to import node");
        // Convert to import node
        sourceNode.isImport = true;
        // Save original children
        sourceNode.originalChildren = [...(sourceNode.children || [])];
        // Store the original amount before clearing it
        sourceNode.originalAmount = sourceNode.amount;
        console.log(`Storing original amount: ${sourceNode.amount}`);
        // Clear children for import node
        sourceNode.children = [];

        // Only proceed with target tree operations if we have a valid target
        if (targetTree) {
          // Store the reference to the target tree
          sourceNode.importedFrom = targetTreeId;
          
          // If this is a newly created tree, we've already set the correct amount
          // so don't modify the target tree's amount
          if (!isNewTree) {
            // For existing trees, add the source node amount to the target tree
            const originalExcess = targetTree.excess || 0;
            // Make sure we're adding a meaningful amount (if originalAmount is 0, use a default calculation)
            const amountToAdd = sourceNode.originalAmount > 0 ? sourceNode.originalAmount : sourceNode.amount;
            const newAmount = targetTree.amount + amountToAdd;
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
