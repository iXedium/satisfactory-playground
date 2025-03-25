import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DependencyNode, restoreOriginalChildren } from "../utils/calculateDependencyTree";
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
          console.log("Restoring import node after source deletion:", node);
          
          // Create a copy of the node to work with
          const restoredNode = JSON.parse(JSON.stringify(node));
          
          // Remove import attributes
          restoredNode.isImport = false;
          delete restoredNode.importedFrom;
          
          // Check if we have stored structure information
          if (node.originalChildren && node.originalChildren.length > 0) {
            console.log("[DELETE TREE] Found stored structure information:", node.originalChildren);
            
            // Reconstruct the children using the stored structure info and current amounts
            restoredNode.children = node.originalChildren.map(childStructure => {
              // Calculate proportional amount based on parent's current amount
              const childNode = {
                id: childStructure.id,
                amount: node.amount, // Will be scaled by recipe in the calculation
                uniqueId: childStructure.uniqueId,
                selectedRecipeId: childStructure.recipeId,
                excess: childStructure.excess || 0,
                isImport: childStructure.isImport,
                importedFrom: childStructure.importedFrom,
                children: []
              };
              
              // If this child was itself an import, preserve that relationship
              // But only if the target tree isn't the one being deleted
              if (childStructure.isImport && childStructure.importedFrom && childStructure.importedFrom !== treeIdToDelete) {
                childNode.isImport = true;
                childNode.importedFrom = childStructure.importedFrom;
                childNode.children = [];
              }
              // Otherwise add any nested children
              else if (childStructure.children && childStructure.children.length > 0) {
                childNode.children = childStructure.children.map(grandchildStructure => ({
                  id: grandchildStructure.id,
                  amount: node.amount, // Will be scaled during next calculation
                  uniqueId: grandchildStructure.uniqueId,
                  selectedRecipeId: grandchildStructure.recipeId,
                  children: [],
                  excess: 0
                }));
              }
              
              return childNode;
            });
            
            console.log("[DELETE TREE] Reconstructed children from stored structure:", 
              JSON.stringify(restoredNode.children.map(c => ({
                id: c.id,
                amount: c.amount,
                isImport: c.isImport,
                childCount: c.children ? c.children.length : 0
              })))
            );
          } 
          // Fall back to old behavior if no structure info
          else if (node.originalChildren) {
            console.log("[DELETE TREE] Using legacy originalChildren restoration");
            restoredNode.children = node.originalChildren;
            delete restoredNode.originalChildren;
          } 
          // Fallback to generating from recipe if no children available
          else {
            console.log("[DELETE TREE] No children available for restoration");
            // Generate basic children based on item type
            // (Similar to our fallback in importNode)
            restoredNode.children = [];
          }
          
          // Replace the node in place
          Object.assign(node, restoredNode);
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

      // If this is import node, toggle import off
      if (sourceNode.isImport) {
        console.log("[UNIMPORT DEBUG] Toggling import off for node:", sourceNode.uniqueId);
        
        // Save the original children before making changes
        const originalChildren = sourceNode.originalChildren;
        console.log("[UNIMPORT DEBUG] Original children to restore:", originalChildren ? 
          JSON.stringify(originalChildren.map(child => ({
            id: child.id,
            amount: child.amount,
            hasChildren: child.children && child.children.length > 0
          }))) : 
          "undefined"
        );
        
        // Restore original children to this node
        console.log("[RESTORE DEBUG] Restoring original children for node:", sourceNode.id);
        
        try {
          // First, create a copy of the source node to work with
          const restoredNode = JSON.parse(JSON.stringify(sourceNode));
          
          // Remove import attributes
          restoredNode.isImport = false;
          delete restoredNode.importedFrom;
          
          // Check if we have stored structure information
          if (sourceNode.originalChildren && sourceNode.originalChildren.length > 0) {
            console.log("[UNIMPORT DEBUG] Found stored structure information:", sourceNode.originalChildren);
            
            // Reconstruct the children using the stored structure info and current amounts
            restoredNode.children = sourceNode.originalChildren.map(childStructure => {
              // Calculate proportional amount based on parent's current amount
              const childNode = {
                id: childStructure.id,
                amount: sourceNode.amount, // Will be scaled by recipe in the calculation
                uniqueId: childStructure.uniqueId,
                selectedRecipeId: childStructure.recipeId,
                excess: childStructure.excess || 0,
                isImport: childStructure.isImport,
                importedFrom: childStructure.importedFrom,
                children: []
              };
              
              // If this child was itself an import, preserve that relationship
              if (childStructure.isImport && childStructure.importedFrom) {
                childNode.isImport = true;
                childNode.importedFrom = childStructure.importedFrom;
                childNode.children = [];
              }
              // Otherwise add any nested children
              else if (childStructure.children && childStructure.children.length > 0) {
                childNode.children = childStructure.children.map(grandchildStructure => ({
                  id: grandchildStructure.id,
                  amount: sourceNode.amount, // Will be scaled during next calculation
                  uniqueId: grandchildStructure.uniqueId,
                  selectedRecipeId: grandchildStructure.recipeId,
                  children: [],
                  excess: 0
                }));
              }
              
              return childNode;
            });
            
            console.log("[UNIMPORT DEBUG] Reconstructed children from stored structure:", 
              JSON.stringify(restoredNode.children.map(c => ({
                id: c.id,
                amount: c.amount,
                isImport: c.isImport,
                childCount: c.children ? c.children.length : 0
              })))
            );
          } 
          // Fallback to generating from recipe if no structure info is available
          else {
            console.log("[UNIMPORT DEBUG] No stored structure information, will generate from recipe");
            
            // Find the recipe for this item to generate children
            const generateChildrenFromRecipe = () => {
              // Since we can't make async calls here, we need to create basic children
              const recipeId = sourceNode.selectedRecipeId || `recipe_${sourceNode.id}`;
              console.log(`[UNIMPORT DEBUG] Generating children from recipe ${recipeId} for ${sourceNode.id} with amount ${sourceNode.amount}`);
              
              // Normalize the item name format to use underscores consistently
              const normalizeId = (id: string) => id.replace(/-/g, '_');
              const normalizedNodeId = normalizeId(sourceNode.id);
              
              // For iron_ingot, create iron_ore child
              if (normalizedNodeId === "iron_ingot") {
                return [{
                  id: "iron_ore",
                  amount: sourceNode.amount,
                  uniqueId: `${sourceNode.uniqueId}-iron_ore-generated`,
                  children: [],
                  excess: 0
                }];
              }
              
              // For other common recipes, create basic children
              // This is not ideal, but better than losing the chain completely
              if (normalizedNodeId === "iron_rod") {
                return [{
                  id: "iron_ingot",
                  amount: sourceNode.amount,
                  uniqueId: `${sourceNode.uniqueId}-iron_ingot-generated`,
                  children: [],
                  excess: 0
                }];
              }
              
              // For other items, make more intelligent guesses based on item ID
              // Extract the base material from items like "copper-sheet", "steel-pipe", etc.
              const idParts = normalizedNodeId.split('_');
              if (idParts.length > 1) {
                const baseMaterial = idParts[0];
                // Common base materials
                if (["iron", "copper", "steel", "aluminum", "concrete", "plastic", "rubber"].includes(baseMaterial)) {
                  return [{
                    id: `${baseMaterial}_ingot`,
                    amount: sourceNode.amount,
                    uniqueId: `${sourceNode.uniqueId}-${baseMaterial}_ingot-generated`,
                    children: [],
                    excess: 0
                  }];
                }
              }
              
              // Default empty array for unknown recipes
              console.log(`[UNIMPORT DEBUG] Could not generate children for unknown recipe ${recipeId}`);
              return [];
            };
            
            try {
              restoredNode.children = generateChildrenFromRecipe();
              delete restoredNode.originalChildren;
              
              console.log("[UNIMPORT DEBUG] Generated backup children:", JSON.stringify(restoredNode.children));
            } catch (error) {
              console.error("[UNIMPORT ERROR] Failed to generate children from recipe:", error);
              // Fallback to empty children array if generation fails
              restoredNode.children = [];
            }
          }
          
          // After the restoredNode has been fully constructed, add back the logging:
          console.log("[UNIMPORT DEBUG] Restored node structure:", JSON.stringify({
            id: restoredNode.id,
            amount: restoredNode.amount,
            children: restoredNode.children?.map((c: any) => ({
              id: c.id,
              amount: c.amount,
              hasChildren: c.children && c.children.length > 0
            })),
            isImport: restoredNode.isImport
          }));
          
          // Find and replace this node in the tree
          const result = findAndReplaceNode(state.dependencyTrees[sourceTreeId], sourceNode.uniqueId, restoredNode);
          
          if (result) {
            console.log("[UNIMPORT DEBUG] Node replacement successful");
          } else {
            console.error("[UNIMPORT DEBUG] Failed to replace node in tree");
          }
          
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
          
          console.log("[UNIMPORT DEBUG] Final node structure in tree:", JSON.stringify({
            id: restoredNode.id,
            amount: restoredNode.amount,
            children: restoredNode.children?.map((c: any) => ({
              id: c.id,
              amount: c.amount,
              hasChildren: c.hasChildren || !!c.children?.length
            })),
            isImport: restoredNode.isImport
          }));
        } catch (error) {
          console.error("[UNIMPORT ERROR] Critical error during unimport process:", error);
        }
      } else {
        console.log("Converting to import node");
        // Convert to import node
        sourceNode.isImport = true;
        
        // Store minimized original structure with recipe info rather than full node structure with amounts
        if (sourceNode.children && sourceNode.children.length > 0) {
          console.log("[IMPORT DEBUG] Storing recipe and structure info for children");
          
          // Store minimal information needed to reconstruct the node structure
          sourceNode.originalChildren = sourceNode.children.map(child => ({
            id: child.id,
            recipeId: child.selectedRecipeId,
            uniqueId: child.uniqueId,
            isImport: child.isImport,
            importedFrom: child.importedFrom,
            excess: child.excess || 0,
            // Recursively store structure for nested children if they exist
            children: child.children && child.children.length > 0 ? 
              child.children.map(grandchild => ({
                id: grandchild.id,
                recipeId: grandchild.selectedRecipeId,
                uniqueId: grandchild.uniqueId
              })) : []
          }));
          
          console.log("[IMPORT DEBUG] Stored structural information:", JSON.stringify(sourceNode.originalChildren));
        } else {
          console.log("[IMPORT DEBUG] No children to store structural information for");
          sourceNode.originalChildren = [];
        }
        
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
          // Preserve the excess value when setting up the import relationship
          const currentExcess = targetTree.excess || 0;
          targetTree.amount += sourceNode.amount;
          // Maintain the excess value
          targetTree.excess = currentExcess;
          
          sourceNode.importedFrom = targetTreeId;
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
    }
  },
});

export const { 
  setDependencies, 
  deleteTree, 
  updateAccumulated, 
  importNode, 
  loadSavedState,
  updateNodeProperties
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
