import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { getComponents, getRecipesForItem, getRecipeById, getRecipeByOutput } from '../data/dbQueries';
import { Item } from '../data/dexieDB';
import { 
  loadSavedState, 
  setDependencies, 
  deleteTree, 
  updateAccumulated, 
  importNode 
} from '../features/dependencySlice';
import { 
  setRecipeSelection, 
  loadRecipeSelections 
} from '../features/recipeSelectionsSlice';
import { calculateDependencyTree, DependencyNode } from '../utils/calculateDependencyTree';
import { calculateAccumulatedFromTree } from '../utils/calculateAccumulatedFromTree';
import { findAffectedBranches } from '../utils/treeDiffing';

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
    // Find which tree this node belongs to
    const treeId = Object.keys(dependencies.dependencyTrees).find(id => 
      findNodeById(dependencies.dependencyTrees[id], nodeId)
    );

    if (!treeId) return;

    const affectedBranches = findAffectedBranches(dependencies.dependencyTrees[treeId], nodeId);
    
    const updatedRecipeSelections = {
      ...recipeSelections,
      [nodeId]: recipeId
    };
    
    dispatch(setRecipeSelection({ nodeId, recipeId }));
  };

  const handleImportNode = (nodeId: string) => {
    console.log("Importing node:", nodeId);
    
    // Find the source node in all trees
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
    
    // Determine target tree ID
    let targetTreeId = "";
    let isNewTree = false;
    
    // Find a target tree that produces the same item and is not an import
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      if (treeId !== foundTreeId && tree.id === foundNode.id && !tree.isImport) {
        targetTreeId = treeId;
        break;
      }
    }
    
    // If no existing tree found, create a new one
    if (targetTreeId === "") {
      isNewTree = true;
      targetTreeId = `${foundNode.id}-${Date.now()}`;
      
      // Create a new root node for this item
      const newRoot: DependencyNode = {
        id: foundNode.id,
        uniqueId: targetTreeId,
        amount: foundNode.amount,
        isRoot: true,
        isImport: false,
        selectedRecipeId: foundNode.selectedRecipeId,
        availableRecipes: foundNode.availableRecipes,
        excess: excessMap[foundNode.uniqueId] || 0,
        children: []
      };
      
      // Clone children
      if (foundNode.children && foundNode.children.length > 0) {
        foundNode.children.forEach(child => {
          newRoot.children!.push(cloneNodeStructure(child, targetTreeId));
        });
      }
      
      // Add the tree directly to Redux state
      dispatch(setDependencies({
        treeId: targetTreeId,
        tree: newRoot,
        accumulated: calculateAccumulatedFromTree(newRoot)
      }));
      
      // Update excess map
      setExcessMap(prev => ({
        ...prev,
        [targetTreeId]: excessMap[foundNode.uniqueId] || 0
      }));
    }
    
    // Dispatch the import action
    dispatch(importNode({
      sourceTreeId: foundTreeId,
      sourceNodeId: nodeId,
      targetTreeId: targetTreeId,
      isNewTree: isNewTree
    }));
  };
  
  // Helper function to clone a node structure for the new tree
  function cloneNodeStructure(node: DependencyNode, parentId: string): DependencyNode {
    const newId = `${parentId}-${node.id}-${Date.now()}`;
    const clone: DependencyNode = {
      ...node,
      uniqueId: newId,
      isRoot: false,
      isImport: false,
      children: []
    };
    
    // Clone children recursively
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        clone.children!.push(cloneNodeStructure(child, newId));
      });
    }
    
    return clone;
  }
  
  // Helper function to find a node by ID
  const findNodeById = (tree: DependencyNode, targetId: string): DependencyNode | null => {
    if (tree.uniqueId === targetId) {
      return tree;
    }

    if (tree.children) {
      for (const child of tree.children) {
        const found = findNodeById(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

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
    console.debug(`[EXCESS DEBUG] Starting excess change for node ${nodeId} to ${excess}`);
    
    // Update the excess map with the new value
    setExcessMap(prev => {
      console.debug(`[EXCESS DEBUG] Updating excess map: ${nodeId} = ${excess}`);
      return {
        ...prev,
        [nodeId]: excess
      };
    });
    
    // Find which tree this node belongs to
    const treeId = Object.keys(dependencies.dependencyTrees).find(id => 
      findNodeById(dependencies.dependencyTrees[id], nodeId)
    );
    
    console.debug(`[EXCESS DEBUG] Found tree ID: ${treeId}`);
    
    if (!treeId) {
      console.error(`[EXCESS DEBUG] No tree found for node ${nodeId}`);
      return;
    }
    
    // Get the tree and the specific node
    const tree = dependencies.dependencyTrees[treeId];
    const node = findNodeById(tree, nodeId);
    
    if (!node) {
      console.error(`[EXCESS DEBUG] Node ${nodeId} not found in tree ${treeId}`);
      return;
    }
    
    console.debug(`[EXCESS DEBUG] Node found: ${node.id}, amount: ${node.amount}, current excess: ${node.excess}`);
    
    try {
      // Create a copy of the current excess map with the updated value
      const updatedExcessMap = {...excessMap, [nodeId]: excess};
      console.debug(`[EXCESS DEBUG] Created updated excess map with ${Object.keys(updatedExcessMap).length} entries`);
      
      // Get the root node of the tree
      const rootNode = dependencies.dependencyTrees[treeId];
      console.debug(`[EXCESS DEBUG] Root node: ${rootNode.id}, amount: ${rootNode.amount}`);
      
      // Map of original node IDs to preserve during recalculation
      const nodeIdMap = new Map<string, string>();
      
      // First pass: collect all original node IDs in the tree and map them
      const collectNodeIds = (node: DependencyNode) => {
        // Store with both formats - by ID-depth and by uniqueId
        nodeIdMap.set(`${node.id}-${node.uniqueId.split('-').pop()}`, node.uniqueId);
        nodeIdMap.set(node.uniqueId, node.uniqueId); // Direct mapping for treeIds and full uniqueIds
        
        if (node.children) {
          node.children.forEach(collectNodeIds);
        }
      };
      
      collectNodeIds(rootNode);
      console.debug(`[EXCESS DEBUG] Collected ${nodeIdMap.size} node IDs for preservation`);
      
      // Log the excess value for the node we're changing
      console.debug(`[EXCESS DEBUG] Updated excess value for node ${nodeId}: ${updatedExcessMap[nodeId]}`);
      
      // Modified recalculation that preserves original node IDs
      const recalculateTreeWithIds = async (
        itemId: string,
        amount: number,
        recipeId: string | null,
        depth: number = 0,
        parentId: string = '',
        origTreeId: string
      ): Promise<DependencyNode> => {
        // Generate a temporary id to look up the original
        const tempId = `${itemId}-${depth}`;
        
        // For the root node, use the tree ID directly if it matches
        let origId: string;
        if (depth === 0 && origTreeId) {
          origId = origTreeId; // Use tree ID for the root node
          console.debug(`[EXCESS DEBUG] Using treeId ${origTreeId} for root node lookup`);
        } else {
          // For other nodes, try to find the original ID from our map
          origId = nodeIdMap.get(tempId) || `${parentId ? parentId+'-' : ''}${itemId}-${depth}`;
        }
        
        // Check excess for this node - first try direct lookup by uniqueId, then by generated ID
        const nodeExcess = nodeId === origId 
          ? excess // Use the new excess value directly for the node being changed
          : (updatedExcessMap[origId] || 0);
        
        console.debug(`[EXCESS DEBUG] Processing node: ${itemId}, origId: ${origId}, excess: ${nodeExcess}`);
        
        // Get recipes for this item
        const availableRecipes = await getRecipesForItem(itemId);
        
        let recipe = null;
        if (recipeId) {
          recipe = await getRecipeById(recipeId);
        } else if (recipeSelections[origId]) {
          recipe = await getRecipeById(recipeSelections[origId]);
        } else {
          recipe = await getRecipeByOutput(itemId);
        }
        
        if (!recipe) {
          console.debug(`[EXCESS DEBUG] No recipe found for ${itemId}, returning leaf node`);
          return {
            id: itemId,
            amount,
            uniqueId: origId,
            availableRecipes,
            children: [],
            excess: nodeExcess
          };
        }
        
        // Calculate production based on excess
        const outputAmount = recipe.out[itemId] ?? 1;
        const cyclesNeeded = (amount + nodeExcess) / (outputAmount as number);
        
        console.debug(`[EXCESS DEBUG] ${itemId}: amount=${amount}, excess=${nodeExcess}, output=${outputAmount}, cycles=${cyclesNeeded}`);
        
        // Recalculate children
        const children = await Promise.all(
          Object.entries(recipe.in).map(([inputItem, inputAmount]) => {
            const childAmount = ((inputAmount as number) ?? 0) * cyclesNeeded;
            console.debug(`[EXCESS DEBUG] Child ${inputItem}: amount=${childAmount} (${inputAmount} * ${cyclesNeeded})`);
            
            return recalculateTreeWithIds(
              inputItem,
              childAmount,
              null,
              depth + 1,
              origId,
              origTreeId
            );
          })
        );
        
        // Add byproducts
        const byproducts = Object.entries(recipe.out)
          .filter(([outputItem]) => outputItem !== itemId)
          .map(([outputItem, outputAmount]) => {
            const byproductAmount = -((outputAmount as number) * cyclesNeeded);
            console.debug(`[EXCESS DEBUG] Byproduct ${outputItem}: amount=${byproductAmount}`);
            
            return {
              id: outputItem,
              amount: byproductAmount,
              uniqueId: `${origId}-${outputItem}-${depth}`,
              isByproduct: true,
              children: [],
              excess: 0
            } as DependencyNode;
          });
        
        return {
          id: itemId,
          amount,
          uniqueId: origId,
          isRoot: depth === 0,
          selectedRecipeId: recipe.id,
          availableRecipes,
          children: [...children, ...byproducts],
          excess: nodeExcess
        };
      };
      
      console.debug(`[EXCESS DEBUG] Starting tree recalculation`);
      // Recalculate tree preserving node IDs
      const recalculatedTree = await recalculateTreeWithIds(
        rootNode.id,
        rootNode.amount,
        rootNode.selectedRecipeId || null,
        0,
        '',
        treeId
      );
      
      if (!recalculatedTree) {
        console.error(`[EXCESS DEBUG] Failed to recalculate dependency tree`);
        return;
      }
      
      console.debug(`[EXCESS DEBUG] Tree recalculated successfully`);
      
      // Ensure the unique ID of the root node is the tree ID
      recalculatedTree.uniqueId = treeId;
      
      // Calculate accumulated values 
      const accumulated = calculateAccumulatedFromTree(recalculatedTree);
      console.debug(`[EXCESS DEBUG] Accumulated values calculated: ${Object.keys(accumulated).length} entries`);
      
      // Add a test function to compare trees before and after
      const compareTreeNodes = (original: DependencyNode, recalculated: DependencyNode, path = "") => {
        const currentPath = path ? `${path} > ${recalculated.id}` : recalculated.id;
        
        const originalExcess = original.excess || 0;
        const recalculatedExcess = recalculated.excess || 0;
        
        if (original.uniqueId === nodeId || recalculated.uniqueId === nodeId) {
          console.debug(`[EXCESS DEBUG] Changed node at ${currentPath}: excess ${originalExcess} -> ${recalculatedExcess}`);
        }
        
        // Compare child counts
        const originalChildCount = original.children?.length || 0;
        const recalculatedChildCount = recalculated.children?.length || 0;
        
        if (originalChildCount !== recalculatedChildCount) {
          console.warn(`[EXCESS DEBUG] Child count mismatch at ${currentPath}: ${originalChildCount} vs ${recalculatedChildCount}`);
        }
        
        // Compare amounts
        if (original.amount !== recalculated.amount) {
          console.debug(`[EXCESS DEBUG] Amount changed at ${currentPath}: ${original.amount} -> ${recalculated.amount}`);
        }
        
        // Recursively compare children
        if (original.children && recalculated.children) {
          for (let i = 0; i < Math.min(original.children.length, recalculated.children.length); i++) {
            compareTreeNodes(original.children[i], recalculated.children[i], currentPath);
          }
        }
      };
      
      // Compare the original and recalculated trees
      console.debug(`[EXCESS DEBUG] Comparing trees:`);
      compareTreeNodes(tree, recalculatedTree);
      
      // Force a deep clone of the tree to ensure React picks up the changes
      const clonedTree = JSON.parse(JSON.stringify(recalculatedTree));
      
      // Dispatch the update to Redux to trigger UI refresh
      console.debug(`[EXCESS DEBUG] Dispatching tree update to Redux`);
      dispatch(setDependencies({
        treeId,
        tree: clonedTree,
        accumulated
      }));
      
      // Force UI refresh with a slight delay
      setTimeout(() => {
        console.debug(`[EXCESS DEBUG] Forcing UI refresh`);
        const treeViewElement = document.getElementById('tree-view');
        if (treeViewElement) {
          treeViewElement.style.opacity = '0.99';
          setTimeout(() => {
            if (treeViewElement) treeViewElement.style.opacity = '1';
          }, 10);
        }
      }, 50);
    } catch (error) {
      console.error(`[EXCESS DEBUG] Error recalculating dependency tree after excess change:`, error);
    }
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
    let originalChildAmount = childNode.amount;
    
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
    // Clear all local storage items
    localStorage.removeItem('savedDependencies');
    localStorage.removeItem('savedRecipeSelections');
    localStorage.removeItem('savedExcessMap');
    localStorage.removeItem('savedMachineCountMap');
    localStorage.removeItem('savedMachineMultiplierMap');
    localStorage.removeItem('savedViewMode');
    localStorage.removeItem('savedExpandedNodes');
    localStorage.removeItem('savedNodeExtensionOverrides');
    // Keep recent items - don't remove from localStorage
    
    // Clear local state but keep recentItems
    setExcessMap({});
    setMachineCountMap({});
    setMachineMultiplierMap({});
    setExpandedNodes({});
    setNodeExtensionOverrides({});
    
    // Clear Redux state by loading empty data
    dispatch(loadSavedState({ dependencyTrees: {}, accumulatedDependencies: {} }));
    dispatch(loadRecipeSelections({}));
  };

  // Toggle extensions visibility for a specific node
  const handleToggleNodeExtensions = (nodeId: string) => {
    setNodeExtensionOverrides(prev => {
      const currentValue = prev[nodeId] ?? showExtensions;
      return {
        ...prev,
        [nodeId]: !currentValue
      };
    });
  };

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
    handleImportNode,
    clearSavedData,
    handleToggleNodeExtensions
  };
};

export default useFactoryPlanner; 