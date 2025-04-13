/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { getRecipesForItem, getRecipeById, getRecipeByOutput } from '../../../data';
import { Item, DependencyNode, Recipe } from '../../../types';
import { 
  loadSavedState, 
  setDependencies, 
  deleteTree, 
  importNodeAction,
  updateNodeProperties,
  unimportNode,
  updateTreeProduction
} from '../store';
import { 
  setRecipeSelection, 
  loadRecipeSelections 
} from '../store';
import { calculateDependencyTree, findNodeById } from '../../../utils';
import { calculateAccumulatedFromTree } from '../../../utils';
import { usePlannerDisplayOptions } from './usePlannerDisplayOptions';
import { usePlannerNodeState } from './usePlannerNodeState';
import { usePlannerItemSelection } from './usePlannerItemSelection';
import { usePlannerTreeCalculation } from './usePlannerTreeCalculation';
import { usePlannerImportExport } from './usePlannerImportExport';

type ViewMode = "accumulated" | "tree";

export const useFactoryPlanner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  
  const {
    viewMode,
    setViewMode,
    showExtensions,
    setShowExtensions,
    accumulateExtensions,
    setAccumulateExtensions,
    showMachines,
    setShowMachines,
    showMachineMultiplier,
    setShowMachineMultiplier,
  } = usePlannerDisplayOptions();
  
  const {
    excessMap,
    setExcessMap,
    machineCountMap,
    setMachineCountMap,
    machineMultiplierMap,
    setMachineMultiplierMap,
    expandedNodes,
    setExpandedNodes,
    nodeExtensionOverrides,
    setNodeExtensionOverrides,
  } = usePlannerNodeState();
  
  const {
    items,
    selectedItem,
    setSelectedItem,
    selectedRecipe,
    setSelectedRecipe,
    isAddItemCollapsed,
    setIsAddItemCollapsed,
    recentItems,
    updateRecentItems,
  } = usePlannerItemSelection();

  const {
    handleCalculate,
    handleCreateNewTree,
  } = usePlannerTreeCalculation({
    selectedItem,
    selectedRecipe,
    recipeSelections,
    dependencies,
    excessMap,
    updateRecentItems,
    setMachineCountMap,
    setMachineMultiplierMap,
    setExcessMap,
  });
  
  const {
    handleImportNode,
    handleUnimport,
  } = usePlannerImportExport({
    dependencies,
    handleCreateNewTree,
  });
  
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  useEffect(() => {
    try {
      const savedDependencies = localStorage.getItem('savedDependencies');
      if (savedDependencies) {
        const parsed = JSON.parse(savedDependencies);
        dispatch(loadSavedState(parsed));
      }
      
      const savedRecipeSelections = localStorage.getItem('savedRecipeSelections');
      if (savedRecipeSelections) {
        const parsed = JSON.parse(savedRecipeSelections);
        dispatch(loadRecipeSelections(parsed));
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
    }
  }, [dispatch]);
  
  useEffect(() => {
    if (Object.keys(dependencies.dependencyTrees).length > 0) {
      try {
        const serialized = JSON.stringify(dependencies);
        localStorage.setItem('savedDependencies', serialized);
      } catch (error) {
        console.error("Error saving dependencies:", error);
        localStorage.removeItem('savedDependencies');
      }
    }
  }, [dependencies]);
  
  useEffect(() => {
    if (Object.keys(recipeSelections).length > 0) {
      try {
        localStorage.setItem('savedRecipeSelections', JSON.stringify(recipeSelections));
      } catch (error) {
        console.error("Error saving recipe selections:", error);
        localStorage.removeItem('savedRecipeSelections');
      }
    }
  }, [recipeSelections]);

  const handleTreeRecipeChange = async (nodeId: string, recipeId: string) => {
    console.log(`[Recipe Change] Node: ${nodeId}, New Recipe ID: ${recipeId}`);
    const currentTrees = dependencies.dependencyTrees;
    
    let treeId = '';
    let nodeToUpdate: DependencyNode | null = null;
    for (const id in currentTrees) {
      nodeToUpdate = findNodeById(currentTrees[id], nodeId);
      if (nodeToUpdate) {
        treeId = id;
        break;
      }
    }

    if (!nodeToUpdate || !treeId) {
      console.error(`[Recipe Change] Node ${nodeId} not found in any tree.`);
      return;
    }

    const currentTree = currentTrees[treeId];
    const newRecipe = await getRecipeById(recipeId);

    dispatch(setRecipeSelection({ nodeId, recipeId }));

    const treeCopy = JSON.parse(JSON.stringify(currentTree)) as DependencyNode;

    const updateNodeRecipe = (node: DependencyNode): boolean => {
      if (node.uniqueId === nodeId) {
        node.recipe = newRecipe;
        console.log(`[Recipe Change] Updated recipe for node ${nodeId} in copied tree.`);
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (updateNodeRecipe(child)) return true;
        }
      }
      return false;
    };

    if (!updateNodeRecipe(treeCopy)) {
      console.error(`[Recipe Change] Failed to find and update node ${nodeId} in copied tree.`);
      return;
    }

    const updatedRecipeSelections = { ...recipeSelections, [nodeId]: recipeId };
    
    try {
      const recalculatedTree = await calculateDependencyTree(
        treeCopy.id,
        treeCopy.amount,
        treeCopy.recipe?.id ?? null,
        updatedRecipeSelections,
        0,
        [],
        '',
        excessMap,
        {},
        currentTrees
      );

      if (recalculatedTree) {
        const accumulated = calculateAccumulatedFromTree(recalculatedTree);
        dispatch(setDependencies({ treeId, tree: recalculatedTree, accumulated }));
        console.log(`[Recipe Change] Dispatched updated tree ${treeId}.`);
      } else {
        console.error('[Recipe Change] Tree recalculation failed.');
      }
    } catch (error) {
      console.error('[Recipe Change] Error during tree recalculation:', error);
    }
  };

  const handleExpandCollapseAll = (expand: boolean) => {
    const newExpandedNodes: Record<string, boolean> = {};
    
    const collectNodeIds = (node: DependencyNode) => {
      newExpandedNodes[node.uniqueId] = expand;
      
      if (node.children) {
        node.children.forEach(collectNodeIds);
      }
    };
    
    Object.values(dependencies.dependencyTrees).forEach(collectNodeIds);
    
    setExpandedNodes(newExpandedNodes);
  };

  const handleMachineCountChange = (nodeId: string, count: number) => {
    setMachineCountMap(prev => ({ ...prev, [nodeId]: count }));
  };

  const handleMachineMultiplierChange = (nodeId: string, multiplier: number) => {
    setMachineMultiplierMap(prev => ({ ...prev, [nodeId]: multiplier }));
  };

  const handleDeleteTree = (treeId: string) => {
    dispatch(deleteTree({ treeId }));
  };

  const handleExcessChange = async (nodeId: string, excess: number) => {
    console.log(`[SEQUENCE DEBUG] Step 1: handleExcessChange called for ${nodeId} with excess ${excess}`);
    
    console.log(`[SEQUENCE DEBUG] Step 2: Setting excess map state`);
    setExcessMap(prevMap => {
      console.log(`[SEQUENCE DEBUG] Step 2.1: Inside setExcessMap callback`);
      return { ...prevMap, [nodeId]: excess };
    });
    
    console.log(`[SEQUENCE DEBUG] Step 2.2: Waiting for state update to process`);
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log(`[SEQUENCE DEBUG] Step 2.3: State update processed`);
    
    console.log(`[SEQUENCE DEBUG] Step 3: Finding tree ID for node ${nodeId}`);
    
    if (dependencies.dependencyTrees[nodeId]) {
      const tree = dependencies.dependencyTrees[nodeId];
      console.log(`[SEQUENCE DEBUG] The node ID is actually a tree ID. Using root node's uniqueId: ${tree.uniqueId}`);
      
      console.log(`[SEQUENCE DEBUG] Root node details:`, {
        id: tree.id,
        uniqueId: tree.uniqueId,
        amount: tree.amount,
        excess: tree.excess,
        hasRecipe: !!tree.recipe,
        recipeId: tree.recipe?.id
      });
      
      setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess }));
      
      dispatch(updateTreeProduction(tree.uniqueId, nodeId, 'excess', excess));
      
      console.log(`[SEQUENCE DEBUG] Step 7: Forcing UI refresh after state updates`);
      setTimeout(() => {
        setForceUpdateCounter(prev => prev + 1);
      }, 50);
      
      return;
    }
    
    let foundTreeId = '';
    let foundNode = null;

    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      const node = findNodeById(tree, nodeId);
      if (node) {
        foundTreeId = treeId;
        foundNode = node;
        
        console.log(`[SEQUENCE DEBUG] Found node details:`, {
          id: node.id,
          uniqueId: node.uniqueId,
          amount: node.amount,
          excess: node.excess,
          hasRecipe: !!node.recipe,
          recipeId: node.recipe?.id,
          hasChildren: node.children && node.children.length > 0
        });
        
        break;
      }
    }

    if (!foundTreeId) {
      console.error(`Node ${nodeId} not found in any tree`);
        return;
      }
      
    console.log(`[SEQUENCE DEBUG] Step 4: Found tree ID: ${foundTreeId}`);
    
    console.log(`[SEQUENCE DEBUG] Step 5: Using node ID: ${nodeId} in tree: ${foundTreeId}`);
    
    dispatch(updateTreeProduction(nodeId, foundTreeId, 'excess', excess));
    
    console.log(`[SEQUENCE DEBUG] Step 7: Forcing UI refresh after state updates`);
      setTimeout(() => {
      setForceUpdateCounter(prev => prev + 1);
      }, 50);
  };

  const findImportNodes = (node: DependencyNode): DependencyNode[] => {
    let importNodes: DependencyNode[] = [];
    
    if (node.isImport) {
      importNodes.push(node);
    }
    
    if (node.children) {
      node.children.forEach(child => {
        importNodes = [...importNodes, ...findImportNodes(child)];
      });
    }
    
    return importNodes;
  };

  const testExcessCascade = async () => {
    const anyTreeId = Object.keys(dependencies.dependencyTrees)[0];
    if (!anyTreeId) {
      console.error("[TEST] No trees found for testing");
      return "FAILED: No trees available for testing";
    }
    
    const tree = dependencies.dependencyTrees[anyTreeId];
    const rootNode = tree;
    const childNode = tree.children && tree.children.length > 0 ? tree.children[0] : null;
    
    if (!childNode) {
      console.error("[TEST] Tree has no child nodes for testing");
      return "FAILED: Selected tree has no child nodes";
    }
    
    console.log("[TEST] Starting excess cascade test with:");
    console.log(`  - Tree: ${anyTreeId} (${rootNode.id})`);
    console.log(`  - Root node ID: ${rootNode.uniqueId}`);
    console.log(`  - Child node ID: ${childNode.uniqueId} (${childNode.id})`);
    
    const initialRootExcess = excessMap[rootNode.uniqueId] || 0;
    const initialChildExcess = excessMap[childNode.uniqueId] || 0;
    
    const testRootExcess = initialRootExcess + 10;
    
    console.log("\n[TEST] PART 1: Testing root node excess change");
    console.log(`  - Changing root excess from ${initialRootExcess} to ${testRootExcess}`);
    
    const originalChildAmount = childNode.amount;
    
    await handleExcessChange(rootNode.uniqueId, testRootExcess);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const updatedTree = dependencies.dependencyTrees[anyTreeId];
    const updatedChildNode = updatedTree.children && updatedTree.children.length > 0 
      ? updatedTree.children.find(c => c.uniqueId === childNode.uniqueId) 
      : null;
    
    if (!updatedChildNode) {
      console.error("[TEST] Cannot find child node after update");
      return "FAILED: Child node not found after update";
    }
    
    const rootTestResult = updatedChildNode.amount !== originalChildAmount;
    
    console.log("\n[TEST] Root excess test results:");
    console.log(`  - Root excess changed: ${initialRootExcess} -> ${excessMap[rootNode.uniqueId]}`);
    console.log(`  - Child amount changed: ${originalChildAmount} -> ${updatedChildNode.amount}`);
    console.log(`  - Child amount should change: ${rootTestResult ? "SUCCESS" : "FAILED"}`);
    
    await handleExcessChange(rootNode.uniqueId, initialRootExcess);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log("\n[TEST] PART 2: Testing child node excess change");
    const testChildExcess = initialChildExcess + 10;
    console.log(`  - Changing child excess from ${initialChildExcess} to ${testChildExcess}`);
    
    await handleExcessChange(childNode.uniqueId, testChildExcess);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const childTestResult = excessMap[childNode.uniqueId] === testChildExcess;
    
    console.log("\n[TEST] Child excess test results:");
    console.log(`  - Child excess changed: ${initialChildExcess} -> ${excessMap[childNode.uniqueId]}`);
    console.log(`  - Child excess should be ${testChildExcess}: ${childTestResult ? "SUCCESS" : "FAILED"}`);
    
    await handleExcessChange(childNode.uniqueId, initialChildExcess);
    
    if (rootTestResult && childTestResult) {
      return "SUCCESS: Both root and child excess changes propagate correctly";
    } else if (rootTestResult) {
      return "PARTIAL SUCCESS: Root excess changes propagate but child excess test failed";
    } else if (childTestResult) {
      return "PARTIAL SUCCESS: Child excess changes propagate but root excess test failed";
    } else {
      return "FAILED: Neither root nor child excess changes propagate correctly";
    }
  };

  const manualTestExcessPropagation = () => {
    const anyTreeId = Object.keys(dependencies.dependencyTrees)[0];
    if (!anyTreeId) {
      console.error("No trees found for testing");
      return;
    }
    
    const tree = dependencies.dependencyTrees[anyTreeId];
    const nodeToTest = findFirstNonRootNode(tree);
    
    if (!nodeToTest) {
      console.error("Could not find a non-root node for testing");
      return;
    }
    
    console.debug(`[TEST] Testing excess propagation with node: ${nodeToTest.id}, uniqueId: ${nodeToTest.uniqueId}`);
    
    const initialExcess = excessMap[nodeToTest.uniqueId] || 0;
    const newExcess = initialExcess + 10;
    
    console.debug(`[TEST] Changing excess from ${initialExcess} to ${newExcess}`);
    handleExcessChange(nodeToTest.uniqueId, newExcess);
    
    function findFirstNonRootNode(node: DependencyNode): DependencyNode | null {
      if (node.children && node.children.length > 0) {
        return node.children[0];
      }
      return null;
    }
  };

  if (typeof window !== 'undefined') {
    interface CustomWindow extends Window {
      testExcessPropagation?: () => void;
      runExcessCascadeTest?: () => Promise<string>;
      debugExcessMap?: () => void;
    }
    
    const customWindow = window as CustomWindow;
    customWindow.testExcessPropagation = manualTestExcessPropagation;
    customWindow.runExcessCascadeTest = testExcessCascade;
    
    customWindow.debugExcessMap = () => {
      console.debug('[EXCESS DEBUG] Current excess map:', excessMap);
      console.debug('[EXCESS DEBUG] Current dependencies:', dependencies);
    };
  }

  const clearSavedData = () => {
    if (!confirm('This will delete ALL saved trees and recipe selections. This cannot be undone. Are you sure?')) {
      return;
    }
    
    localStorage.removeItem('savedDependencies');
    localStorage.removeItem('savedRecipeSelections');
    localStorage.removeItem('savedExcessMap');
    localStorage.removeItem('savedMachineCountMap');
    localStorage.removeItem('savedMachineMultiplierMap');
    localStorage.removeItem('savedExpandedNodes');
    localStorage.removeItem('savedNodeExtensionOverrides');
    
    setExcessMap({});
    setMachineCountMap({});
    setMachineMultiplierMap({});
    setExpandedNodes({});
    setNodeExtensionOverrides({});
    
    dispatch(loadSavedState({ dependencyTrees: {}, accumulatedDependencies: {}, errors: [] }));
    dispatch(loadRecipeSelections({}));
  };

  const handleToggleNodeExtensions = (nodeId: string) => {
    setNodeExtensionOverrides(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleNodeUpdate = (nodeId: string, updatedNode: Partial<DependencyNode>) => {
    dispatch(updateNodeProperties({
      nodeId,
      updatedNode
    }));
  };

  return {
    dependencies,
    recipeSelections,
    viewMode,
    items,
    selectedItem,
    selectedRecipe,
    excessMap,
    machineCountMap,
    machineMultiplierMap,
    expandedNodes,
    showExtensions,
    accumulateExtensions,
    showMachines,
    showMachineMultiplier,
    nodeExtensionOverrides,
    isAddItemCollapsed,
    recentItems,
    forceUpdateCounter,

    setSelectedItem,
    setSelectedRecipe,
    setViewMode,
    setExpandedNodes,
    setShowExtensions,
    setAccumulateExtensions,
    setShowMachines,
    setShowMachineMultiplier,
    setIsAddItemCollapsed,
    updateRecentItems,

    handleCalculate,
    handleTreeRecipeChange,
    handleExcessChange,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleExpandCollapseAll,
    handleDeleteTree,
    handleImportNode,
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions,
    handleUnimport,
    handleCreateNewTree,
  };
};

export default useFactoryPlanner; 