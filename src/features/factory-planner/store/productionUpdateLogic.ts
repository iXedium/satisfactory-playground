/* eslint-disable @typescript-eslint/no-unused-vars */
import { ActionReducerMapBuilder, createAction } from '@reduxjs/toolkit';
import { DependencyNode } from '../../../types';
import { findNodeById, AccumulatedNode } from '../../../utils';
import { AppDispatch } from '../../../store';
import { 
  getImportReference, 
  hasImportReference 
} from '../../../utils/nodeReferenceUtils';
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
    // console.log(`[${context}] Node is null or undefined`);
    return;
  }
  // console.log(`[${context}] Node: ${node.id} (${node.uniqueId}), Amount: ${node.amount}, Excess: ${node.excess || 0}, Recipe: ${node.recipe?.id || 'None'}, IsImport: ${hasImportReference(node)}, Target: ${getImportReference(node)?.targetTreeId || 'N/A'}`);
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
type AffectedNodeUpdate = {
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
  // console.log(`[AFFECTED HELPER] Calculating aggregate demand for Target Tree: ${targetTreeId}`);
  let totalImportAmount = 0;
  Object.entries(trees).forEach(([currentTreeId, currentTree]) => {
    let contribution = 0;
    const findImportNodes = (n: DependencyNode): number => {
      const nImportRef = getImportReference(n);
      let localContribution = 0;
      if (nImportRef && nImportRef.targetTreeId === targetTreeId) {
         const currentAmount = n.amount || 0;
         localContribution += currentAmount;
         // console.log(`  [AFFECTED AGGREGATE] Tree ${currentTreeId}, Node ${n.id} (${n.uniqueId}) contributes ${currentAmount}`);
      } else if (n.isImport && n.importedFrom === targetTreeId) { // Legacy support
         const currentAmount = n.amount || 0;
         localContribution += currentAmount;
         // console.log(`  [AFFECTED AGGREGATE] Tree ${currentTreeId}, Node ${n.id} (${n.uniqueId}) contributes ${currentAmount} (Legacy)`);
      }
      if (n.children) {
        n.children.forEach(child => { localContribution += findImportNodes(child); });
      }
      return localContribution;
    };
    contribution = findImportNodes(currentTree);
    totalImportAmount += contribution;
    if (contribution > 0) {
         // console.log(`  [AFFECTED AGGREGATE] Subtotal from Tree ${currentTreeId}: ${contribution}`);
    }
  });
  // console.log(`[AFFECTED AGGREGATE] Total calculated demand for Target Tree ${targetTreeId}: ${totalImportAmount}`);

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
function calculateChildProductionNeeds(
  node: DependencyNode,
  treeId: string,
  totalProduction: number
): AffectedNodeUpdate[] {
  const childUpdates: AffectedNodeUpdate[] = [];
  // console.log(`[AFFECTED HELPER] Calculating child needs for Node ${node.id}. Total Production: ${totalProduction}`);
  
  if (!node.children || node.children.length === 0) {
     // console.log(`[AFFECTED] Node has no children to update`);
     return childUpdates; // Return empty array
  }
  
  if (node.recipe) {
    // console.log(`[AFFECTED] Using recipe ${node.recipe.id}`);
    const outputAmount = node.recipe.out[node.id] || 1;
    const cyclesNeeded = totalProduction / outputAmount;
    // console.log(`[AFFECTED PROPAGATION] Output: ${outputAmount}, Cycles: ${cyclesNeeded}`);

    // Calculate needs for INPUT children
    Object.entries(node.recipe.in).forEach(([inputItemId, inputRecipeAmount]) => {
      const childNode = node.children?.find(c => c.id === inputItemId && !c.isByproduct);
      if (childNode) {
        const childAmount = (inputRecipeAmount || 0) * cyclesNeeded;
        // console.log(`[AFFECTED PROPAGATION] Input Child ${childNode.id} needs: ${childAmount}`);
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
        // console.log(`[BYPRODUCT DEBUG] calculateChildProductionNeeds: Byproduct Child ${childNode.id} gets amount: ${childAmount.toFixed(3)} (Cycles: ${cyclesNeeded.toFixed(3)})`);
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
    // console.error(`[AFFECTED] Node ${node.id} has no recipe object, cannot calculate precise child amounts.`);
    // console.log(`[AFFECTED] Propagating parent's total production (${totalProduction}) to children. Recipe load needed.`);
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
function calculateAffectedNodes(
  trees: Record<string, DependencyNode>,
  treeId: string,
  nodeId: string,
  productionType: 'excess' | 'forced' | 'imported',
  amount: number
): AffectedNodeUpdate[] { // Ensure return type matches
  // console.log(`--- calculateAffectedNodes START for Node ${nodeId} in Tree ${treeId} (Type: ${productionType}, AmountFromTrigger: ${amount}) ---`);
  let results: AffectedNodeUpdate[] = []; // Initialize as empty array
  
  const tree = trees[treeId];
  if (!tree) {
    // console.error(`[AFFECTED] Tree ${treeId} not found`);
    return results;
  }
  
  const node = findNodeById(tree, nodeId);
  if (!node) {
    // console.error(`[AFFECTED] Node ${nodeId} not found in tree ${treeId}`);
    // console.log(`[AFFECTED] Available nodes in tree:`, getAllNodeIds(tree));
    // console.log(`--- calculateAffectedNodes END for Node ${nodeId} (Node not found) ---`);
    return results;
  }
  
  // console.log(`[AFFECTED] Processing node details:`);
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

  // console.log(`[AFFECTED] Returning ${results.length} affected nodes:`, results.map(r => `${r.nodeId} (${r.productionType}: ${r.amount})`));
  // console.log(`--- calculateAffectedNodes END for Node ${nodeId} ---`);
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
  (nodeId: string, treeId: string, productionType: 'excess' | 'forced' | 'imported', amount: number, targetTreeId?: string) => 
  async (dispatch: AppDispatch, getState: () => { dependencies: ProductionDependencyState }) => {
    // console.log(`>>> updateTreeProduction START - Node: ${nodeId}, Tree: ${treeId}, Type: ${productionType}, Amount: ${amount}, TargetTree: ${targetTreeId || 'N/A'}`);
    
    const initialState = getState();
    const initialTree = initialState.dependencies.dependencyTrees[treeId];
    if (!initialTree) {
      // console.error(`[FATAL] Tree ${treeId} not found in state`);
      return;
    }
    
    const nodeToUpdate = findNodeById(initialTree, nodeId);
    if (!nodeToUpdate) {
      // console.error(`[FATAL] Node ${nodeId} not found in tree ${treeId}`);
      // console.log(`[DEBUG] Available nodes in tree:`, getAllNodeIds(initialTree));
      return;
    }
    
    // console.log(`[Thunk] Will update node ${nodeToUpdate.id} (${nodeToUpdate.uniqueId})`);
    
    if (productionType === 'imported' && targetTreeId) {
      // console.log(`[Thunk] Dispatching updateImportedProduction for import node ${nodeId}`);
      dispatch(updateImportedProduction({ nodeId, treeId, targetTreeId, amount }));
      await Promise.resolve(); // Ensure state update completes
      
      const stateAfterImportUpdate = getState();
      const affectedNodesAfterImport = calculateAffectedNodes(
        stateAfterImportUpdate.dependencies.dependencyTrees,
        treeId, 
        nodeId, 
        productionType,
        amount 
      );
      
      for (const node of affectedNodesAfterImport) {
        // console.log(`  [Thunk] Dispatching recursive updateTreeProduction for affected node: ${node.nodeId}`);
        await dispatch(updateTreeProduction(
          node.nodeId,
          node.treeId,
          node.productionType,
          node.amount,
          node.targetTreeId
        ));
      }
      
      // console.log(`<<< updateTreeProduction END - Node: ${nodeId} (Import Path)`);
      return;
    }
    
    // Update non-import nodes
    if (productionType === 'excess') {
      // console.log(`[Thunk] Dispatching updateExcessProduction for node ${nodeId}`);
      dispatch(updateExcessProduction({ nodeId, treeId, amount }));
    } 
    else if (productionType === 'forced') {
      // console.log(`[Thunk] Dispatching updateForcedProduction for node ${nodeId}`);
      dispatch(updateForcedProduction({ nodeId, treeId, amount }));
    } 
    
    await Promise.resolve(); // Ensure state update completes
    const stateAfterUpdate = getState();
    const affectedNodesAfterUpdate = calculateAffectedNodes(
      stateAfterUpdate.dependencies.dependencyTrees,
      treeId,
      nodeId,
      productionType,
      amount
    );
    
    // console.log(`[Thunk] Processing ${affectedNodesAfterUpdate.length} affected nodes from calculation.`);
    for (const node of affectedNodesAfterUpdate) {
      // console.log(`  [Thunk] Dispatching recursive updateTreeProduction for affected node: ${node.nodeId}`);
      await dispatch(updateTreeProduction(
        node.nodeId,
        node.treeId,
        node.productionType,
        node.amount,
        node.targetTreeId
      ));
    }
    
    // console.log(`<<< updateTreeProduction END - Node: ${nodeId}`);
  }; 