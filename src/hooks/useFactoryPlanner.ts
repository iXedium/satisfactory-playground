import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { getComponents } from '../data/dbQueries';
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
    const collectNodeIds = (node: any) => {
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
    // Update the excess map with the new value
    setExcessMap(prev => ({
      ...prev,
      [nodeId]: excess
    }));
    
    // Find which tree this node belongs to
    const treeId = Object.keys(dependencies.dependencyTrees).find(id => 
      findNodeById(dependencies.dependencyTrees[id], nodeId)
    );
    
    if (!treeId) return;
    
    // Get the tree and the specific node
    const tree = dependencies.dependencyTrees[treeId];
    const node = findNodeById(tree, nodeId);
    
    if (!node) return;
    
    try {
      // We need to completely recalculate the tree with the updated excess values
      // First, create an updated excess map
      const updatedExcessMap = {...excessMap, [nodeId]: excess};
      
      // Get the root node of the tree
      const rootNode = dependencies.dependencyTrees[treeId];
      
      // Recalculate the tree with the updated excess values
      const recalculatedTree = await calculateDependencyTree(
        rootNode.id,
        rootNode.amount,
        rootNode.selectedRecipeId || null,
        recipeSelections,
        0,
        [], // No affected branches - full recalculation
        '',
        updatedExcessMap
      );
      
      if (!recalculatedTree) {
        console.error("Failed to recalculate dependency tree");
        return;
      }
      
      // Ensure the unique ID of the root node stays the same
      recalculatedTree.uniqueId = treeId;
      
      // Calculate accumulated values from the recalculated tree
      const accumulated = calculateAccumulatedFromTree(recalculatedTree);
      
      // Dispatch the update to Redux
      dispatch(setDependencies({
        treeId,
        tree: recalculatedTree,
        accumulated
      }));
    } catch (error) {
      console.error("Error recalculating dependency tree after excess change:", error);
    }
  };

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