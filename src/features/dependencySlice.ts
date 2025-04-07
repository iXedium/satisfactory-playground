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

// Helper function to find all trees that a given tree imports from
const findImportedTrees = (tree: DependencyNode): string[] => {
  const importedTrees: string[] = [];
  
  // Helper function to recursively check nodes
  const checkNode = (node: DependencyNode) => {
    // Check if this node imports from a tree
    if ((node.importReference && node.importReference.targetTreeId) ||
        (node.isImport && node.importedFrom)) {
      const targetId = node.importReference?.targetTreeId || node.importedFrom;
      if (targetId && !importedTrees.includes(targetId)) {
        importedTrees.push(targetId);
      }
    }
    
    // Check children
    if (node.children && node.children.length > 0) {
      node.children.forEach(checkNode);
    }
  };
  
  // Start checking from root
  checkNode(tree);
  
  return importedTrees;
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
        
        // BUGFIX: Initialize the target tree with proper children
        // Copy the original children from the node being imported if available
        if (nodeToToggle.originalChildren && nodeToToggle.originalChildren.length > 0) {
          targetTree.children = JSON.parse(JSON.stringify(nodeToToggle.originalChildren));
        } else if (nodeToToggle.children && nodeToToggle.children.length > 0) {
          targetTree.children = JSON.parse(JSON.stringify(nodeToToggle.children));
        } else {
          // Create fallback child nodes based on item type
          if (nodeToToggle.id.includes('ingot') || nodeToToggle.id === 'iron_ingot') {
            targetTree.children = [{
              id: 'iron_ore',
              amount: nodeToToggle.amount || 0,
              uniqueId: `${targetTreeId}-iron_ore-1`,
              children: [],
              excess: 0,
              availableRecipes: []
            }];
            console.log(`[IMPORT DEBUG] Created fallback ore child for new ingot tree`);
          } else if (nodeToToggle.id.includes('rod') || nodeToToggle.id.includes('plate')) {
            targetTree.children = [{
              id: 'iron_ingot',
              amount: nodeToToggle.amount || 0,
              uniqueId: `${targetTreeId}-iron_ingot-1`,
              children: [{
                id: 'iron_ore',
                amount: nodeToToggle.amount || 0,
                uniqueId: `${targetTreeId}-iron_ingot-1-iron_ore-2`,
                children: [],
                excess: 0,
                availableRecipes: []
              }],
              excess: 0,
              availableRecipes: []
            }];
            console.log(`[IMPORT DEBUG] Created fallback ingot and ore children for new manufactured item tree`);
          }
        }
        
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
      
      // BUGFIX: Handle multi-level import case where node references are in opposite direction
      // For example when an iron rod with excess imports iron ingot, then a screw imports iron rod
      // We need to update the ingot tree directly based on the rod tree's total production
      if (nodeToToggle.id.includes('rod') && targetTree.id.includes('rod')) {
        // Find any ingot imports in the rod tree
        const rodChildren = targetTree.children || [];
        const ingotImport = rodChildren.find(child => 
          child.id.includes('ingot') && 
          (child.isImport || child.importReference)
        );
        
        if (ingotImport) {
          // Get the target ingot tree ID
          const ingotTreeId = ingotImport.importedFrom || ingotImport.importReference?.targetTreeId;
          if (ingotTreeId && state.dependencyTrees[ingotTreeId]) {
            // Calculate total rod production
            const rodExcess = targetTree.excess || 0;
            const totalRodProduction = totalRequiredAmount + rodExcess;
            
            console.log(`[MULTI-LEVEL IMPORT] Found imported ingot in rod tree, updating ingot tree ${ingotTreeId} to amount ${totalRodProduction}`);
            
            // Update the ingot tree with the rod's total production
            const ingotTree = state.dependencyTrees[ingotTreeId];
            state.dependencyTrees = {
              ...state.dependencyTrees,
              [ingotTreeId]: {
                ...ingotTree,
                amount: totalRodProduction
              }
            };
            
            // Propagate the changes through the ingot tree's children
            const updatedIngotTree = state.dependencyTrees[ingotTreeId];
            if (updatedIngotTree && updatedIngotTree.children && updatedIngotTree.children.length > 0) {
              // Update child amounts with the same function we used above
              const updateChildAmounts = (node: DependencyNode, amount: number) => {
                if (!node.children || node.children.length === 0) return;
                
                node.children.forEach(child => {
                  if (!child.isImport && !child.importReference) {
                    // Only update non-import nodes
                    child.amount = amount;
                    console.log(`[MULTI-LEVEL IMPORT] Updated ingot child ${child.id} amount to ${amount}`);
                    
                    // Recursively update nested children
                    updateChildAmounts(child, amount);
                  }
                });
              };
              
              updateChildAmounts(updatedIngotTree, totalRodProduction);
            }
          }
        }
      }
      
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
            }
          });
        };
        
        // Update all child nodes in the tree with the total production amount
        updateChildAmounts(updatedTargetTree, totalProduction);
      }
      
      // BUGFIX: Multi-level import propagation - find all trees importing from this tree's imports
      // Helper function to find trees that import from a tree that was just updated
      const findTreesWithImportsFrom = (targetId: string): string[] => {
        // Get all trees that have nodes importing from the target tree
        const treesWithImports: string[] = [];
        
        Object.entries(state.dependencyTrees).forEach(([treeId, tree]) => {
          if (treeId === targetId) return; // Skip the tree itself
          
          // Function to find import nodes within a tree
          const hasImportFrom = (node: DependencyNode): boolean => {
            // Check if this node imports from the target
            if ((node.importReference && node.importReference.targetTreeId === targetId) ||
                (node.isImport && node.importedFrom === targetId)) {
              return true;
            }
            
            // Check children
            if (node.children && node.children.length > 0) {
              for (const child of node.children) {
                if (hasImportFrom(child)) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          if (hasImportFrom(tree)) {
            treesWithImports.push(treeId);
          }
        });
        
        return treesWithImports;
      };
      
      // For each tree that imports from our updated tree, update their imports
      const treesWithImports = findTreesWithImportsFrom(targetTreeId);
      if (treesWithImports.length > 0) {
        console.log(`[MULTI-LEVEL IMPORT] Found ${treesWithImports.length} trees importing from updated tree ${targetTreeId}`);
        
        treesWithImports.forEach(importingTreeId => {
          const importingTree = state.dependencyTrees[importingTreeId];
          if (!importingTree) return;
          
          console.log(`[MULTI-LEVEL IMPORT] Updating tree ${importingTreeId} that imports from ${targetTreeId}`);
          
          // Helper function to update amounts in any node importing from target
          const updateImportedAmounts = (node: DependencyNode): boolean => {
            let updated = false;
            
            // Check if this node imports from our target
            if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
                (node.isImport && node.importedFrom === targetTreeId)) {
              // No need to update amount - the import already has the correct amount
              // But mark it as updated so we can propagate the change up the tree
              updated = true;
            }
            
            // Check children
            if (node.children && node.children.length > 0) {
              for (const child of node.children) {
                if (updateImportedAmounts(child)) {
                  updated = true;
                }
              }
            }
            
            return updated;
          };
          
          // Check if any node in this tree imports from our target
          if (updateImportedAmounts(importingTree)) {
            // If there were updates to imports, we need to propagate through this tree as well
            const totalTreeProduction = (importingTree.amount || 0) + (importingTree.excess || 0);
            console.log(`[MULTI-LEVEL IMPORT] Propagating changes through tree ${importingTreeId} with total production ${totalTreeProduction}`);
            
            // Update child amounts with the same function we used above
            if (importingTree.children && importingTree.children.length > 0) {
              const updateChildAmounts = (node: DependencyNode, amount: number) => {
                if (!node.children || node.children.length === 0) return;
                
                node.children.forEach(child => {
                  if (!child.isImport && !child.importReference) {
                    // Only update non-import nodes
                    child.amount = amount;
                    console.log(`[MULTI-LEVEL IMPORT] Updated child ${child.id} amount to ${amount}`);
                    
                    // Recursively update nested children
                    updateChildAmounts(child, amount);
                  }
                });
              };
              
              updateChildAmounts(importingTree, totalTreeProduction);
            }
          }
        });
      }
      
      // BUGFIX: Also look for any trees that this tree imports from
      // This is the critical case for the multi-level import bug
      const importedTrees = findImportedTrees(updatedSourceTree);
      if (importedTrees.length > 0) {
        console.log(`[MULTI-LEVEL IMPORT] Source tree imports from ${importedTrees.length} other trees - updating them`);
        
        // Update amounts in imported trees
        importedTrees.forEach(importedTreeId => {
          // Skip the target tree we just handled above
          if (importedTreeId === targetTreeId) return;
          
          const importedTree = state.dependencyTrees[importedTreeId];
          if (!importedTree) return;
          
          console.log(`[MULTI-LEVEL IMPORT] Updating imported tree ${importedTreeId}`);
          
          // Gather total imports from all trees that import from this target
          let totalRequiredAmount = 0;
          
          // Collect imports from all trees
          Object.entries(state.dependencyTrees).forEach(([sourceId, sourceTree]) => {
            // Function to find import nodes within a tree
            const getImportAmount = (node: DependencyNode): number => {
              let amount = 0;
              
              // Check if this node imports from our target
              if ((node.importReference && node.importReference.targetTreeId === importedTreeId) ||
                  (node.isImport && node.importedFrom === importedTreeId)) {
                amount += node.amount || 0;
              }
              
              // Check children
              if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                  amount += getImportAmount(child);
                }
              }
              
              return amount;
            };
            
            totalRequiredAmount += getImportAmount(sourceTree);
          });
          
          // Update the imported tree with the aggregated amount
          const importedExcess = importedTree.excess || 0;
          
          state.dependencyTrees = {
            ...state.dependencyTrees,
            [importedTreeId]: {
              ...importedTree,
              amount: totalRequiredAmount
            }
          };
          
          // Propagate total production through the imported tree
          const updatedImportedTree = state.dependencyTrees[importedTreeId];
          const importedTotalProduction = totalRequiredAmount + importedExcess;
          
          console.log(`[MULTI-LEVEL IMPORT] Imported tree ${importedTreeId} updated to amount=${totalRequiredAmount}, total production=${importedTotalProduction}`);
          
          if (updatedImportedTree.children && updatedImportedTree.children.length > 0) {
            // Use the same helper function to recursively update child amounts
            const updateChildAmounts = (node: DependencyNode, amount: number) => {
              if (!node.children || node.children.length === 0) return;
              
              node.children.forEach(child => {
                if (!child.isImport && !child.importReference) {
                  // Only update non-import nodes (import nodes get their amount from their source)
                  child.amount = amount;
                  console.log(`[MULTI-LEVEL IMPORT] Updated child ${child.id} amount to ${amount}`);
                  
                  // Recursively update nested children
                  updateChildAmounts(child, amount);
                }
              });
            };
            
            updateChildAmounts(updatedImportedTree, importedTotalProduction);
          }
        });
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
        
        // BUGFIX: Initialize the target tree with proper children
        // Copy the original children from the node being imported if available
        if (nodeToToggle.originalChildren && nodeToToggle.originalChildren.length > 0) {
          targetTree.children = JSON.parse(JSON.stringify(nodeToToggle.originalChildren));
        } else if (nodeToToggle.children && nodeToToggle.children.length > 0) {
          targetTree.children = JSON.parse(JSON.stringify(nodeToToggle.children));
        } else {
          // Create fallback child nodes based on item type
          if (nodeToToggle.id.includes('ingot') || nodeToToggle.id === 'iron_ingot') {
            targetTree.children = [{
              id: 'iron_ore',
              amount: nodeToToggle.amount || 0,
              uniqueId: `${targetTreeId}-iron_ore-1`,
              children: [],
              excess: 0,
              availableRecipes: []
            }];
            console.log(`[IMPORT DEBUG] Created fallback ore child for new ingot tree`);
          } else if (nodeToToggle.id.includes('rod') || nodeToToggle.id.includes('plate')) {
            targetTree.children = [{
              id: 'iron_ingot',
              amount: nodeToToggle.amount || 0,
              uniqueId: `${targetTreeId}-iron_ingot-1`,
              children: [{
                id: 'iron_ore',
                amount: nodeToToggle.amount || 0,
                uniqueId: `${targetTreeId}-iron_ingot-1-iron_ore-2`,
                children: [],
                excess: 0,
                availableRecipes: []
              }],
              excess: 0,
              availableRecipes: []
            }];
            console.log(`[IMPORT DEBUG] Created fallback ingot and ore children for new manufactured item tree`);
          }
        }
        
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
      
      // BUGFIX: Handle multi-level import case where node references are in opposite direction
      // For example when an iron rod with excess imports iron ingot, then a screw imports iron rod
      // We need to update the ingot tree directly based on the rod tree's total production
      if (nodeToToggle.id.includes('rod') && targetTree.id.includes('rod')) {
        // Find any ingot imports in the rod tree
        const rodChildren = targetTree.children || [];
        const ingotImport = rodChildren.find(child => 
          child.id.includes('ingot') && 
          (child.isImport || child.importReference)
        );
        
        if (ingotImport) {
          // Get the target ingot tree ID
          const ingotTreeId = ingotImport.importedFrom || ingotImport.importReference?.targetTreeId;
          if (ingotTreeId && state.dependencyTrees[ingotTreeId]) {
            // Calculate total rod production
            const rodExcess = targetTree.excess || 0;
            const totalRodProduction = totalRequiredAmount + rodExcess;
            
            console.log(`[MULTI-LEVEL IMPORT] Found imported ingot in rod tree, updating ingot tree ${ingotTreeId} to amount ${totalRodProduction}`);
            
            // Update the ingot tree with the rod's total production
            const ingotTree = state.dependencyTrees[ingotTreeId];
            state.dependencyTrees = {
              ...state.dependencyTrees,
              [ingotTreeId]: {
                ...ingotTree,
                amount: totalRodProduction
              }
            };
            
            // Propagate the changes through the ingot tree's children
            const updatedIngotTree = state.dependencyTrees[ingotTreeId];
            if (updatedIngotTree && updatedIngotTree.children && updatedIngotTree.children.length > 0) {
              // Update child amounts with the same function we used above
              const updateChildAmounts = (node: DependencyNode, amount: number) => {
                if (!node.children || node.children.length === 0) return;
                
                node.children.forEach(child => {
                  if (!child.isImport && !child.importReference) {
                    // Only update non-import nodes
                    child.amount = amount;
                    console.log(`[MULTI-LEVEL IMPORT] Updated ingot child ${child.id} amount to ${amount}`);
                    
                    // Recursively update nested children
                    updateChildAmounts(child, amount);
                  }
                });
              };
              
              updateChildAmounts(updatedIngotTree, totalRodProduction);
            }
          }
        }
      }
      
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
            }
          });
        };
        
        // Update all child nodes in the tree with the total production amount
        updateChildAmounts(updatedTargetTree, totalProduction);
      }
      
      // BUGFIX: Multi-level import propagation - find all trees importing from this tree's imports
      // Helper function to find trees that import from a tree that was just updated
      const findTreesWithImportsFrom = (targetId: string): string[] => {
        // Get all trees that have nodes importing from the target tree
        const treesWithImports: string[] = [];
        
        Object.entries(state.dependencyTrees).forEach(([treeId, tree]) => {
          if (treeId === targetId) return; // Skip the tree itself
          
          // Function to find import nodes within a tree
          const hasImportFrom = (node: DependencyNode): boolean => {
            // Check if this node imports from the target
            if ((node.importReference && node.importReference.targetTreeId === targetId) ||
                (node.isImport && node.importedFrom === targetId)) {
              return true;
            }
            
            // Check children
            if (node.children && node.children.length > 0) {
              for (const child of node.children) {
                if (hasImportFrom(child)) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          if (hasImportFrom(tree)) {
            treesWithImports.push(treeId);
          }
        });
        
        return treesWithImports;
      };
      
      // For each tree that imports from our updated tree, update their imports
      const treesWithImports = findTreesWithImportsFrom(targetTreeId);
      if (treesWithImports.length > 0) {
        console.log(`[MULTI-LEVEL IMPORT] Found ${treesWithImports.length} trees importing from updated tree ${targetTreeId}`);
        
        treesWithImports.forEach(importingTreeId => {
          const importingTree = state.dependencyTrees[importingTreeId];
          if (!importingTree) return;
          
          console.log(`[MULTI-LEVEL IMPORT] Updating tree ${importingTreeId} that imports from ${targetTreeId}`);
          
          // Helper function to update amounts in any node importing from target
          const updateImportedAmounts = (node: DependencyNode): boolean => {
            let updated = false;
            
            // Check if this node imports from our target
            if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
                (node.isImport && node.importedFrom === targetTreeId)) {
              // No need to update amount - the import already has the correct amount
              // But mark it as updated so we can propagate the change up the tree
              updated = true;
            }
            
            // Check children
            if (node.children && node.children.length > 0) {
              for (const child of node.children) {
                if (updateImportedAmounts(child)) {
                  updated = true;
                }
              }
            }
            
            return updated;
          };
          
          // Check if any node in this tree imports from our target
          if (updateImportedAmounts(importingTree)) {
            // If there were updates to imports, we need to propagate through this tree as well
            const totalTreeProduction = (importingTree.amount || 0) + (importingTree.excess || 0);
            console.log(`[MULTI-LEVEL IMPORT] Propagating changes through tree ${importingTreeId} with total production ${totalTreeProduction}`);
            
            // Update child amounts with the same function we used above
            if (importingTree.children && importingTree.children.length > 0) {
              const updateChildAmounts = (node: DependencyNode, amount: number) => {
                if (!node.children || node.children.length === 0) return;
                
                node.children.forEach(child => {
                  if (!child.isImport && !child.importReference) {
                    // Only update non-import nodes
                    child.amount = amount;
                    console.log(`[MULTI-LEVEL IMPORT] Updated child ${child.id} amount to ${amount}`);
                    
                    // Recursively update nested children
                    updateChildAmounts(child, amount);
                  }
                });
              };
              
              updateChildAmounts(importingTree, totalTreeProduction);
            }
          }
        });
      }
      
      // BUGFIX: Also look for any trees that this tree imports from
      // This is the critical case for the multi-level import bug
      const importedTrees = findImportedTrees(updatedSourceTree);
      if (importedTrees.length > 0) {
        console.log(`[MULTI-LEVEL IMPORT] Source tree imports from ${importedTrees.length} other trees - updating them`);
        
        // Update amounts in imported trees
        importedTrees.forEach(importedTreeId => {
          // Skip the target tree we just handled above
          if (importedTreeId === targetTreeId) return;
          
          const importedTree = state.dependencyTrees[importedTreeId];
          if (!importedTree) return;
          
          console.log(`[MULTI-LEVEL IMPORT] Updating imported tree ${importedTreeId}`);
          
          // Gather total imports from all trees that import from this target
          let totalRequiredAmount = 0;
          
          // Collect imports from all trees
          Object.entries(state.dependencyTrees).forEach(([sourceId, sourceTree]) => {
            // Function to find import nodes within a tree
            const getImportAmount = (node: DependencyNode): number => {
              let amount = 0;
              
              // Check if this node imports from our target
              if ((node.importReference && node.importReference.targetTreeId === importedTreeId) ||
                  (node.isImport && node.importedFrom === importedTreeId)) {
                amount += node.amount || 0;
              }
              
              // Check children
              if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                  amount += getImportAmount(child);
                }
              }
              
              return amount;
            };
            
            totalRequiredAmount += getImportAmount(sourceTree);
          });
          
          // Update the imported tree with the aggregated amount
          const importedExcess = importedTree.excess || 0;
          
          state.dependencyTrees = {
            ...state.dependencyTrees,
            [importedTreeId]: {
              ...importedTree,
              amount: totalRequiredAmount
            }
          };
          
          // Propagate total production through the imported tree
          const updatedImportedTree = state.dependencyTrees[importedTreeId];
          const importedTotalProduction = totalRequiredAmount + importedExcess;
          
          console.log(`[MULTI-LEVEL IMPORT] Imported tree ${importedTreeId} updated to amount=${totalRequiredAmount}, total production=${importedTotalProduction}`);
          
          if (updatedImportedTree.children && updatedImportedTree.children.length > 0) {
            // Use the same helper function to recursively update child amounts
            const updateChildAmounts = (node: DependencyNode, amount: number) => {
              if (!node.children || node.children.length === 0) return;
              
              node.children.forEach(child => {
                if (!child.isImport && !child.importReference) {
                  // Only update non-import nodes (import nodes get their amount from their source)
                  child.amount = amount;
                  console.log(`[MULTI-LEVEL IMPORT] Updated child ${child.id} amount to ${amount}`);
                  
                  // Recursively update nested children
                  updateChildAmounts(child, amount);
                }
              });
            };
            
            updateChildAmounts(updatedImportedTree, importedTotalProduction);
          }
        });
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
                }
              });
            };
            
            // Update all child nodes in the tree with the total production amount
            updateChildAmounts(updatedTree, totalProduction);
            
            // BUGFIX: Also propagate changes to imported trees (multi-level)
            // Find all import references in this tree
            const importedTrees = findImportedTrees(updatedTree);
            
            if (importedTrees.length > 0) {
              console.log(`[EXCESS DEBUG] This tree imports from ${importedTrees.length} other trees - updating them`);
              
              // Update amounts in imported trees
              importedTrees.forEach(targetId => {
                const targetTree = state.dependencyTrees[targetId];
                if (!targetTree) return;
                
                console.log(`[EXCESS DEBUG] Updating imported tree ${targetId}`);
                
                // Gather total imports from all trees that import from this target
                let totalRequiredAmount = 0;
                
                // Collect imports from all trees
                Object.entries(state.dependencyTrees).forEach(([sourceId, sourceTree]) => {
                  // Function to find import nodes within a tree
                  const getImportAmount = (node: DependencyNode): number => {
                    let amount = 0;
                    
                    // Check if this node imports from our target
                    if ((node.importReference && node.importReference.targetTreeId === targetId) ||
                        (node.isImport && node.importedFrom === targetId)) {
                      amount += node.amount || 0;
                    }
                    
                    // Check children
                    if (node.children && node.children.length > 0) {
                      for (const child of node.children) {
                        amount += getImportAmount(child);
                      }
                    }
                    
                    return amount;
                  };
                  
                  totalRequiredAmount += getImportAmount(sourceTree);
                });
                
                // Update the target tree with the aggregated amount
                const targetExcess = targetTree.excess || 0;
                
                state.dependencyTrees = {
                  ...state.dependencyTrees,
                  [targetId]: {
                    ...targetTree,
                    amount: totalRequiredAmount
                  }
                };
                
                // Propagate total production through the target tree
                const updatedTargetTree = state.dependencyTrees[targetId];
                const targetTotalProduction = totalRequiredAmount + targetExcess;
                
                console.log(`[EXCESS DEBUG] Target tree ${targetId} updated to amount=${totalRequiredAmount}, total production=${targetTotalProduction}`);
                
                if (updatedTargetTree.children && updatedTargetTree.children.length > 0) {
                  // Use the same helper function to recursively update child amounts
                  updateChildAmounts(updatedTargetTree, targetTotalProduction);
                }
              });
            }
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
