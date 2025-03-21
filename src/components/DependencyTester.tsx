/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { store } from "../store";
import { Item } from "../data/dexieDB";
import { calculateDependencyTree, DependencyNode } from "../utils/calculateDependencyTree";
import { calculateAccumulatedFromTree, AccumulatedNode } from "../utils/calculateAccumulatedFromTree";
import { setDependencies, deleteTree, updateAccumulated, importNode, loadSavedState } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { getComponents } from "../data/dbQueries";
import { setRecipeSelection, loadRecipeSelections } from "../features/recipeSelectionsSlice";
import { findAffectedBranches } from "../utils/treeDiffing";
import AccumulatedView from "./AccumulatedView";
import CommandBar from "./CommandBar";
import { theme } from "../styles/theme";


type ViewMode = "accumulated" | "tree";

const DependencyTester = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [excessMap, setExcessMap] = useState<Record<string, number>>({});
  const [machineCountMap, setMachineCountMap] = useState<Record<string, number>>({});
  const [machineMultiplierMap, setMachineMultiplierMap] = useState<Record<string, number>>({});
  const [isAddItemCollapsed, setIsAddItemCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [showExtensions, setShowExtensions] = useState(false);
  const [accumulateExtensions, setAccumulateExtensions] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  const [showMachineMultiplier, setShowMachineMultiplier] = useState(false);
  const [nodeExtensionOverrides, setNodeExtensionOverrides] = useState<Record<string, boolean>>({});
  
  const commandBarRef = useRef<HTMLDivElement>(null);
  const treeViewRef = useRef<HTMLDivElement>(null);

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
    } catch (error) {
      console.error("Error loading saved state:", error);
    }
  }, [dispatch]);
  
  useEffect(() => {
    // Only save if we have dependencies to save
    if (Object.keys(dependencies.dependencyTrees).length > 0) {
      try {
        const serialized = JSON.stringify(dependencies);
        localStorage.setItem('savedDependencies', serialized);
      } catch (error) {
        console.error("Error saving dependencies:", error);
        // If there's an error (likely due to size), clear the saved data
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

  useEffect(() => {
    // Initial load of items from the database
    getComponents().then(loadedItems => {
      if (loadedItems) {
        setItems(loadedItems);
      }
    });
  }, []);

  // Generate a unique ID for a new tree
  const generateTreeId = (itemId: string): string => {
    const timestamp = Date.now();
    return `${itemId}-${timestamp}`;
  };

  // Update calculate handler with dependency checking
  const handleCalculate = async () => {
    if (!selectedItem || !selectedRecipe) return;
    
    try {
      const treeId = generateTreeId(selectedItem);
      
      // Calculate the dependency tree with amount set to 0
      const tree = await calculateDependencyTree(
        selectedItem,
        0, // Set initial amount to 0 instead of itemCount
        selectedRecipe,
        recipeSelections,
        0,
        [],
        '',
        excessMap
      );
          
      if (!tree) {
        console.error("Failed to calculate dependency tree");
        return;
      }
      
      // Reset excess, machine count, and machine multiplier for this new tree and all its nodes
      const resetNode = (node: DependencyNode) => {
        // Explicitly set excess to 0 for all new nodes
        node.excess = 0;
        
        // Clear saved excess value for this node
        setExcessMap(prev => {
          const newMap = { ...prev };
          delete newMap[node.uniqueId];
          return newMap;
        });
        
        // Clear saved machine count value for this node
        setMachineCountMap(prev => {
          const newMap = { ...prev };
          delete newMap[node.uniqueId];
          return newMap;
        });
        
        // Clear saved machine multiplier value for this node
        setMachineMultiplierMap(prev => {
          const newMap = { ...prev };
          delete newMap[node.uniqueId];
          return newMap;
        });
        
        // Process children recursively
        if (node.children) {
          node.children.forEach(child => resetNode(child));
        }
      };
      
      // Reset all nodes in the tree
      resetNode(tree);
      
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
      
      // Wait for state update and then recalculate heights
      setTimeout(() => {
        if (treeViewRef.current) {
          treeViewRef.current.style.opacity = '0.99';
          setTimeout(() => {
            if (treeViewRef.current) treeViewRef.current.style.opacity = '1';
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

    // Build a map of imported nodes to maintain relationships
    const importMap: Record<string, { targetTreeId: string, amount: number }> = {};
    
    // Track import nodes recursively
    const buildImportMap = (node: DependencyNode) => {
      if (node.isImport && node.importedFrom) {
        importMap[node.uniqueId] = {
          targetTreeId: node.importedFrom,
          amount: node.amount
        };
      }
      
      if (node.children) {
        node.children.forEach((child: DependencyNode) => {
          buildImportMap(child);
        });
      }
    };
    
    // Scan the entire tree for imported nodes
    buildImportMap(dependencies.dependencyTrees[treeId]);

      const tree = await calculateDependencyTree(
      dependencies.dependencyTrees[treeId].id, 
      dependencies.dependencyTrees[treeId].amount, 
      recipeId, 
        updatedRecipeSelections,
        0,
      affectedBranches,
      '',
      excessMap,
      importMap
    );

    if (tree) {
      // Update the production rates in imported chains based on new values
      Object.entries(importMap).forEach(([nodeUniqueId, { targetTreeId }]) => {
        // Find the node in the newly calculated tree
        const updatedNode = findNodeById(tree, nodeUniqueId);
        
        // Find the target root node
        const targetTree = dependencies.dependencyTrees[targetTreeId];
        
        if (updatedNode && targetTree) {
          // Calculate the difference in production
          const originalNode = findNodeById(dependencies.dependencyTrees[treeId], nodeUniqueId);
          if (originalNode) {
            const prodDifference = updatedNode.amount - originalNode.amount;
            
            // Only update if there's a change in production
            if (prodDifference !== 0) {
              // Update the amount in the target root node
              const newAmount = targetTree.amount + prodDifference;
              
              // Rather than just updating the root node directly, we need to recalculate
              // the entire subtree to ensure child nodes are updated correctly
              calculateDependencyTree(
                targetTree.id,
                newAmount,
                targetTree.selectedRecipeId || "",
                recipeSelections,
                0,
                [], // No specific affected branches - recalculate all
                '',
                excessMap
              ).then(updatedTargetTree => {
                if (updatedTargetTree) {
                  // Update the tree with the fully recalculated version
                  dispatch(setDependencies({
                    treeId: targetTreeId,
                    tree: updatedTargetTree,
                    accumulated: calculateAccumulatedFromTree(updatedTargetTree)
                  }));
                }
              });
            }
          }
        }
      });
      
      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ treeId, tree, accumulated }));
    }
  };

  const handleExcessChange = async (nodeId: string, excess: number) => {
    const newExcessMap = { ...excessMap, [nodeId]: excess };
    setExcessMap(newExcessMap);

    // Find which tree this node belongs to
    const treeId = Object.keys(dependencies.dependencyTrees).find(id => 
      findNodeById(dependencies.dependencyTrees[id], nodeId)
    );

    if (!treeId) return;

    const affectedBranches = findAffectedBranches(dependencies.dependencyTrees[treeId], nodeId);
    
    // Build a map of imported nodes to maintain relationships
    const importMap: Record<string, { targetTreeId: string, amount: number }> = {};
    
    // Track import nodes recursively
    const buildImportMap = (node: DependencyNode) => {
      if (node.isImport && node.importedFrom) {
        importMap[node.uniqueId] = {
          targetTreeId: node.importedFrom,
          amount: node.amount
        };
      }
      
      if (node.children) {
        node.children.forEach((child: DependencyNode) => {
          buildImportMap(child);
        });
      }
    };
    
    // Scan the entire tree for imported nodes
    buildImportMap(dependencies.dependencyTrees[treeId]);

    // Recalculate the tree with import relationships maintained
      const tree = await calculateDependencyTree(
      dependencies.dependencyTrees[treeId].id,
      dependencies.dependencyTrees[treeId].amount,
      dependencies.dependencyTrees[treeId].selectedRecipeId || "",
        recipeSelections,
        0,
      affectedBranches,
      '',
      newExcessMap,
      importMap
    );

    if (tree) {
      // Update the production rates in imported chains based on new values
      Object.entries(importMap).forEach(([nodeUniqueId, { targetTreeId }]) => {
        // Find the node in the newly calculated tree
        const updatedNode = findNodeById(tree, nodeUniqueId);
        
        // Find the target root node
        const targetTree = dependencies.dependencyTrees[targetTreeId];
        
        if (updatedNode && targetTree) {
          // Calculate the difference in production
          const originalNode = findNodeById(dependencies.dependencyTrees[treeId], nodeUniqueId);
          if (originalNode) {
            const prodDifference = updatedNode.amount - originalNode.amount;
            
            // Only update if there's a change in production
            if (prodDifference !== 0) {
              // Update the amount in the target root node
              const newAmount = targetTree.amount + prodDifference;
              
              // Rather than just updating the root node directly, we need to recalculate
              // the entire subtree to ensure child nodes are updated correctly
              calculateDependencyTree(
                targetTree.id,
                newAmount,
                targetTree.selectedRecipeId || "",
                recipeSelections,
                0,
                [], // No specific affected branches - recalculate all
                '',
                excessMap
              ).then(updatedTargetTree => {
                if (updatedTargetTree) {
                  // Update the tree with the fully recalculated version
                  dispatch(setDependencies({
                    treeId: targetTreeId,
                    tree: updatedTargetTree,
                    accumulated: calculateAccumulatedFromTree(updatedTargetTree)
                  }));
                }
              });
            }
          }
        }
      });
      
      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ treeId, tree, accumulated }));
    }
  };

  const handleMachineCountChange = (nodeId: string, count: number) => {
    setMachineCountMap(prev => ({
      ...prev,
      [nodeId]: count
    }));
  };

  const handleMachineMultiplierChange = (nodeId: string, multiplier: number) => {
    setMachineMultiplierMap(prev => ({
      ...prev,
      [nodeId]: multiplier
    }));
  };

  const handleDeleteTree = (treeId: string) => {
    console.log("Deleting tree with ID:", treeId);
    dispatch(deleteTree({ treeId }));
  };
  
  // Handle expand/collapse all nodes in tree view
  const handleExpandCollapseAll = (expand: boolean) => {
    const newExpandedNodes: Record<string, boolean> = {};
    
    // Process each tree
    Object.values(dependencies.dependencyTrees).forEach(tree => {
      const collectNodeIds = (node: DependencyNode) => {
        if (!node) return;
        
        newExpandedNodes[node.uniqueId] = expand;
        
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            collectNodeIds(child);
          }
        }
      };
      
      collectNodeIds(tree);
    });
    
    setExpandedNodes(newExpandedNodes);
    
    // Force a re-render of the tree
    if (treeViewRef.current) {
      treeViewRef.current.style.opacity = '0.99';
      setTimeout(() => {
        if (treeViewRef.current) treeViewRef.current.style.opacity = '1';
      }, 10);
    }
  };
  
  // Helper function to find a node by ID in a tree
  const findNodeById = (tree: DependencyNode, nodeId: string): DependencyNode | null => {
    if (tree.uniqueId === nodeId) return tree;
    
    if (tree.children) {
      for (const child of tree.children) {
        const found = findNodeById(child, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  };

  // Helper function to find a node in a tree
  const findNodeInTree = (tree: DependencyNode, targetId: string): DependencyNode | null => {
    if (tree.uniqueId === targetId) {
      return tree;
    }

    if (tree.children) {
      for (const child of tree.children) {
        const found = findNodeInTree(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };
  
  // Helper function to find a parent node in all trees
  const findParentInAllTrees = (nodeId: string): { tree: DependencyNode, node: DependencyNode } | null => {
    if (!dependencies.dependencyTrees) return null;
    
    for (const treeId in dependencies.dependencyTrees) {
      const tree = dependencies.dependencyTrees[treeId];
      // First check if this is the node we're looking for
      if (tree.uniqueId === nodeId) {
        return { tree, node: tree };
      }
      // Then check children recursively
      const found = findNodeInTree(tree, nodeId);
      if (found) return { tree, node: found };
    }
    
    return null;
  };

  // Add an effect to recalculate accumulated dependencies when trees change
  useEffect(() => {
    if (Object.keys(dependencies.dependencyTrees).length === 0) return;
    
    // Calculate combined accumulated dependencies across all trees
    const allAccumulated: Record<string, AccumulatedNode> = {};
    
    // Process each tree and combine results
    Object.values(dependencies.dependencyTrees).forEach(tree => {
      const treeAccumulated = calculateAccumulatedFromTree(tree);
      Object.assign(allAccumulated, treeAccumulated);
    });
    
    // Update Redux state with combined accumulated dependencies
    dispatch(updateAccumulated(allAccumulated));
  }, [dependencies.dependencyTrees, dispatch]);

  // Helper function for cascading import updates
  const updateAllImportedTrees = () => {
    console.log("== Starting updateAllImportedTrees process ==");
    
    // Get the current state
    const currentState = store.getState().dependencies.dependencyTrees;
    
    // First, find all import relationships in the current tree structure
    // Map of sourceTreeId -> total required amount
    const sourceTreeRequirements: Record<string, number> = {};
    
    // Scan all trees to build a complete picture of import relationships
    Object.values(currentState).forEach(tree => {
      const scanForImports = (node: DependencyNode) => {
        // If this is an import node, record the requirement
        if (node.isImport && node.importedFrom) {
          sourceTreeRequirements[node.importedFrom] = 
            (sourceTreeRequirements[node.importedFrom] || 0) + node.amount;
        }
        
        // Scan all children
        if (node.children) {
          node.children.forEach(child => scanForImports(child));
        }
      };
      
      // Start scanning from the root of each tree
      scanForImports(tree);
    });
    
    console.log("Import requirements for source trees:", sourceTreeRequirements);
    
    // Check if any source trees need their amounts updated
    const treesToUpdate: Array<{treeId: string, requiredAmount: number}> = [];
    
    Object.entries(sourceTreeRequirements).forEach(([sourceTreeId, requiredAmount]) => {
      const sourceTree = currentState[sourceTreeId];
      if (sourceTree && sourceTree.amount !== requiredAmount) {
        console.log(`Source tree ${sourceTreeId} needs updating: current=${sourceTree.amount}, required=${requiredAmount}`);
        treesToUpdate.push({
          treeId: sourceTreeId,
          requiredAmount
        });
      }
    });
    
    // If no trees need updating, we're done
    if (treesToUpdate.length === 0) {
      console.log("No trees need updating for import relationships");
      return;
    }
    
    // Otherwise, update each tree one by one
    // We'll use a counter to keep track of how many updates have completed
    let updatesCompleted = 0;
    
    treesToUpdate.forEach(({treeId, requiredAmount}) => {
      const tree = currentState[treeId];
      console.log(`Updating tree ${treeId} with new required amount: ${requiredAmount}`);
      
      // Recalculate the tree with the new amount
      calculateDependencyTree(
        tree.id,
        requiredAmount,
        tree.selectedRecipeId || null,
        recipeSelections,
        tree.excess || 0,
        [],
        '',
        excessMap
      ).then(updatedTree => {
        // Preserve unique ID and excess
        updatedTree.uniqueId = treeId;
        updatedTree.excess = tree.excess || 0;
        
        // Update in Redux
        dispatch(setDependencies({
          treeId: treeId,
          tree: updatedTree,
          accumulated: calculateAccumulatedFromTree(updatedTree)
        }));
        
        console.log(`Updated source tree ${treeId} to amount ${requiredAmount}`);
        
        // Increment the counter
        updatesCompleted++;
        
        // If all updates are complete, check if we need another round of cascade updates
        if (updatesCompleted === treesToUpdate.length) {
          // Wait a bit to ensure all state updates have completed
          setTimeout(() => {
            // Get the latest state
            const updatedState = store.getState().dependencies.dependencyTrees;
            
            // See if there are any new requirements that have changed
            let needsFurtherUpdate = false;
            
            // Check if any updated tree has import relationships itself
            treesToUpdate.forEach(({treeId}) => {
              const updatedTree = updatedState[treeId];
              if (updatedTree) {
                const hasImports = findImportsInTree(updatedTree);
                if (hasImports) {
                  needsFurtherUpdate = true;
                }
              }
            });
            
            if (needsFurtherUpdate) {
              console.log("Some updated trees have their own imports, continuing cascade...");
              // Recursive call to handle next level of cascade
              updateAllImportedTrees();
            } else {
              console.log("Cascade update complete, no further updates needed");
            }
          }, 100);
        }
      });
    });
  };
  
  // Helper to find if a tree has any import relationships
  const findImportsInTree = (tree: DependencyNode): boolean => {
    if (tree.isImport) return true;
    
    if (tree.children) {
      for (const child of tree.children) {
        if (findImportsInTree(child)) return true;
      }
    }
    
    return false;
  };

  // Handle importing a node from another tree (selection from dropdown)
  const handleImportNode = (nodeId: string) => {
    console.log("Importing node:", nodeId);
    // Find the source node and its parent in the source tree
    const sourceTreeInfo = findParentInAllTrees(nodeId);
    if (!sourceTreeInfo) {
      console.error("Could not find source node or its parent");
      return;
    }

    const { tree: sourceTree, node: sourceNode } = sourceTreeInfo;
    console.log("Found source node:", sourceNode);
    
    // Find the source tree ID
    let sourceTreeId = "";
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      if (tree === sourceTree) {
        sourceTreeId = treeId;
        break;
      }
    }

    if (sourceTreeId === "") {
      console.error("Could not find source tree ID");
      return;
    }

    // Find a target tree that produces the same item and is not an import
    let targetTreeId = "";
    let isNewTree = false;
    let existingTree = null;
    
    for (const [id, tree] of Object.entries(dependencies.dependencyTrees)) {
      if (id !== sourceTreeId && tree.id === sourceNode.id && !tree.isImport) {
        targetTreeId = id;
        existingTree = tree;
        break;
      }
    }

    console.log("Source tree ID:", sourceTreeId);
    console.log("Target tree ID:", targetTreeId || "null");

    // If no existing tree found, create a new one
    if (targetTreeId === "") {
      isNewTree = true;
      console.log("Creating new tree for", sourceNode.id);
      targetTreeId = `${sourceNode.id}-${Date.now()}`;
      
      // Create a new root node for this item with the source node's amount + excess
      const newRoot: DependencyNode = {
        id: sourceNode.id,
        uniqueId: targetTreeId,
        amount: sourceNode.amount, // Use the source node's production amount
        isRoot: true,
        isImport: false,
        selectedRecipeId: sourceNode.selectedRecipeId,
        availableRecipes: sourceNode.availableRecipes,
        excess: excessMap[sourceTreeId] || 0, // Use the source node's excess
        children: []
      };
      
      // Deep clone the source node's children structure
      if (sourceNode.children && sourceNode.children.length > 0) {
        sourceNode.children.forEach(child => {
          newRoot.children!.push(cloneNodeStructure(child, targetTreeId));
        });
      }
      
      // Add the tree directly to Redux state
      dispatch(setDependencies({
        treeId: targetTreeId,
        tree: newRoot,
        accumulated: calculateAccumulatedFromTree(newRoot)
      }));
      
      // Also update the excess map for the new node
      setExcessMap(prev => ({
        ...prev,
        [targetTreeId]: excessMap[sourceTreeId] || 0
      }));
    } else if (existingTree) {
      // For existing trees, we need to recalculate the children based on the new total amount
      console.log("Adding to existing tree:", existingTree);
      
      // Calculate the new total amount for the target tree
      const newAmount = existingTree.amount + sourceNode.amount;
      
      // Preserve the existing excess for the target tree
      const targetExcess = excessMap[existingTree.uniqueId] || 0;
      console.log(`Preserving target excess for ${existingTree.id}: ${targetExcess}`);
      
      // Create updated tree with the new amount
      const recipeMap: Record<string, string> = {};
      
      // Preserve recipe selections from the existing tree
      const collectRecipeSelections = (node: DependencyNode, prefix: string = '') => {
        const nodeId = prefix ? `${prefix}-${node.id}` : node.id;
        if (node.selectedRecipeId) {
          recipeMap[nodeId] = node.selectedRecipeId;
        }
        
        if (node.children) {
          node.children.forEach(child => {
            collectRecipeSelections(child, nodeId);
          });
        }
      };
      
      collectRecipeSelections(existingTree);
      
      // Build import map for existing imports
      const importMap: Record<string, { targetTreeId: string, amount: number }> = {};
      const buildImportMap = (node: DependencyNode) => {
        if (node.isImport && node.importedFrom) {
          importMap[node.uniqueId] = { 
            targetTreeId: node.importedFrom, 
            amount: node.amount 
          };
        }
        
        if (node.children) {
          node.children.forEach((child: DependencyNode) => {
            buildImportMap(child);
          });
        }
      };
      
      // Collect all existing imports in the tree
      buildImportMap(existingTree);
      
      // Make a copy of the excess map and ensure the target's excess is preserved
      const updatedExcessMap = { ...excessMap };
      // Explicitly set the target excess in the map to ensure it's preserved during calculation
      updatedExcessMap[existingTree.uniqueId] = targetExcess;
      
      console.log("updatedExcessMap before calculation:", updatedExcessMap);
      
      // Now recalculate the tree with the updated amount
      calculateDependencyTree(
        existingTree.id,
        newAmount,
        existingTree.selectedRecipeId || null,
        recipeMap,
        0,
        [],
        '',
        updatedExcessMap, // Use the map with explicitly set excess value
        importMap
      ).then(updatedTree => {
        // Preserve the unique ID of the existing tree
        updatedTree.uniqueId = targetTreeId;
        
        // Make sure the excess is explicitly preserved in the tree node
        console.log(`Setting excess on updated tree to: ${targetExcess}`);
        updatedTree.excess = targetExcess;
        
        // Also update the excess map with the preserved value
        setExcessMap(prev => ({
          ...prev,
          [targetTreeId]: targetExcess
        }));
        
        // Update the tree in Redux
        dispatch(setDependencies({
          treeId: targetTreeId,
          tree: updatedTree,
          accumulated: calculateAccumulatedFromTree(updatedTree)
        }));
      });
    }

    // Now dispatch the import action with the isNewTree flag
    dispatch(importNode({
      sourceTreeId: sourceTreeId,
      sourceNodeId: nodeId,
      targetTreeId: targetTreeId,
      isNewTree: isNewTree
    }));
    
    // Implement direct approach to cascade updates after import
    console.log("===== DIRECT UPDATE APPROACH =====");
    setTimeout(() => {
      console.log("Implementing direct approach to cascade updates");
      
      // Get the current state after import
      const currentState = store.getState().dependencies.dependencyTrees;
      const targetTree = currentState[targetTreeId];
      
      if (!targetTree) {
        console.error("Target tree not found after import");
        return;
      }
      
      console.log("Target tree after import:", targetTree);
      
      // Helper function to find all trees with import nodes
      const findAllTreesWithImports = () => {
        const treesWithImports: Record<string, DependencyNode[]> = {};
        
        Object.entries(currentState).forEach(([id, tree]) => {
          const imports: DependencyNode[] = [];
          
          const findImports = (node: DependencyNode) => {
            if (node.isImport && node.importedFrom) {
              imports.push(node);
            }
            
            if (node.children) {
              node.children.forEach(child => findImports(child));
            }
          };
          
          findImports(tree);
          
          if (imports.length > 0) {
            treesWithImports[id] = imports;
          }
        });
        
        return treesWithImports;
      };
      
      // Find all trees with import nodes
      const treesWithImports = findAllTreesWithImports();
      console.log(`Found ${Object.keys(treesWithImports).length} trees with imports`);
      
      // Calculate which source trees need updating and by how much
      const sourceTreesToUpdate: Record<string, number> = {};
      
      Object.values(treesWithImports).forEach(imports => {
        imports.forEach(importNode => {
          if (importNode.importedFrom) {
            // Add to the total for this source
            sourceTreesToUpdate[importNode.importedFrom] = 
              (sourceTreesToUpdate[importNode.importedFrom] || 0) + importNode.amount;
          }
        });
      });
      
      console.log("Source trees that need updating:", sourceTreesToUpdate);
      
      // Update each source tree with the correct total amount
      Object.entries(sourceTreesToUpdate).forEach(([sourceId, totalAmount]) => {
        const sourceTree = currentState[sourceId];
        
        if (!sourceTree) {
          console.error(`Source tree ${sourceId} not found`);
          return;
        }
        
        console.log(`Updating source tree ${sourceId} from ${sourceTree.amount} to ${totalAmount}`);
        
        if (sourceTree.amount !== totalAmount) {
          // Recalculate with the new total amount
          calculateDependencyTree(
            sourceTree.id,
            totalAmount,
            sourceTree.selectedRecipeId || null,
            recipeSelections,
            0,
            [],
            '',
            excessMap
          ).then(updatedSourceTree => {
            // Preserve unique ID and excess
            updatedSourceTree.uniqueId = sourceId;
            updatedSourceTree.excess = sourceTree.excess || 0;
            
            // Update in Redux
            dispatch(setDependencies({
              treeId: sourceId,
              tree: updatedSourceTree,
              accumulated: calculateAccumulatedFromTree(updatedSourceTree)
            }));
            
            console.log(`Updated source tree ${sourceId}`);
          });
        }
      });
    }, 100); // A delay to ensure the import action has completed
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

  // This function is called when a user clicks the unimport button in the UI
  const handleUnimportNode = (nodeUniqueId: string, itemPrefix: string) => {
    console.log(`handleUnimportNode called with nodeUniqueId: ${nodeUniqueId}, itemPrefix: ${itemPrefix}`);
    
    // Debug: log available trees
    console.log("Available trees in state:", Object.keys(dependencies.dependencyTrees));
    
    // Find the correct tree ID by looking for a tree that either:
    // 1. Contains the node with this uniqueId, or
    // 2. Has a tree ID that starts with the given item prefix
    let foundTreeId = null;
    
    // First try to find the tree that contains this node (most reliable)
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      // Function to recursively search for the node
      const findNode = (node: DependencyNode): boolean => {
        if (node.uniqueId === nodeUniqueId) return true;
        if (node.children) {
          for (const child of node.children) {
            if (findNode(child)) return true;
          }
        }
        return false;
      };
      
      if (findNode(tree)) {
        console.log(`Found tree containing node: ${treeId}`);
        foundTreeId = treeId;
        break;
      }
    }
    
    // If we couldn't find by uniqueId, try using the item prefix
    if (!foundTreeId) {
      // Try exact match first
      if (dependencies.dependencyTrees[itemPrefix]) {
        foundTreeId = itemPrefix;
      } else {
        // Then look for a tree ID that starts with the given item prefix (most common case)
        for (const treeId of Object.keys(dependencies.dependencyTrees)) {
          // Normalize both strings to ensure case consistency
          const normalizedTreeId = treeId.toLowerCase();
          const normalizedPrefix = itemPrefix.toLowerCase();
          
          if (normalizedTreeId.startsWith(normalizedPrefix)) {
            foundTreeId = treeId;
            break;
          }
        }
        
        // If that fails, look for a tree with the same base item ID
        if (!foundTreeId) {
          // Extract just the first part of the item prefix (the base item name)
          const baseItemName = itemPrefix.split('-')[0];
          if (baseItemName) {
            for (const treeId of Object.keys(dependencies.dependencyTrees)) {
              if (treeId.startsWith(baseItemName + '-')) {
                foundTreeId = treeId;
                break;
              }
            }
          }
        }
      }
    }
    
    if (!foundTreeId) {
      console.error(`Could not find a tree matching prefix: ${itemPrefix}`);
      console.error("Available trees:", Object.keys(dependencies.dependencyTrees));
      return;
    }
    
    console.log(`Found matching tree ID: ${foundTreeId}`);
    const targetTreeId = foundTreeId;
    
    const targetTree = dependencies.dependencyTrees[targetTreeId];
    if (!targetTree) {
      console.error(`Target tree ${targetTreeId} not found`);
      return;
    }
    
    const findNodeInTree = (tree: DependencyNode, uniqueId: string): DependencyNode | null => {
      if (tree.uniqueId === uniqueId) return tree;
      if (tree.children) {
        for (const child of tree.children) {
          const found = findNodeInTree(child, uniqueId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNodeInTree(targetTree, nodeUniqueId);
    if (!node) {
      console.error(`Node with uniqueId ${nodeUniqueId} not found in tree ${targetTreeId}`);
      return;
    }
    
    if (!node.isImport) {
      console.error(`Node ${nodeUniqueId} is not an import node`);
      return;
    }
    
    // Store the importedFrom value before the node is reset
    const importedFromTreeId = node.importedFrom;
    const originalNodeAmount = node.originalAmount || node.amount;
    
    console.log(`Unimporting node ${nodeUniqueId} from target ${targetTreeId}, originally imported from ${importedFromTreeId} with amount ${originalNodeAmount}`);
    
    // Reset the import status
    calculateDependencyTree(
      node.id,
      node.amount,
      node.selectedRecipeId || null,
      recipeSelections,
      node.excess || 0,
      [],
      '',
      excessMap
    ).then(updatedNode => {
      // Create a new tree with the updated node
      const updateNodeInTree = (tree: DependencyNode, uniqueId: string, updatedNode: DependencyNode): DependencyNode => {
        if (tree.uniqueId === uniqueId) {
          return {
            ...updatedNode,
            uniqueId: tree.uniqueId
          };
        }
        
        return {
          ...tree,
          children: tree.children ? tree.children.map(child => updateNodeInTree(child, uniqueId, updatedNode)) : []
        };
      };
      
      const updatedTree = updateNodeInTree(targetTree, nodeUniqueId, updatedNode);
      
      // Update in Redux
      dispatch(setDependencies({
        treeId: targetTreeId,
        tree: updatedTree,
        accumulated: calculateAccumulatedFromTree(updatedTree)
      }));
      
      // Dispatch unimport action to update the source tree as well
      if (importedFromTreeId) {
        console.log(`Dispatching unimport action to update source tree: ${importedFromTreeId}`);
        dispatch(importNode({
          sourceTreeId: targetTreeId,
          sourceNodeId: nodeUniqueId,
          targetTreeId: importedFromTreeId,
          isUnimport: true
        }));
        
        // Wait for the unimport action to complete
        setTimeout(() => {
          // Check if the source tree was deleted (as it should be if it has no production)
          const currentState = store.getState().dependencies.dependencyTrees;
          if (!currentState[importedFromTreeId]) {
            console.log(`Source tree ${importedFromTreeId} was deleted during unimport, skipping further updates`);
            return;
          }
          
          // Only run cascade updates if the source tree still exists
          console.log("===== DIRECT UNIMPORT UPDATE APPROACH =====");
          
          // Update the source tree (the one we originally imported from)
          if (importedFromTreeId && currentState[importedFromTreeId]) {
            const sourceTree = currentState[importedFromTreeId];
            
            // Calculate how much this source tree should now produce based on remaining imports
            let totalRequiredAmount = 0;
            
            // Scan all trees for remaining imports from this source
            Object.values(currentState).forEach(tree => {
              const scanForImports = (scanNode: DependencyNode) => {
                if (scanNode.isImport && scanNode.importedFrom === importedFromTreeId) {
                  totalRequiredAmount += scanNode.amount;
                }
                
                if (scanNode.children) {
                  scanNode.children.forEach(child => {
                    scanForImports(child);
                  });
                }
              };
              
              scanForImports(tree);
            });
            
            console.log(`After unimport, source tree ${importedFromTreeId} needs to produce: ${totalRequiredAmount} (was ${sourceTree.amount})`);
            
            // If the required amount is 0, we can delete the tree right away
            if (totalRequiredAmount === 0) {
              console.log(`Source tree ${importedFromTreeId} is no longer needed, deleting it directly`);
              dispatch(deleteTree({ treeId: importedFromTreeId }));
              return; // No need for further processing
            }
            
            // Only update if the amount has changed
            if (totalRequiredAmount !== sourceTree.amount) {
              // Recalculate with the new total amount
              calculateDependencyTree(
                sourceTree.id,
                totalRequiredAmount,
                sourceTree.selectedRecipeId || null,
                recipeSelections,
                sourceTree.excess || 0,
                [],
                '',
                excessMap
              ).then(updatedSourceTree => {
                // Preserve unique ID and excess
                updatedSourceTree.uniqueId = importedFromTreeId;
                updatedSourceTree.excess = sourceTree.excess || 0;
                
                // Update in Redux
                dispatch(setDependencies({
                  treeId: importedFromTreeId,
                  tree: updatedSourceTree,
                  accumulated: calculateAccumulatedFromTree(updatedSourceTree)
                }));
                
                console.log(`Directly updated source tree ${importedFromTreeId} to amount ${totalRequiredAmount}`);
                
                // After updating this tree, check for further cascading updates
                setTimeout(() => {
                  updateAllImportedTrees();
                }, 100);
              });
            } else {
              // Even if amount didn't change, still check for cascading updates
              setTimeout(() => {
                updateAllImportedTrees();
              }, 100);
            }
          } else {
            // If no source tree to update, still run the general cascade update
            updateAllImportedTrees();
          }
        }, 100);
      }
    });
  };

  // Function to toggle extensions visibility for a specific node
  const handleToggleNodeExtensions = (nodeId: string) => {
    setNodeExtensionOverrides(prev => {
      const currentValue = prev[nodeId] ?? showExtensions;
      return {
        ...prev,
        [nodeId]: !currentValue
      };
    });
  };

  // Function to clear all saved data
  const clearSavedData = () => {
    localStorage.removeItem('savedDependencies');
    localStorage.removeItem('savedRecipeSelections');
    localStorage.removeItem('savedExcessMap');
    localStorage.removeItem('savedMachineCountMap');
    localStorage.removeItem('savedMachineMultiplierMap');
    localStorage.removeItem('savedViewMode');
    localStorage.removeItem('savedExpandedNodes');
    localStorage.removeItem('savedNodeExtensionOverrides');
    console.log("All saved data cleared");
  };

  // Add extensive logging for debugging
  console.log("[RENDER] DependencyTester rendering with state:", {
    dependencyTreesCount: Object.keys(dependencies.dependencyTrees).length,
    treeIds: Object.keys(dependencies.dependencyTrees),
    recipeSelectionsCount: Object.keys(recipeSelections).length,
    viewMode,
    showExtensions,
    showMachines
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: theme.colors.background
      }}>
        <CommandBar 
          ref={commandBarRef}
          items={items}
          selectedItem={selectedItem}
          onItemSelect={setSelectedItem}
          selectedRecipe={selectedRecipe}
          onRecipeSelect={setSelectedRecipe}
          onCalculate={handleCalculate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExpandCollapseAll={handleExpandCollapseAll}
          showExtensions={showExtensions}
          onShowExtensionsChange={setShowExtensions}
          accumulateExtensions={accumulateExtensions}
          onAccumulateExtensionsChange={setAccumulateExtensions}
          showMachines={showMachines}
          onShowMachinesChange={setShowMachines}
          showMachineMultiplier={showMachineMultiplier}
          onShowMachineMultiplierChange={setShowMachineMultiplier}
          isAddItemCollapsed={isAddItemCollapsed}
          onAddItemCollapsedChange={setIsAddItemCollapsed}
          onClearSavedData={clearSavedData}
        />
      </div>

      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '8px'
      }}>
        <div 
          ref={treeViewRef}
          style={{ 
            overflow: 'visible'
          }}
        >
          {viewMode === "tree" ? (
            <div>
              {Object.entries(dependencies.dependencyTrees).map(([treeId, tree]) => (
                <DependencyTree
                  key={treeId}
                  tree={tree}
                  onRecipeChange={handleTreeRecipeChange}
                  onExcessChange={handleExcessChange}
                  excessMap={excessMap}
                  machineCountMap={machineCountMap}
                  onMachineCountChange={handleMachineCountChange}
                  machineMultiplierMap={machineMultiplierMap}
                  onMachineMultiplierChange={handleMachineMultiplierChange}
                  expandedNodes={expandedNodes}
                  onNodeExpandChange={(nodeId: string, expanded: boolean) => {
                    setExpandedNodes(prev => ({
                      ...prev,
                      [nodeId]: expanded
                    }));
                  }}
                  showExtensions={showExtensions}
                  accumulateExtensions={accumulateExtensions}
                  showMachines={showMachines}
                  showMachineMultiplier={showMachineMultiplier}
                  isRoot={true}
                  onDelete={() => handleDeleteTree(treeId)}
                  onImportNode={handleImportNode}
                  onUnimportNode={handleUnimportNode}
                />
              ))}
            </div>
          ) : (
            <AccumulatedView
              onRecipeChange={handleTreeRecipeChange}
              onExcessChange={handleExcessChange}
              excessMap={excessMap}
              machineCountMap={machineCountMap}
              onMachineCountChange={handleMachineCountChange}
              machineMultiplierMap={machineMultiplierMap}
              onMachineMultiplierChange={handleMachineMultiplierChange}
              showExtensions={showExtensions}
              accumulateExtensions={accumulateExtensions}
              showMachineSection={showMachines}
              showMachineMultiplier={showMachineMultiplier}
              onDeleteTree={handleDeleteTree}
              accumulatedDependencies={dependencies.accumulatedDependencies}
              onImportNode={handleImportNode}
              nodeExtensionOverrides={nodeExtensionOverrides}
              onToggleNodeExtensions={handleToggleNodeExtensions}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DependencyTester;