/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { getComponents, getRecipesForItem, getRecipeById, getRecipeByOutput } from '../data/dbQueries';
import { Item } from '../data/dexieDB';
import { 
  loadSavedState, 
  setDependencies, 
  deleteTree, 
  importNode,
  updateNodeProperties,
  unimportNode,
  updateTreeProduction
} from '../features/dependencySlice';
import { 
  setRecipeSelection, 
  loadRecipeSelections 
} from '../features/recipeSelectionsSlice';
import { calculateDependencyTree, DependencyNode, findNodeById } from '../utils/calculateDependencyTree';
import { calculateAccumulatedFromTree } from '../utils/calculateAccumulatedFromTree';

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
    // Find which tree this node belongs to
    const treeId = Object.keys(dependencies.dependencyTrees).find(id => 
      findNodeById(dependencies.dependencyTrees[id], nodeId)
    );

    if (!treeId) {
      console.error(`No tree found for node ${nodeId}`);
      return;
    }

    // Get the tree and the specific node
    const tree = dependencies.dependencyTrees[treeId];
    const node = findNodeById(tree, nodeId);

    if (!node) {
      console.error(`Node ${nodeId} not found in tree ${treeId}`);
      return;
    }

    try {
      // Map of original node IDs to preserve during recalculation
      const nodeIdMap = new Map<string, string>();
      
      // First pass: collect all original node IDs in the tree and map them
      const collectNodeIds = (node: DependencyNode) => {
        nodeIdMap.set(`${node.id}-${node.uniqueId.split('-').pop()}`, node.uniqueId);
        nodeIdMap.set(node.uniqueId, node.uniqueId); // Direct mapping for treeIds and full uniqueIds
        
        if (node.children) {
          node.children.forEach(collectNodeIds);
        }
      };
      
      collectNodeIds(tree);
      
      // Recalculate only the affected branch
      const recalculateBranch = async (
        node: DependencyNode,
        amount: number,
        newRecipeId: string | null
      ): Promise<DependencyNode> => {
        // Get recipes for this item
        const availableRecipes = await getRecipesForItem(node.id);
        
        let recipe = null;
        if (newRecipeId) {
          recipe = await getRecipeById(newRecipeId);
        } else if (recipeSelections[node.uniqueId]) {
          recipe = await getRecipeById(recipeSelections[node.uniqueId]);
        } else {
          recipe = await getRecipeByOutput(node.id);
        }

        if (!recipe) {
          return {
            ...node,
            children: []
          };
        }

        // Calculate production based on current amount and excess
        const outputAmount = recipe.out[node.id] ?? 1;
        const cyclesNeeded = (amount + (excessMap[node.uniqueId] || 0)) / (outputAmount as number);

        // Recalculate children with new recipe
        const children = await Promise.all(
          Object.entries(recipe.in).map(([inputItem, inputAmount]) => {
            const childAmount = ((inputAmount as number) ?? 0) * cyclesNeeded;
            
            // Find existing child with this item ID if it exists
            const existingChild = node.children?.find(c => c.id === inputItem);
            
            if (existingChild) {
              // Recalculate existing child branch
              return recalculateBranch(
                existingChild,
                childAmount,
                existingChild.selectedRecipeId || null
              );
            } else {
              // Create new child branch
              return calculateDependencyTree(
                inputItem,
                childAmount,
                null,
                recipeSelections,
                0,
                [],
                node.uniqueId
              );
            }
          })
        );

        // Add byproducts
        const byproducts = Object.entries(recipe.out)
          .filter(([outputItem]) => outputItem !== node.id)
          .map(([outputItem, outputAmount]) => {
            const byproductAmount = -((outputAmount as number) * cyclesNeeded);
            return {
              id: outputItem,
              amount: byproductAmount,
              uniqueId: `${node.uniqueId}-${outputItem}`,
              isByproduct: true,
              children: [],
              excess: 0
            } as DependencyNode;
          });

        // Return updated node with new recipe and children
        return {
          ...node,
          selectedRecipeId: recipe.id,
          availableRecipes,
          children: [...children, ...byproducts].filter(Boolean)
        };
      };

      // Create updated node with new recipe
      const updatedNode = await recalculateBranch(
        node,
        node.amount,
        recipeId
      );

      if (!updatedNode) {
        console.error("Failed to recalculate branch");
        return;
      }

      // Create a new tree with the updated branch
      const createUpdatedTree = (currentNode: DependencyNode): DependencyNode => {
        if (currentNode.uniqueId === nodeId) {
          return updatedNode;
        }

        return {
          ...currentNode,
          children: currentNode.children?.map(createUpdatedTree)
        };
      };

      const updatedTree = createUpdatedTree(tree);

      // Update recipe selection in Redux
      dispatch(setRecipeSelection({
        nodeId,
        recipeId
      }));

      // Calculate new accumulated values
      const accumulated = calculateAccumulatedFromTree(updatedTree);

      // Update the tree in Redux
      dispatch(setDependencies({
        treeId,
        tree: updatedTree,
        accumulated
      }));

      // Force UI refresh
      setTimeout(() => {
        const treeViewElement = document.getElementById('tree-view');
        if (treeViewElement) {
          treeViewElement.style.opacity = '0.99';
          setTimeout(() => {
            if (treeViewElement) treeViewElement.style.opacity = '1';
          }, 10);
        }
      }, 50);

    } catch (error) {
      console.error("Error updating recipe:", error);
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
    dispatch(importNode({
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
    treeId: string = `${itemId}-${Date.now()}`,
    selectedRecipeId: string | null = null
  ) => {
    if (!itemId) {
      console.error('Cannot create tree without itemId');
      return;
    }
    
    if (amount < 0) {
      console.error('Cannot create tree with negative amount');
      return;
    }
    
    // Create the tree and calculate dependencies
    calculateDependencyTree(itemId, amount, selectedRecipeId)
      .then(tree => {
        // Set a unique ID for the root node
        tree.uniqueId = treeId;
        tree.isRoot = true;
        
        // Add the tree to the state
        dispatch(setDependencies({
          treeId,
          tree,
          accumulated: calculateAccumulatedFromTree(tree)
        }));
      });
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