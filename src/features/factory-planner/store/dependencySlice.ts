/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSlice, PayloadAction, createAction } from "@reduxjs/toolkit";
import { DependencyNode, Recipe } from "../../../types";
import { AccumulatedNode, calculateAccumulatedFromTree, findNodeById } from "../../../utils";
import { 
  clearImportReference, 
  getImportReference, 
} from "../../../utils/nodeReferenceUtils";
import { getRecipeById, getRecipeByOutput } from "../../../data";
import { AppDispatch } from "../../../store";
import {
  handleNodeImportReducer,
} from './importExportLogic';
import {
  productionSliceExtraReducers,
  calculateAffectedNodes,
} from './productionUpdateLogic';
import type { AffectedNodeUpdate } from './productionUpdateLogic';
import { logger } from '../../../utils/logger';

// --- Define Actions needed by thunks/reducers --- 
// Moved from importExportLogic.ts to break circular dependency
export const importNodeAction = createAction<{
  nodeId: string;
  targetTreeId: string;
  sourceTreeId: string;
  shouldImport: boolean;
}>('dependency/importNode');

// This simple action is likely unused now that unimportNodeThunk handles the logic
// export const unimportNode = createAction<{ ... }>('dependency/unimportNode'); 

// Action dispatched by destroyNodeRecursiveThunk
export const removeNodeAction = createAction<string>('dependency/removeNode');
// -------------------------------------------------

interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;  // Map of treeId to DependencyNode
  accumulatedDependencies: Record<string, AccumulatedNode>;
  highlightedNodeId: string | null;  // Node ID to highlight (e.g., when hovering import)
  manualTreeOrder: string[]; // Manual display order for root trees
  externalImports: Record<string, true>; // Items sourced from external imports (no local root)
  // Additional properties for better state management
  errors: string[]; // Track errors like circular references
  lastUpdateTime: number;
}

// Export the state interface for use in tests
export type { DependencyState };

const initialState: DependencyState = {
  dependencyTrees: {},
  accumulatedDependencies: {},
  highlightedNodeId: null,
  manualTreeOrder: [],
  externalImports: {},
  errors: [],
  lastUpdateTime: 0
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
      node.children.forEach((child: DependencyNode) => checkNode(child));
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
        treeId: string;
        tree: DependencyNode;
        // Remove accumulated from payload, we will calculate it here
      }>
    ) => {
      const { treeId, tree } = action.payload;
      
      // Direct mutation for the specific tree using Immer
      state.dependencyTrees[treeId] = tree;
      
      // Recalculate the *entire* accumulated state after adding/updating a tree
      const newAccumulated: Record<string, AccumulatedNode> = {};
      Object.values(state.dependencyTrees).forEach(currentTree => {
          const treeAccumulated = calculateAccumulatedFromTree(currentTree);
          // Merge accumulations (handle potential overlaps if needed, though unlikely with roots)
          Object.assign(newAccumulated, treeAccumulated);
      });
      state.accumulatedDependencies = newAccumulated;
      state.lastUpdateTime = Date.now();
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
              node.children.forEach((child: DependencyNode) => checkNode(child, currentTree));
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
      state.lastUpdateTime = Date.now();
    },
    
    updateAccumulated: (
      state,
      action: PayloadAction<Record<string, AccumulatedNode>>
    ) => {
      state.accumulatedDependencies = action.payload;
      state.lastUpdateTime = Date.now();
    },

    setManualTreeOrder: (
      state,
      action: PayloadAction<string[]>
    ) => {
      state.manualTreeOrder = action.payload;
    },
    
    loadSavedState: (state, action: PayloadAction<Partial<DependencyState>>) => {
      // Replace the entire state with the saved state, filling in defaults for
      // fields that may be missing from older saves.
      const p = action.payload;
      return {
        dependencyTrees: p.dependencyTrees || {},
        accumulatedDependencies: p.accumulatedDependencies || {},
        highlightedNodeId: p.highlightedNodeId ?? null,
        manualTreeOrder: p.manualTreeOrder || [],
        externalImports: p.externalImports || {},
        errors: p.errors || [],
        lastUpdateTime: p.lastUpdateTime ?? 0,
      };
    },
    
    toggleNodeSelected: (
      state,
      action: PayloadAction<{ treeId: string; nodeId: string }>
    ) => {
      const { treeId, nodeId } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (tree) {
        const node = findNodeById(tree, nodeId);
        if (node) {
          node.isSelected = !node.isSelected;
        }
      }
    },

    toggleNodeCompleted: (
      state,
      action: PayloadAction<{ treeId: string; nodeId: string }>
    ) => {
      const { treeId, nodeId } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (tree) {
        const node = findNodeById(tree, nodeId);
        if (node) {
          node.isCompleted = !node.isCompleted;
          // If marking as completed, optionally unmark as selected
          // if (node.isCompleted && node.isSelected) {
          //   node.isSelected = false;
          // }
        }
      }
    },
    
    setHighlightedNode: (
      state,
      action: PayloadAction<string | null>
    ) => {
      state.highlightedNodeId = action.payload;
    },

    setExternalImports: (
      state,
      action: PayloadAction<{ itemId: string; value: boolean }>
    ) => {
      if (action.payload.value) {
        state.externalImports[action.payload.itemId] = true;
      } else {
        delete state.externalImports[action.payload.itemId];
      }
    },

    // ------------------------------------------------------------------
    // Synchronous excess cascade — sets node.excess then walks all children
    // recalculating their amounts based on recipe ratios in a single Immer pass.
    // ------------------------------------------------------------------
    cascadeExcessUpdate: (
      state,
      action: PayloadAction<{ nodeId: string; treeId: string; excess: number }>
    ) => {
      const { nodeId, treeId, excess } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (!tree) return;

      const recalcChildren = (node: DependencyNode): void => {
        if (!node.recipe || !node.children || node.children.length === 0) return;
        const totalProduction = (node.amount || 0) + (node.excess || 0);
        const outputAmount = node.recipe.out[node.id] || 1;
        const cyclesNeeded = totalProduction / outputAmount;

        for (const child of node.children) {
          let childAmount: number;
          if (child.isByproduct) {
            const recipeOutputAmount = node.recipe.out[child.id] || 0;
            childAmount = -(recipeOutputAmount * cyclesNeeded);
          } else {
            const recipeInputAmount = node.recipe.in[child.id] || 0;
            childAmount = recipeInputAmount * cyclesNeeded;
          }

          if (childAmount !== child.amount) {
            child.amount = childAmount;
            recalcChildren(child);
          }
        }
      };

      const findAndUpdate = (n: DependencyNode): boolean => {
        if (n.uniqueId === nodeId) {
          n.excess = excess;
          recalcChildren(n);
          return true;
        }
        return n.children?.some(findAndUpdate) || false;
      };
      findAndUpdate(tree);

      const applyAffected = (updates: AffectedNodeUpdate[]) => {
        for (const update of updates) {
          const updateTree = state.dependencyTrees[update.treeId];
          if (!updateTree) continue;
          const updateNode = findNodeById(updateTree, update.nodeId);
          if (!updateNode) continue;

          if (Math.abs((updateNode.amount || 0) - update.amount) > 0.001) {
            updateNode.amount = update.amount;
            recalcChildren(updateNode);
          }

          const downstream = calculateAffectedNodes(
            state.dependencyTrees as Record<string, DependencyNode>,
            update.treeId,
            update.nodeId,
            update.productionType,
            update.amount,
          );
          applyAffected(downstream);
        }
      };

      const updatedNode = findNodeById(tree, nodeId);
      if (updatedNode?.children) {
        for (const child of updatedNode.children) {
          const childUpdates = calculateAffectedNodes(
            state.dependencyTrees as Record<string, DependencyNode>,
            treeId,
            child.uniqueId,
            'forced',
            child.amount || 0,
          );
          applyAffected(childUpdates);
        }
      }

      // --- Recalculate accumulated ---
      const newAccumulated: Record<string, AccumulatedNode> = {};
      Object.values(state.dependencyTrees).forEach(t => {
        Object.assign(newAccumulated, calculateAccumulatedFromTree(t));
      });
      state.accumulatedDependencies = newAccumulated;
      state.lastUpdateTime = Date.now();
    },

    // --- Synchronous tree amount recalculation ---
    // Recalculates root amount from import demand sum, then cascades
    // child amounts via recipe ratios in a single Immer pass.
    recalculateTreeAmounts: (
      state,
      action: PayloadAction<{
        rootNodeId: string;
        externalDemandChange?: { importerNodeId: string; amount: number };
      }>
    ) => {
      const { rootNodeId, externalDemandChange } = action.payload;
      const trees = state.dependencyTrees as Record<string, DependencyNode>;

      // --- Step 1: Sum all demand on this root from importers ---
      let newRequiredAmount = 0;
      for (const tree of Object.values(trees)) {
        const findDemand = (node: DependencyNode): number => {
          let demand = 0;
          const importRef = node.importReference;
          if (importRef?.targetTreeId === rootNodeId) {
            demand += (externalDemandChange?.importerNodeId === node.uniqueId)
              ? externalDemandChange.amount
              : (node.amount || 0);
          }
          if (node.children) {
            for (const child of node.children) demand += findDemand(child);
          }
          return demand;
        };
        newRequiredAmount += findDemand(tree);
      }

      // --- Step 2: Update root amount ---
      const rootNode = trees[rootNodeId];
      if (!rootNode || !rootNode.isRoot) return;
      rootNode.amount = newRequiredAmount;

      // --- Step 3: Cascade child amounts using recipe ratios ---
      const recalcChildren = (node: DependencyNode): void => {
        if (!node.recipe || !node.children || node.children.length === 0) return;
        const totalProduction = (node.amount || 0) + (node.excess || 0);
        const outputAmount = node.recipe.out[node.id] || 1;
        const cyclesNeeded = totalProduction / outputAmount;

        for (const child of node.children) {
          if (child.isImport || child.importReference) {
            const recipeInputAmount = node.recipe.in?.[child.id] || 0;
            child.amount = recipeInputAmount * cyclesNeeded;
          } else if (child.isByproduct) {
            const recipeOutputAmount = node.recipe.out[child.id] || 0;
            child.amount = -(recipeOutputAmount * cyclesNeeded);
          } else {
            const recipeInputAmount = node.recipe.in?.[child.id] || 0;
            child.amount = recipeInputAmount * cyclesNeeded;
            recalcChildren(child);
          }
        }
      };

      recalcChildren(rootNode);

      // --- Step 4: Recalculate accumulated ---
      const newAccumulated2: Record<string, AccumulatedNode> = {};
      Object.values(trees).forEach(t => {
        Object.assign(newAccumulated2, calculateAccumulatedFromTree(t));
      });
      state.accumulatedDependencies = newAccumulated2;
      state.lastUpdateTime = Date.now();
    },

    // --- Batch tree creation + import linking + full amount recalc ---
    // Replaces N individual setDependencies + setNodeAsImportThunk calls
    // with a single Immer pass. Builds an importer index once (O(nodes)),
    // then does O(1) lookups per root instead of O(n²) tree walks.
    setDependenciesBatch: (
      state,
      action: PayloadAction<{
        trees: Record<string, DependencyNode>;
        importLinks: Array<{
          nodeId: string;
          targetTreeId: string;
          amount: number;
        }>;
      }>
    ) => {
      // Step 1: Add all new trees at once (no accumulated recalc yet)
      for (const [treeId, tree] of Object.entries(action.payload.trees)) {
        state.dependencyTrees[treeId] = tree;
      }

      // Step 2: Set all import references in one Immer pass
      for (const link of action.payload.importLinks) {
        for (const treeId in state.dependencyTrees) {
          const tree = state.dependencyTrees[treeId];
          const node = findNodeById(tree, link.nodeId);
          if (node) {
            node.importReference = {
              targetTreeId: link.targetTreeId,
              targetNodeId: link.targetTreeId,
            };
            node.isImport = true;
            node.children = [];
            node.recipe = undefined;
            node.amount = link.amount;
            break;
          }
        }
      }

      // Step 3: Build importer index once — O(nodes), not O(n²)
      const importerIndex = new Map<string, Map<string, number>>();
      const indexNode = (node: DependencyNode): void => {
        const ref = node.importReference;
        if (ref?.targetTreeId) {
          const targetId = ref.targetTreeId;
          if (!importerIndex.has(targetId)) importerIndex.set(targetId, new Map());
          importerIndex.get(targetId)!.set(node.uniqueId, node.amount || 0);
        }
        if (node.children) for (const child of node.children) indexNode(child);
      };
      for (const tree of Object.values(state.dependencyTrees)) indexNode(tree);

      // Step 4: Update all root amounts using O(1) index lookups
      const recalcChildren = (node: DependencyNode): void => {
        if (!node.recipe || !node.children?.length) return;
        const total = (node.amount || 0) + (node.excess || 0);
        const outputAmt = node.recipe.out[node.id] || 1;
        const cycles = total / outputAmt;
        for (const child of node.children) {
          if (child.importReference || child.isImport) {
            child.amount = (node.recipe.in?.[child.id] || 0) * cycles;
          } else if (child.isByproduct) {
            child.amount = -((node.recipe.out[child.id] || 0) * cycles);
          } else {
            child.amount = (node.recipe.in?.[child.id] || 0) * cycles;
            recalcChildren(child);
          }
        }
      };

      for (const rootId in state.dependencyTrees) {
        const root = state.dependencyTrees[rootId];
        if (!root.isRoot) continue;
        const importers = importerIndex.get(rootId);
        root.amount = importers
          ? Array.from(importers.values()).reduce((s, a) => s + a, 0)
          : 0;
        recalcChildren(root);
      }

      // Step 5: Recalculate accumulated ONCE at the end
      const newAccumulated: Record<string, AccumulatedNode> = {};
      Object.values(state.dependencyTrees).forEach(t => {
        Object.assign(newAccumulated, calculateAccumulatedFromTree(t));
      });
      state.accumulatedDependencies = newAccumulated;
      state.lastUpdateTime = Date.now();
    },
    
    // Update machine count on a specific node
    setNodeMachineCount: (
      state,
      action: PayloadAction<{ nodeId: string; machineCount: number }>
    ) => {
      const { nodeId, machineCount } = action.payload;
      for (const treeId in state.dependencyTrees) {
        const tree = state.dependencyTrees[treeId];
        const node = findNodeById(tree, nodeId);
        if (node) {
          node.machineCount = machineCount;
          state.lastUpdateTime = Date.now();
          return;
        }
      }
    },
    
    // Update machine multiplier on a specific node
    setNodeMachineMultiplier: (
      state,
      action: PayloadAction<{ nodeId: string; machineMultiplier: number }>
    ) => {
      const { nodeId, machineMultiplier } = action.payload;
      for (const treeId in state.dependencyTrees) {
        const tree = state.dependencyTrees[treeId];
        const node = findNodeById(tree, nodeId);
        if (node) {
          node.machineMultiplier = machineMultiplier;
          state.lastUpdateTime = Date.now();
          return;
        }
      }
    },
    
    // Update excess on a specific node
    setNodeExcess: (
      state,
      action: PayloadAction<{ nodeId: string; excess: number }>
    ) => {
      const { nodeId, excess } = action.payload;
      for (const treeId in state.dependencyTrees) {
        const tree = state.dependencyTrees[treeId];
        const node = findNodeById(tree, nodeId);
        if (node) {
          node.excess = excess;
          state.lastUpdateTime = Date.now();
          return;
        }
      }
    },
    
    // Toggle hidden state on a specific node (shy layer)
    toggleNodeHidden: (
      state,
      action: PayloadAction<{ treeId: string; nodeId: string }>
    ) => {
      const { treeId, nodeId } = action.payload;
      const tree = state.dependencyTrees[treeId];
      if (tree) {
        const node = findNodeById(tree, nodeId);
        if (node) {
          node.isHidden = !node.isHidden;
          state.lastUpdateTime = Date.now();
        }
      }
    },
    
    updateNodeProperties: (
      state,
      // Restore original payload structure
      action: PayloadAction<{
        nodeId: string;
        updatedNode: Partial<DependencyNode>; 
      }>
    ) => {
      const { nodeId, updatedNode } = action.payload;
      let treeUpdated = false;
      
      // Add debug logging for recipe updates
      if (updatedNode.recipe) {
        // 
      }
      
      for (const treeId in state.dependencyTrees) {
        const tree = state.dependencyTrees[treeId];
        const updateNodeInTree = (node: DependencyNode): boolean => {
          if (node.uniqueId === nodeId) {
            // If updatedNode contains selectedRecipeId, handle/remove it
            if ('selectedRecipeId' in updatedNode) {
               delete updatedNode.selectedRecipeId;
            }
            
            // Special handling for recipe updates to ensure they fully propagate
            if (updatedNode.recipe) {
              // Make sure we're setting a complete recipe object with required properties
              node.recipe = { ...updatedNode.recipe };
              
              
              // Remove recipe from the updatedNode to prevent double-application
              const { recipe, ...restOfUpdates } = updatedNode;
              // Apply the rest of the updates
              Object.assign(node, restOfUpdates);
            } else {
              // Normal update for non-recipe properties
              Object.assign(node, updatedNode);
            }
            
            treeUpdated = true;
            return true;
          }
          return node.children?.some(updateNodeInTree) || false;
        };
        
        // Just run the update function (no accumulated calc here)
       if (updateNodeInTree(tree)) {
         break;
       }
      }
      if (!treeUpdated) {
         // Still log warnings
         logger.warn(`Node ${nodeId} not found in any tree for update.`);
      }
      state.lastUpdateTime = Date.now();
    },
    
    clearErrors: (state) => {
      state.errors = [];
      state.lastUpdateTime = Date.now();
    },

    // Reducer for removeNodeAction
    _internalRemoveNodeActionReducer: (state, action: PayloadAction<string>) => {
      const nodeIdToRemove = action.payload;
      if (state.dependencyTrees[nodeIdToRemove]) {
        delete state.dependencyTrees[nodeIdToRemove];
        state.lastUpdateTime = Date.now();
        // Recalculate accumulated state
        const newAccumulated: Record<string, AccumulatedNode> = {};
        Object.values(state.dependencyTrees).forEach(currentTree => {
            if (currentTree) { // Add null check
                const treeAccumulated = calculateAccumulatedFromTree(currentTree);
                Object.assign(newAccumulated, treeAccumulated);
            }
        });
        state.accumulatedDependencies = newAccumulated;
      } else {
        logger.warn(`[Reducer/removeNodeAction] Node ${nodeIdToRemove} not found.`);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(importNodeAction, handleNodeImportReducer)
      // Use action from createAction and delegate to internal reducer
      .addCase(removeNodeAction, (state, action) => {
         dependencySlice.caseReducers._internalRemoveNodeActionReducer(state, action);
       });

    productionSliceExtraReducers(builder);
  }
});

export const { 
  // Export regular slice actions generated from reducers
  setDependencies, 
  deleteTree, 
  updateAccumulated, 
  setManualTreeOrder,
  loadSavedState,
  updateNodeProperties,
  clearErrors,
  toggleNodeSelected,
  toggleNodeCompleted,
  toggleNodeHidden,
  setHighlightedNode,
  setNodeMachineCount,
  setNodeMachineMultiplier,
  setNodeExcess,
  setExternalImports,
  cascadeExcessUpdate,
  recalculateTreeAmounts,
  setDependenciesBatch,
  // DO NOT export _internalRemoveNodeActionReducer or removeNodeAction here
} = dependencySlice.actions;

export default dependencySlice.reducer;

// Define custom actions for local use (if any) or move relevant ones
export const setExcess = createAction<{
  excess: number;
  nodeId: string;
  treeId: string;
}>('dependency/setExcess');

// Keep Recipe Loading Thunk
export const loadNodeRecipe = 
  (nodeId: string, treeId: string) => 
  async (dispatch: AppDispatch, getState: () => { dependencies: DependencyState }) => {
    
    const state = getState();
    // Check if dependencies state exists
    if (!state.dependencies) {
        // Still log errors
        logger.error(`[RECIPE LOADER] Dependencies state is undefined`);
        return;
    }
    const tree = state.dependencies.dependencyTrees[treeId];
    if (!tree) {
      // Still log errors
      logger.error(`[RECIPE LOADER] Tree ${treeId} not found`);
      return;
    }
    
    // Use findNodeById utility
    const node = findNodeById(tree, nodeId);
    if (!node) {
      // Still log errors
      logger.error(`[RECIPE LOADER] Node ${nodeId} not found in tree ${treeId}`);
      return;
    }
    
    if (node.recipe) {
      // 
      return;
    }
    
    // FIX: Accessing recipe.id here caused issues, use node.recipe directly if needed
    // const recipeId = node.recipe?.id; // Removed this potentially problematic line
    // Instead, check if recipe exists directly
    if (!node.recipe) { // Check if recipe object is missing
      // Still log errors
      logger.error(`[RECIPE LOADER] Node ${nodeId} has no recipe information. Attempting default.`);
      try {
        const recipe = await getRecipeByOutput(node.id);
        if (recipe) {
          dispatch(updateNodeProperties({ nodeId, updatedNode: { recipe } }));
          return;
        } else {
          // Still log errors
          logger.error(`[RECIPE LOADER] No default recipe found for item ${node.id}`);
        }
      } catch (error) {
        // Still log errors
        logger.error(`[RECIPE LOADER] Error getting default recipe:`, error);
      }
      return; // Return if no recipe and default fetch failed/didn't happen
    }
    
    // If we reach here, node.recipe exists, but maybe we still need to load it fully?
    // This part seems less likely to be reached now, but kept for structure.
    // Let's assume if node.recipe exists, it's the correct one for now.
    // const recipeId = node.recipe.id;
    // try {
    //   
    //   const recipe = await getRecipeById(recipeId); // This might be redundant if recipe object is already attached
    //   if (recipe) {
    //     
    //     dispatch(updateNodeProperties({ nodeId, updatedNode: { recipe } }));
    //   } else {
    //     console.error(`[RECIPE LOADER] Failed to load recipe ${recipeId}`);
    //   }
    // } catch (error) {
    //   console.error(`[RECIPE LOADER] Error loading recipe:`, error);
    // }
  };
