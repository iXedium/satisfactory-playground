/* eslint-disable @typescript-eslint/no-unused-vars */
import { ActionReducerMapBuilder, createAction } from '@reduxjs/toolkit';
import { DependencyNode } from '../../../types';
import { findNodeById, AccumulatedNode } from '../../../utils';
import { AppDispatch } from '../../../store';
import { 
  getImportReference, 
  hasImportReference 
} from '../../../utils/nodeReferenceUtils';
import { redistributeChildImportsThunk } from './importExportLogic';
// Potentially needed from dependencySlice if state access changes:
// import { updateNodeProperties } from './dependencySlice'; 

// --- Define the expected Slice State Shape locally --- 
interface ProductionDependencyState {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedDependencies: Record<string, AccumulatedNode>;
  errors: string[]; // Keep consistent with original type
}

// --- Actions related to Production Updates ---
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

// --- Helper Functions --- 

// Debugging Helper (Consider moving to a shared utils file later)
function logNodeBrief(node: DependencyNode | null | undefined, context: string) {
  if (!node) {
    return;
  }
}

function getAllNodeIds(tree: DependencyNode): string[] {
  const ids: string[] = [tree.uniqueId];
  if (tree.children && tree.children.length > 0) {
    tree.children.forEach(child => {
      ids.push(...getAllNodeIds(child));
    });
  }
  return ids;
}

// Type definition for the result objects
export type AffectedNodeUpdate = {
  nodeId: string;
  treeId: string;
  productionType: 'excess' | 'forced' | 'imported';
  amount: number;
  targetTreeId?: string;
  needsRecipe?: boolean;
};

/** Calculates the update needed for a target tree based on aggregate demand from import nodes. */
function calculateImportTargetUpdate(
  trees: Record<string, DependencyNode>,
  targetTreeId: string
): AffectedNodeUpdate | null {
  let totalImportAmount = 0;
  Object.entries(trees).forEach(([currentTreeId, currentTree]) => {
    let contribution = 0;
    const findImportNodes = (n: DependencyNode): number => {
      const nImportRef = getImportReference(n);
      let localContribution = 0;
      if (nImportRef && nImportRef.targetTreeId === targetTreeId) {
         const currentAmount = n.amount || 0;
         localContribution += currentAmount;
      } else if (n.isImport && n.importedFrom === targetTreeId) { // Legacy support
         const currentAmount = n.amount || 0;
         localContribution += currentAmount;
      }
      if (n.children) {
        n.children.forEach(child => { localContribution += findImportNodes(child); });
      }
      return localContribution;
    };
    contribution = findImportNodes(currentTree);
    totalImportAmount += contribution;
    
  });

  const targetTreeNode = trees[targetTreeId];
  if (targetTreeNode) {
    return {
      nodeId: targetTreeNode.uniqueId, 
      treeId: targetTreeId,
      productionType: 'forced', 
      amount: totalImportAmount, 
      targetTreeId: targetTreeId 
    };
  } else {
    // console.error(`[AFFECTED AGGREGATE] Target tree ${targetTreeId} not found when creating update action.`);
    return null;
  }
}

/** Calculates the production needs for a node's children based on its recipe and total production. */
export function calculateChildProductionNeeds(
  node: DependencyNode,
  treeId: string,
  totalProduction: number
): AffectedNodeUpdate[] {
  const childUpdates: AffectedNodeUpdate[] = [];
  
  if (!node.children || node.children.length === 0) {
     return childUpdates; // Return empty array
  }
  
  if (node.recipe) {
    const outputAmount = node.recipe.out[node.id] || 1;
    const cyclesNeeded = totalProduction / outputAmount;

    // Calculate needs for INPUT children
    Object.entries(node.recipe.in).forEach(([inputItemId, inputRecipeAmount]) => {
      const childNode = node.children?.find(c => c.id === inputItemId && !c.isByproduct);
      if (childNode) {
        const childAmount = (inputRecipeAmount || 0) * cyclesNeeded;
        logNodeBrief(childNode, 'AFFECTED CHILD INPUT TARGET');
        childUpdates.push({
          nodeId: childNode.uniqueId,
          treeId: treeId,
          productionType: 'forced',
          amount: childAmount,
          needsRecipe: false
        });
      } else {
        // console.warn(`[AFFECTED] Input child node for item ${inputItemId} not found in children of ${node.id}`);
      }
    });

    // Calculate amounts for BYPRODUCT children
    Object.entries(node.recipe.out).forEach(([outputItemId, outputRecipeAmount]) => {
      // Skip the main product itself
      if (outputItemId === node.id) return;

      const childNode = node.children?.find(c => c.id === outputItemId && c.isByproduct);
      if (childNode) {
        const childAmount = -(Number(outputRecipeAmount) * cyclesNeeded); // Negative amount for byproduct
        logNodeBrief(childNode, 'AFFECTED CHILD BYPRODUCT TARGET');
        childUpdates.push({
          nodeId: childNode.uniqueId,
          treeId: treeId,
          productionType: 'forced', // Still 'forced' as it's determined by the parent's production
          amount: childAmount,
          needsRecipe: false
        });
      } else {
        // console.warn(`[AFFECTED] Byproduct child node for item ${outputItemId} not found in children of ${node.id}`);
      }
    });

  } else {
    node.children.forEach(child => {
      childUpdates.push({
        nodeId: child.uniqueId,
        treeId: treeId,
        productionType: 'forced',
        amount: totalProduction, 
        needsRecipe: true 
      });
    });
  }
  return childUpdates;
}

// Refactored: Calculates which nodes are affected by a production change on a specific node.
export function calculateAffectedNodes(
  trees: Record<string, DependencyNode>,
  treeId: string,
  nodeId: string,
  productionType: 'excess' | 'forced' | 'imported',
  amount: number
): AffectedNodeUpdate[] { // Ensure return type matches
  let results: AffectedNodeUpdate[] = []; // Initialize as empty array
  
  const tree = trees[treeId];
  if (!tree) {
    // console.error(`[AFFECTED] Tree ${treeId} not found`);
    return results;
  }
  
  const node = findNodeById(tree, nodeId);
  if (!node) {
    return results;
  }
  
  logNodeBrief(node, 'AFFECTED');
  
  if (hasImportReference(node)) {
    const importRef = getImportReference(node);
    if (importRef && importRef.targetTreeId) {
      // Call the helper for import target updates
      const importUpdate = calculateImportTargetUpdate(trees, importRef.targetTreeId);
      if (importUpdate) {
        results.push(importUpdate);
      }
    } else {
       // console.warn(`[AFFECTED] Node ${nodeId} has import reference but no targetTreeId.`);
    }
  } else {
    // Call the helper for calculating child needs
    const totalProduction = (node.amount || 0) + (node.excess || 0);
    results = calculateChildProductionNeeds(node, treeId, totalProduction);
  } 

  return results;
}

// --- Extra Reducers Logic --- 
// Defines how the dependency state changes in response to production update actions.
export const productionSliceExtraReducers = (builder: ActionReducerMapBuilder<ProductionDependencyState>) => {
  builder
    .addCase(updateExcessProduction, (state, action) => { 
      const updateLogic = (node: DependencyNode): boolean => { 
         if (node.uniqueId === action.payload.nodeId) {
           node.excess = action.payload.amount;
           return true;
         }
         return node.children?.some(updateLogic) || false;
      };
      if (state.dependencyTrees[action.payload.treeId]) {
         updateLogic(state.dependencyTrees[action.payload.treeId]);
      }
    })
    .addCase(updateForcedProduction, (state, action) => { 
      const updateLogic = (node: DependencyNode): boolean => { 
         if (node.uniqueId === action.payload.nodeId) {
           node.amount = action.payload.amount;
           return true;
         }
         return node.children?.some(updateLogic) || false;
       };
      if (state.dependencyTrees[action.payload.treeId]) {
         updateLogic(state.dependencyTrees[action.payload.treeId]);
      }
    })
    .addCase(updateImportedProduction, (state, action) => { 
      const updateLogic = (node: DependencyNode): boolean => { 
         if (node.uniqueId === action.payload.nodeId) {
           node.amount = action.payload.amount;
           return true;
         }
         return node.children?.some(updateLogic) || false;
      };
      if (state.dependencyTrees[action.payload.treeId]) {
         updateLogic(state.dependencyTrees[action.payload.treeId]);
      }
    });
};

// --- Thunk for Sequential Production Updates ---
export const updateTreeProduction = 
  (nodeId: string, treeId: string, productionType: 'excess' | 'forced' | 'imported', amount: number, targetTreeId?: string, tabId?: string) => 
  async (dispatch: AppDispatch, getState: () => {
    dependencies: ProductionDependencyState;
    planners: Record<string, { dependencies: ProductionDependencyState } | undefined>;
  }) => {

    const activeTabId = tabId || 'default';
    const tabDeps = getState().planners[activeTabId]?.dependencies
                    ?? getState().dependencies;

    const initialTree = tabDeps.dependencyTrees[treeId];
    if (!initialTree) {
      return;
    }

    const nodeToUpdate = findNodeById(initialTree, nodeId);
    if (!nodeToUpdate) {
      return;
    }


    if (productionType === 'imported' && targetTreeId) {
      dispatch(updateImportedProduction({ nodeId, treeId, targetTreeId, amount }));

      const postImportState = getState();
      const postImportDeps = postImportState.planners[activeTabId]?.dependencies
                             ?? postImportState.dependencies;
      const affectedNodesAfterImport = calculateAffectedNodes(
        postImportDeps.dependencyTrees,
        treeId,
        nodeId,
        productionType,
        amount
      );

      for (const node of affectedNodesAfterImport) {
        await dispatch(updateTreeProduction(
          node.nodeId,
          node.treeId,
          node.productionType,
          node.amount,
          node.targetTreeId,
          tabId
        ));
      }

      return;
    }

    // Update non-import nodes
    if (productionType === 'excess') {
      dispatch(updateExcessProduction({ nodeId, treeId, amount }));
    }
    else if (productionType === 'forced') {
      dispatch(updateForcedProduction({ nodeId, treeId, amount }));
    }

    const stateAfterUpdate = getState();
    const postUpdateDeps = stateAfterUpdate.planners[activeTabId]?.dependencies
                           ?? stateAfterUpdate.dependencies;
    const affectedNodesAfterUpdate = calculateAffectedNodes(
      postUpdateDeps.dependencyTrees,
      treeId,
      nodeId,
      productionType,
      amount
    );

    for (const node of affectedNodesAfterUpdate) {
      await dispatch(updateTreeProduction(
        node.nodeId,
        node.treeId,
        node.productionType,
        node.amount,
        node.targetTreeId,
        tabId
      ));
    }

    // After updating children, trigger multi-source redistribution if needed
    if (productionType === 'excess' || productionType === 'forced') {
      const nodeAfterUpdate = findNodeById(postUpdateDeps.dependencyTrees[treeId], nodeId);
      if (nodeAfterUpdate && nodeAfterUpdate.children && nodeAfterUpdate.children.length > 0) {
        const hasImportChildren = nodeAfterUpdate.children.some(child => hasImportReference(child));
        if (hasImportChildren) {
          await dispatch(redistributeChildImportsThunk({ parentNodeId: nodeId, treeId }));
        }
      }
    }
  }; 