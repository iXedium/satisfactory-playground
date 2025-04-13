/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { getComponents, getRecipesForItem, getRecipeById, getRecipeByOutput } from '../../../data';
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

type ViewMode = "accumulated" | "tree";

export const useFactoryPlanner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [isAddItemCollapsed, setIsAddItemCollapsed] = useState(false);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  // Recent items state
  const [recentItems, setRecentItems] = useState<string[]>([]);
  
  // Node specific state
  const [excessMap, setExcessMap] = useState<Record<string, number>>({});
  const [machineCountMap, setMachineCountMap] = useState<Record<string, number>>({});
  const [machineMultiplierMap, setMachineMultiplierMap] = useState<Record<string, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // Display options
  const [showExtensions, setShowExtensions] = useState(false);
  const [accumulateExtensions, setAccumulateExtensions] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  const [showMachineMultiplier, setShowMachineMultiplier] = useState(false);
  const [nodeExtensionOverrides, setNodeExtensionOverrides] = useState<Record<string, boolean>>({});

  // Load saved state
  useEffect(() => {
    try {
      // Load saved dependencies
      const savedDependencies = localStorage.getItem('savedDependencies');
      if (savedDependencies) {
        const parsed = JSON.parse(savedDependencies);
        dispatch(loadSavedState(parsed));
      }
      
      // Load saved recipe selections
      const savedRecipeSelections = localStorage.getItem('savedRecipeSelections');
      if (savedRecipeSelections) {
        const parsed = JSON.parse(savedRecipeSelections);
        dispatch(loadRecipeSelections(parsed));
      }
      
      // Load saved excess map
      const savedExcessMap = localStorage.getItem('savedExcessMap');
      if (savedExcessMap) {
        setExcessMap(JSON.parse(savedExcessMap));
      }
      
      // Load saved machine maps
      const savedMachineCountMap = localStorage.getItem('savedMachineCountMap');
      if (savedMachineCountMap) {
        setMachineCountMap(JSON.parse(savedMachineCountMap));
      }
      
      const savedMachineMultiplierMap = localStorage.getItem('savedMachineMultiplierMap');
      if (savedMachineMultiplierMap) {
        setMachineMultiplierMap(JSON.parse(savedMachineMultiplierMap));
      }
      
      // Load UI preferences
      const savedViewMode = localStorage.getItem('savedViewMode');
      if (savedViewMode) {
        setViewMode(savedViewMode as ViewMode);
      }
      
      const savedExpandedNodes = localStorage.getItem('savedExpandedNodes');
      if (savedExpandedNodes) {
        setExpandedNodes(JSON.parse(savedExpandedNodes));
      }

      const savedNodeExtensionOverrides = localStorage.getItem('savedNodeExtensionOverrides');
      if (savedNodeExtensionOverrides) {
        setNodeExtensionOverrides(JSON.parse(savedNodeExtensionOverrides));
      }
      
      // Load saved display options
      const savedShowExtensions = localStorage.getItem('savedShowExtensions');
      if (savedShowExtensions) {
        setShowExtensions(JSON.parse(savedShowExtensions));
      }
      
      const savedAccumulateExtensions = localStorage.getItem('savedAccumulateExtensions');
      if (savedAccumulateExtensions) {
        setAccumulateExtensions(JSON.parse(savedAccumulateExtensions));
      }
      
      const savedShowMachines = localStorage.getItem('savedShowMachines');
      if (savedShowMachines) {
        setShowMachines(JSON.parse(savedShowMachines));
      }
      
      const savedShowMachineMultiplier = localStorage.getItem('savedShowMachineMultiplier');
      if (savedShowMachineMultiplier) {
        setShowMachineMultiplier(JSON.parse(savedShowMachineMultiplier));
      }

      // Load saved recent items
      const savedRecentItems = localStorage.getItem('savedRecentItems');
      if (savedRecentItems) {
        setRecentItems(JSON.parse(savedRecentItems));
      }
    } catch (error) {
      console.error("Error loading saved state:", error);
    }
  }, [dispatch]);
  
  // Save state to localStorage
  useEffect(() => {
    // Only save if we have dependencies to save
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
  
  useEffect(() => {
    if (Object.keys(excessMap).length > 0) {
      try {
        localStorage.setItem('savedExcessMap', JSON.stringify(excessMap));
      } catch (error) {
        console.error("Error saving excess map:", error);
        localStorage.removeItem('savedExcessMap');
      }
    }
  }, [excessMap]);
  
  useEffect(() => {
    try {
      if (Object.keys(machineCountMap).length > 0) {
        localStorage.setItem('savedMachineCountMap', JSON.stringify(machineCountMap));
      }
      
      if (Object.keys(machineMultiplierMap).length > 0) {
        localStorage.setItem('savedMachineMultiplierMap', JSON.stringify(machineMultiplierMap));
      }
    } catch (error) {
      console.error("Error saving machine maps:", error);
      localStorage.removeItem('savedMachineCountMap');
      localStorage.removeItem('savedMachineMultiplierMap');
    }
  }, [machineCountMap, machineMultiplierMap]);
  
  useEffect(() => {
    try {
      localStorage.setItem('savedViewMode', viewMode);
      localStorage.setItem('savedExpandedNodes', JSON.stringify(expandedNodes));
      if (Object.keys(nodeExtensionOverrides).length > 0) {
        localStorage.setItem('savedNodeExtensionOverrides', JSON.stringify(nodeExtensionOverrides));
      }
    } catch (error) {
      console.error("Error saving UI preferences:", error);
      localStorage.removeItem('savedViewMode');
      localStorage.removeItem('savedExpandedNodes');
      localStorage.removeItem('savedNodeExtensionOverrides');
    }
  }, [viewMode, expandedNodes, nodeExtensionOverrides]);

  // Save recent items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('savedRecentItems', JSON.stringify(recentItems));
    } catch (error) {
      console.error("Error saving recent items:", error);
      localStorage.removeItem('savedRecentItems');
    }
  }, [recentItems]);

  // Save display options
  useEffect(() => {
    try {
      localStorage.setItem('savedShowExtensions', JSON.stringify(showExtensions));
      localStorage.setItem('savedAccumulateExtensions', JSON.stringify(accumulateExtensions));
      localStorage.setItem('savedShowMachines', JSON.stringify(showMachines));
      localStorage.setItem('savedShowMachineMultiplier', JSON.stringify(showMachineMultiplier));
    } catch (error) {
      console.error("Error saving display options:", error);
    }
  }, [showExtensions, accumulateExtensions, showMachines, showMachineMultiplier]);

  // Initial load of items from the database
  useEffect(() => {
    getComponents().then(loadedItems => {
      if (loadedItems) {
        setItems(loadedItems);
      }
    });
  }, []);

  // Update recent items when an item is selected
  const updateRecentItems = (itemId: string) => {
    setRecentItems(prev => {
      // Remove the item if it already exists
      const filtered = prev.filter(id => id !== itemId);
      // Add the item to the beginning (most recent first)
      const updated = [itemId, ...filtered];
      // Limit to 10 items
      return updated.slice(0, 10);
    });
  };

  // Generate a unique ID for a new tree
  const generateTreeId = (itemId: string): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `tree-${itemId}-${timestamp}-${randomSuffix}`;
  };

  // Update calculate handler with dependency checking
  const handleCalculate = async () => {
    if (!selectedItem || !selectedRecipe) return;
    
    // Add selected item to recent items
    updateRecentItems(selectedItem);
    
    try {
      // Generate a truly unique ID for this tree
      const treeId = generateTreeId(selectedItem);
      
      // Create a unique parentId prefix for all nodes in this tree to ensure
      // they don't conflict with nodes in other trees
      const uniquePrefix = `${treeId}`;
      
      // Get the recipe explicitly for the root node
      const rootRecipe = await getRecipeById(selectedRecipe);
      if (!rootRecipe) {
        console.error(`Could not find recipe ${selectedRecipe} for ${selectedItem}`);
        return;
      }
      
      console.log(`[CALC DEBUG] Retrieved recipe for ${selectedItem}:`, 
        { id: rootRecipe.id, inputs: Object.keys(rootRecipe.in), outputs: Object.keys(rootRecipe.out) });
      
      // Calculate the dependency tree with amount set to 0
      const tree = await calculateDependencyTree(
        selectedItem,
        0, // Set initial amount to 0 instead of itemCount
        selectedRecipe,
        recipeSelections,
        0,
        [],
        uniquePrefix, // Use unique prefix as parent ID
        {} // Use empty excess map instead of inheriting existing excess values
      );
      
      if (!tree) {
        console.error("Failed to calculate dependency tree");
        return;
      }
      
      // Update the tree's uniqueId to match the treeId
      tree.uniqueId = treeId;
      
      // Make sure the recipe is explicitly included in the root node
      tree.recipe = rootRecipe;
      tree.selectedRecipeId = selectedRecipe;
      
      // Calculate accumulated values from the tree
      const accumulated = calculateAccumulatedFromTree(tree);
      
      // Update the tree in Redux
      dispatch(setDependencies({
        treeId,
        tree,
        accumulated
      }));
      
      // Save recipe selection to Redux
      dispatch(setRecipeSelection({
        nodeId: selectedItem,
        recipeId: selectedRecipe
      }));
      
      // Set default values for machine count and multiplier (1) and excess (0) for this new tree
      const resetMachineValues = (node: DependencyNode) => {
        // Set default machine count and multiplier for this node
        setMachineCountMap(prev => ({
          ...prev,
          [node.uniqueId]: 1
        }));
        
        setMachineMultiplierMap(prev => ({
          ...prev,
          [node.uniqueId]: 1
        }));
        
        // Set default excess for this node
        setExcessMap(prev => ({
          ...prev,
          [node.uniqueId]: 0
        }));
        
        // Process children recursively
        if (node.children) {
          node.children.forEach(resetMachineValues);
        }
      };
      
      // Reset values for the entire tree
      resetMachineValues(tree);
      
      // Wait for state update and then recalculate heights
      setTimeout(() => {
        const treeViewElement = document.getElementById('tree-view');
        if (treeViewElement) {
          treeViewElement.style.opacity = '0.99';
          setTimeout(() => {
            if (treeViewElement) treeViewElement.style.opacity = '1';
          }, 10);
        }
      }, 100);
    } catch (error) {
      console.error("Error calculating dependency tree:", error);
    }
  };

  const handleTreeRecipeChange = async (nodeId: string, recipeId: string) => {
    console.log(`[Recipe Change] Node: ${nodeId}, New Recipe ID: ${recipeId}`);
    const currentTrees = dependencies.dependencyTrees;
    
    // Find the tree and node
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

    // Update recipe selection map immediately for consistency
    dispatch(setRecipeSelection({ nodeId, recipeId }));

    // Create a deep copy of the tree to modify
    const treeCopy = JSON.parse(JSON.stringify(currentTree)) as DependencyNode;

    // Function to find and update the node in the copied tree
    const updateNodeRecipe = (node: DependencyNode): boolean => {
      if (node.uniqueId === nodeId) {
        node.recipe = newRecipe; // Update recipe object
        // node.selectedRecipeId = recipeId; // Keep for reference if needed elsewhere?
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
      return; // Should not happen if node was found initially
    }

    // Recalculate the entire tree based on the copied and modified structure
    // Use the updated recipe map
    const updatedRecipeSelections = { ...recipeSelections, [nodeId]: recipeId };
    
    try {
      const recalculatedTree = await calculateDependencyTree(
        treeCopy.id,
        treeCopy.amount,
        treeCopy.recipe?.id ?? null, // Pass root recipe ID
        updatedRecipeSelections, // Pass updated map
        0, // Reset depth
        [], // No specific affected branches initially
        '',
        excessMap, // Pass current excess map
        {}, // Empty legacy import map
        currentTrees // Pass all trees for reference handling
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

  // Import a node from one tree to another
  const handleImportNode = useCallback((
    sourceNode: DependencyNode, 
    targetTreeId: string, 
    sourceTreeId: string
  ) => {
    if (!sourceNode || !targetTreeId || !sourceTreeId) {
      console.error('[IMPORT ERROR] Missing required parameters for import', { sourceNode, targetTreeId, sourceTreeId });
      return;
    }
    
    console.log('[IMPORT DEBUG] Dispatching import action with parameters:', {
      nodeId: sourceNode.uniqueId,
      sourceTreeId,
      targetTreeId,
      sourceNodeId: sourceNode.id
    });
    
    // Check if the target tree exists
    const targetTree = dependencies.dependencyTrees[targetTreeId];
    if (!targetTree) {
      console.warn(`[IMPORT WARNING] Target tree ${targetTreeId} not found in current state. This may be expected if the tree was just created.`);
      console.log('[IMPORT DEBUG] Available tree IDs:', Object.keys(dependencies.dependencyTrees));
    } else {
      console.log(`[IMPORT DEBUG] Target tree found: ${targetTreeId} (${targetTree.id}), current amount: ${targetTree.amount}`);
      
      // Check for existing imports to this target
      let totalImports = 0;
      Object.values(dependencies.dependencyTrees).forEach(tree => {
        const findImports = (node: DependencyNode): number => {
          let amount = 0;
          
          if ((node.importReference && node.importReference.targetTreeId === targetTreeId) ||
              (node.isImport && node.importedFrom === targetTreeId)) {
            amount += node.amount || 0;
          }
          
          if (node.children) {
            node.children.forEach(child => {
              amount += findImports(child);
            });
          }
          
          return amount;
        };
        
        totalImports += findImports(tree);
      });
      
      console.log(`[IMPORT DEBUG] Current total imports to ${targetTreeId}: ${totalImports}`);
      console.log(`[IMPORT DEBUG] After adding this import (${sourceNode.amount || 0}), total should be: ${totalImports + (sourceNode.amount || 0)}`);
    }
    
    // Use the slice's action to maintain compatibility with existing code
    dispatch(importNodeAction({
      nodeId: sourceNode.uniqueId,
      sourceTreeId,
      targetTreeId,
      shouldImport: true
    }));
  }, [dispatch, dependencies.dependencyTrees]);

  // Unimport node action
  const handleUnimportNode = useCallback((
    sourceNode: DependencyNode,
    sourceTreeId: string
  ) => {
    if (!sourceNode || !sourceTreeId) return;
    
    // Determine if this is an import node
    const isImportNode = !!(sourceNode.isImport || (sourceNode.importReference && Object.keys(sourceNode.importReference).length > 0));
    
    if (!isImportNode) {
      console.warn('Not an import node, cannot unimport', sourceNode);
      return;
    }
    
    // Get the target tree ID from the node
    const targetTreeId = sourceNode.importedFrom || sourceNode.importReference?.targetTreeId;
    if (!targetTreeId) {
      console.error('Cannot unimport - missing target tree ID');
      return;
    }
    
    dispatch(unimportNode({
      nodeId: sourceNode.uniqueId,
      sourceTreeId,
      targetTreeId
    }));
  }, [dispatch]);

  // Handle expanding/collapsing all nodes
  const handleExpandCollapseAll = (expand: boolean) => {
    // Create a map of all node IDs across all trees
    const newExpandedNodes: Record<string, boolean> = {};
    
    // Traverse all trees and collect node IDs
    const collectNodeIds = (node: DependencyNode) => {
      newExpandedNodes[node.uniqueId] = expand;
      
      if (node.children) {
        node.children.forEach(collectNodeIds);
      }
    };
    
    // Process all trees
    Object.values(dependencies.dependencyTrees).forEach(collectNodeIds);
    
    // Update the expandedNodes state
    setExpandedNodes(newExpandedNodes);
  };

  // Handle machine count changes
  const handleMachineCountChange = (nodeId: string, count: number) => {
    setMachineCountMap(prev => ({
      ...prev,
      [nodeId]: count
    }));
  };

  // Handle machine multiplier changes
  const handleMachineMultiplierChange = (nodeId: string, multiplier: number) => {
    setMachineMultiplierMap(prev => ({
      ...prev,
      [nodeId]: multiplier
    }));
  };

  // Handle tree deletion
  const handleDeleteTree = (treeId: string) => {
    dispatch(deleteTree({ treeId }));
  };

  // Handle excess change
  const handleExcessChange = async (nodeId: string, excess: number) => {
    console.log(`[SEQUENCE DEBUG] Step 1: handleExcessChange called for ${nodeId} with excess ${excess}`);
    
    // Step 2: Update the UI state first
    console.log(`[SEQUENCE DEBUG] Step 2: Setting excess map state`);
    setExcessMap(prevMap => {
      console.log(`[SEQUENCE DEBUG] Step 2.1: Inside setExcessMap callback`);
      return { ...prevMap, [nodeId]: excess };
    });
    
    // Wait for state update to complete
    console.log(`[SEQUENCE DEBUG] Step 2.2: Waiting for state update to process`);
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log(`[SEQUENCE DEBUG] Step 2.3: State update processed`);
    
    // Step 3: Find the tree for this node
    console.log(`[SEQUENCE DEBUG] Step 3: Finding tree ID for node ${nodeId}`);
    
    // Check if this node ID might be a tree ID itself (for root nodes)
    if (dependencies.dependencyTrees[nodeId]) {
      // This is a tree ID, not a node ID - we need to use the root node's uniqueId instead
      const tree = dependencies.dependencyTrees[nodeId];
      console.log(`[SEQUENCE DEBUG] The node ID is actually a tree ID. Using root node's uniqueId: ${tree.uniqueId}`);
      
      // Log the node details for debugging
      console.log(`[SEQUENCE DEBUG] Root node details:`, {
        id: tree.id,
        uniqueId: tree.uniqueId,
        amount: tree.amount,
        excess: tree.excess,
        hasRecipe: !!tree.recipe,
        recipeId: tree.selectedRecipeId
      });
      
      // Update the excess map for the tree's uniqueId as well to ensure consistency
      setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess }));
      
      // Use the tree's uniqueId for updating production
      dispatch(updateTreeProduction(tree.uniqueId, nodeId, 'excess', excess));
      
      // Force a UI refresh after state updates
      console.log(`[SEQUENCE DEBUG] Step 7: Forcing UI refresh after state updates`);
      setTimeout(() => {
        setForceUpdateCounter(prev => prev + 1);
      }, 50);
      
      return;
    }
    
    // Standard case: find the tree containing this node
    let foundTreeId = '';
    let foundNode = null;

    // Loop through all trees to find the node
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      const node = findNodeById(tree, nodeId);
      if (node) {
        foundTreeId = treeId;
        foundNode = node;
        
        // Log the node details for debugging
        console.log(`[SEQUENCE DEBUG] Found node details:`, {
          id: node.id,
          uniqueId: node.uniqueId,
          amount: node.amount,
          excess: node.excess,
          hasRecipe: !!node.recipe,
          recipeId: node.selectedRecipeId,
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
    
    // Use the correct node ID - the one passed to this function, not the tree ID
    // This ensures we're updating the specific node, not trying to update the whole tree
    console.log(`[SEQUENCE DEBUG] Step 5: Using node ID: ${nodeId} in tree: ${foundTreeId}`);
    
    // Use the new sequential production update system
    dispatch(updateTreeProduction(nodeId, foundTreeId, 'excess', excess));
    
    // Force a UI refresh after state updates
    console.log(`[SEQUENCE DEBUG] Step 7: Forcing UI refresh after state updates`);
      setTimeout(() => {
      // Force component re-render by updating a dummy state value
      setForceUpdateCounter(prev => prev + 1);
      }, 50);
  };

  // Helper function to find all import nodes in a tree
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

  // Unit test function for excess propagation
  const testExcessCascade = async () => {
    // Step 1: Find a tree to test with
    const anyTreeId = Object.keys(dependencies.dependencyTrees)[0];
    if (!anyTreeId) {
      console.error("[TEST] No trees found for testing");
      return "FAILED: No trees available for testing";
    }
    
    // Step 2: Get the root node and a child node
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
    
    // Step 3: Record initial state
    const initialRootExcess = excessMap[rootNode.uniqueId] || 0;
    const initialChildExcess = excessMap[childNode.uniqueId] || 0;
    
    // Set test values
    const testRootExcess = initialRootExcess + 10;
    
    // Step 4: Run test for root node excess change
    console.log("\n[TEST] PART 1: Testing root node excess change");
    console.log(`  - Changing root excess from ${initialRootExcess} to ${testRootExcess}`);
    
    // Save initial child amounts
    const originalChildAmount = childNode.amount;
    
    // Change root excess
    await handleExcessChange(rootNode.uniqueId, testRootExcess);
    
    // Wait for state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if child amount changed in response to root excess change
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
    
    // Reset for second test
    await handleExcessChange(rootNode.uniqueId, initialRootExcess);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 5: Run test for child node excess change
    console.log("\n[TEST] PART 2: Testing child node excess change");
    const testChildExcess = initialChildExcess + 10;
    console.log(`  - Changing child excess from ${initialChildExcess} to ${testChildExcess}`);
    
    await handleExcessChange(childNode.uniqueId, testChildExcess);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const childTestResult = excessMap[childNode.uniqueId] === testChildExcess;
    
    console.log("\n[TEST] Child excess test results:");
    console.log(`  - Child excess changed: ${initialChildExcess} -> ${excessMap[childNode.uniqueId]}`);
    console.log(`  - Child excess should be ${testChildExcess}: ${childTestResult ? "SUCCESS" : "FAILED"}`);
    
    // Reset to original values
    await handleExcessChange(childNode.uniqueId, initialChildExcess);
    
    // Overall result
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

  // Test excess propagation (can be run from browser console for testing)
  const manualTestExcessPropagation = () => {
    // Find a node to test with
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
    
    // Test increasing excess
    const initialExcess = excessMap[nodeToTest.uniqueId] || 0;
    const newExcess = initialExcess + 10;
    
    console.debug(`[TEST] Changing excess from ${initialExcess} to ${newExcess}`);
    handleExcessChange(nodeToTest.uniqueId, newExcess);
    
    // Helper to find the first non-root node
    function findFirstNonRootNode(node: DependencyNode): DependencyNode | null {
      if (node.children && node.children.length > 0) {
        // Return the first child
        return node.children[0];
      }
      return null;
    }
  };

  // Make test functions available on window for debugging
  if (typeof window !== 'undefined') {
    // Use a specific interface to define the additions to Window
    interface CustomWindow extends Window {
      testExcessPropagation?: () => void;
      runExcessCascadeTest?: () => Promise<string>;
      debugExcessMap?: () => void;
    }
    
    const customWindow = window as CustomWindow;
    customWindow.testExcessPropagation = manualTestExcessPropagation;
    customWindow.runExcessCascadeTest = testExcessCascade;
    
    // Add a debug function to dump the excess map
    customWindow.debugExcessMap = () => {
      console.debug('[EXCESS DEBUG] Current excess map:', excessMap);
      console.debug('[EXCESS DEBUG] Current dependencies:', dependencies);
    };
  }

  // Clear all saved data
  const clearSavedData = () => {
    if (!confirm('This will delete ALL saved trees and recipe selections. This cannot be undone. Are you sure?')) {
      return;
    }
    
    // Clear local storage
    localStorage.removeItem('savedDependencies');
    localStorage.removeItem('savedRecipeSelections');
    localStorage.removeItem('savedExcessMap');
    localStorage.removeItem('savedMachineCountMap');
    localStorage.removeItem('savedMachineMultiplierMap');
    localStorage.removeItem('savedViewMode');
    localStorage.removeItem('savedExpandedNodes');
    localStorage.removeItem('savedNodeExtensionOverrides');
    localStorage.removeItem('savedShowExtensions');
    localStorage.removeItem('savedAccumulateExtensions');
    localStorage.removeItem('savedShowMachines');
    localStorage.removeItem('savedShowMachineMultiplier');
    // Keep recent items - don't remove from localStorage
    
    // Clear local state but keep recentItems
    setExcessMap({});
    setMachineCountMap({});
    setMachineMultiplierMap({});
    setExpandedNodes({});
    setNodeExtensionOverrides({});
    setShowExtensions(false);
    setAccumulateExtensions(true);
    setShowMachines(true);
    setShowMachineMultiplier(false);
    
    // Clear Redux state by loading empty data
    dispatch(loadSavedState({ dependencyTrees: {}, accumulatedDependencies: {}, errors: [] }));
    dispatch(loadRecipeSelections({}));
  };

  // Toggle extensions visibility for a specific node
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

  // Create a new tree function
  const handleCreateNewTree = (
    itemId: string, 
    amount: number, 
    treeId: string = generateTreeId(itemId),
    selectedRecipeId: string | null = null // Keep param but convert to recipe obj
  ) => {
    console.log('[handleCreateNewTree] Creating new tree', { itemId, amount, treeId, selectedRecipeId });
    updateRecentItems(itemId);
    const calculate = async () => {
      try {
        // Convert selectedRecipeId to recipe object if provided
        const rootRecipe = selectedRecipeId ? await getRecipeById(selectedRecipeId) : null;
        
        const tree = await calculateDependencyTree(
          itemId,
          amount,
          rootRecipe?.id ?? null, // Pass recipe ID if available
          recipeSelections,
          0, [], '', excessMap, {},
          dependencies.dependencyTrees // Pass existing trees
        );

        if (!tree) {
          console.error("Failed to calculate dependency tree for new item");
          return;
        }
        
        // If rootRecipe was provided, ensure it's set on the root node
        if (rootRecipe) {
          tree.recipe = rootRecipe;
        }

        const accumulated = calculateAccumulatedFromTree(tree);
        dispatch(setDependencies({ treeId, tree, accumulated }));
        console.log(`[handleCreateNewTree] New tree ${treeId} created and dispatched.`);
      } catch (error) {
        console.error("Error calculating dependencies for new tree:", error);
      }
    };
    calculate();
  };

  // Import a node function
  const importNodeForTree = (nodeId: string) => {
    console.log(`Importing node ${nodeId}`);
    
    // Find the node in all trees
    let foundNode: DependencyNode | null = null;
    let foundTreeId = "";
    
    // Find the node in all trees
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      const node = findNodeById(tree, nodeId);
      if (node) {
        foundNode = node;
        foundTreeId = treeId;
        break;
      }
    }
    
    if (!foundNode || !foundTreeId) {
      console.error("Could not find node to import");
      return;
    }
    
    console.log(`[IMPORT DEBUG] Found node to import:`, {
      id: foundNode.id,
      uniqueId: foundNode.uniqueId,
      treeId: foundTreeId
    });
    
    // Determine target tree ID
    let targetTreeId = "";
    
    // Find a target tree that produces the same item and is not an import
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      if (treeId !== foundTreeId && tree.id === foundNode.id && !tree.isImport) {
        targetTreeId = treeId;
        console.log(`[IMPORT DEBUG] Found existing target tree: ${targetTreeId} with id ${tree.id}`);
        break;
      }
    }
    
    // If no existing tree found, create a new one
    if (targetTreeId === "") {
      // Create a new root node for this item and add it to the tree
      const newTreeId = `${foundNode.id}-${Date.now()}`;
      console.log(`[IMPORT DEBUG] No existing tree found, creating new tree with ID: ${newTreeId}`);
      
      // Clone and create a new tree
      handleCreateNewTree(foundNode.id, foundNode.amount, newTreeId, foundNode.selectedRecipeId || null);
      
      // Set the target tree ID to the newly created tree
      targetTreeId = newTreeId;
    }
    
    console.log(`[IMPORT DEBUG] Final target tree ID: ${targetTreeId}`);
    
    // Use the new import action
    handleImportNode(foundNode, targetTreeId, foundTreeId);
  };

  // Handle unimporting a node
  const handleUnimport = (nodeId: string) => {
    // Find the node and its tree
    let sourceNode: DependencyNode | null = null;
    let sourceTreeId = '';
    
    // Search through all trees
    Object.entries(dependencies.dependencyTrees).forEach(([treeId, tree]) => {
      const node = findNodeById(tree, nodeId);
      if (node) {
        sourceNode = node;
        sourceTreeId = treeId;
      }
    });
    
    // If node not found or not an import node, exit
    if (!sourceNode || !sourceTreeId) {
      console.error('Node not found');
      return;
    }
    
    // Check if it's an import node with proper type assertion
    const isImportNode = !!(
      (sourceNode as any).isImport || 
      ((sourceNode as any).importReference && 
      Object.keys((sourceNode as any).importReference).length > 0)
    );
    
    if (!isImportNode) {
      console.error('Not an import node');
      return;
    }
    
    // Use the new unimport function
    handleUnimportNode(sourceNode, sourceTreeId);
  };

  // Wrapper for compatibility with UI components
  const handleImportNodeById = useCallback((nodeId: string) => {
    importNodeForTree(nodeId);
  }, [importNodeForTree]);

  return {
    // State values
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

    // Setters
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

    // Handlers
    handleCalculate,
    handleTreeRecipeChange,
    handleExcessChange,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleExpandCollapseAll,
    handleDeleteTree,
    handleImportNode: handleImportNodeById, // Use the wrapper for UI compatibility
    handleNodeUpdate,
    clearSavedData,
    handleToggleNodeExtensions,
    handleUnimport,
    handleCreateNewTree,
    importNodeForTree
  };
};

export default useFactoryPlanner; 