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

const DependencyTester: React.FC = () => {
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
    // Process a node for any imports
    const processNodeForImports = (node: DependencyNode, nodePath: string = '') => {
      if (node.isImport && node.importedFrom && node.amount > 0) {
        const importSourceId = node.importedFrom;
        const importSourceTree = store.getState().dependencies.dependencyTrees[importSourceId];
        
        if (importSourceTree) {
          // Count total amount needed from this source tree by all imports
          let totalRequiredAmount = 0;
          
          // Scan all trees for import relationships
          Object.values(store.getState().dependencies.dependencyTrees).forEach(tree => {
            const scanForImports = (node: DependencyNode) => {
              if (node.isImport && node.importedFrom === importSourceId) {
                totalRequiredAmount += node.amount;
              }
              
              if (node.children) {
                node.children.forEach(child => {
                  scanForImports(child);
                });
              }
            };
            
            scanForImports(tree);
          });
          
          // If the required amount changed, update the source tree
          if (totalRequiredAmount !== importSourceTree.amount) {
            // Create a new tree with updated amount
            calculateDependencyTree(
              importSourceTree.id,
              totalRequiredAmount,
              importSourceTree.selectedRecipeId || null,
              recipeSelections,
              0,
              [],
              '',
              excessMap
            ).then(updatedSourceTree => {
              // Preserve excess and uniqueId
              const sourceExcess = excessMap[importSourceId] || importSourceTree.excess || 0;
              updatedSourceTree.uniqueId = importSourceId;
              updatedSourceTree.excess = sourceExcess;
              
              // Update in Redux
              dispatch(setDependencies({
                treeId: importSourceId,
                tree: updatedSourceTree,
                accumulated: calculateAccumulatedFromTree(updatedSourceTree)
              }));
              
              // After updating the source tree, recursively process it as well
              // to handle multi-level import chains - but add a longer delay
              setTimeout(() => {
                const finalUpdatedTree = store.getState().dependencies.dependencyTrees[importSourceId];
                if (finalUpdatedTree) {
                  // Process this tree recursively to handle nested imports
                  processTreeImports(finalUpdatedTree);
                }
              }, 100); // Longer delay to ensure state update is complete
            });
          }
        }
      }
      
      // Process children recursively
      if (node.children) {
        node.children.forEach(child => {
          processNodeForImports(child, `${nodePath ? `${nodePath} > ` : ''}${node.id}`);
        });
      }
    };
    
    // Process a whole tree
    const processTreeImports = (tree: DependencyNode) => {
      processNodeForImports(tree);
    };
    
    // Add a delay to ensure all Redux state updates have completed first
      setTimeout(() => {
      // Process all trees in the state to update all imports
      const allTrees = store.getState().dependencies.dependencyTrees;
      
      Object.values(allTrees).forEach(tree => {
        processTreeImports(tree);
      });
    }, 100); // A good delay to ensure state updates have completed
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
    
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      if (treeId !== sourceTreeId && tree.id === sourceNode.id && !tree.isImport) {
        targetTreeId = treeId;
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
        
        Object.entries(currentState).forEach(([treeId, tree]) => {
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
            treesWithImports[treeId] = imports;
          }
        });
        
        return treesWithImports;
      };
      
      // Find all trees with import nodes
      const treesWithImports = findAllTreesWithImports();
      console.log(`Found ${Object.keys(treesWithImports).length} trees with imports`);
      
      // Calculate which source trees need updating and by how much
      const sourceTreesToUpdate: Record<string, number> = {};
      
      Object.entries(treesWithImports).forEach(([treeId, imports]) => {
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
  
  // Handle unimporting a node (remove import connection)
  const handleUnimportNode = (nodeId: string, targetTreeId: string) => {
    const targetTree = dependencies.dependencyTrees[targetTreeId];
    if (!targetTree) return;
    
    const findNodeInTree = (tree: DependencyNode, id: string): DependencyNode | null => {
      if (tree.id === id) return tree;
      if (tree.children) {
        for (const child of tree.children) {
          const found = findNodeInTree(child, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNodeInTree(targetTree, nodeId);
    if (!node || !node.isImport) return;
    
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
      const updateNodeInTree = (tree: DependencyNode, nodeId: string, updatedNode: DependencyNode): DependencyNode => {
        if (tree.id === nodeId) {
          return {
            ...updatedNode,
            uniqueId: tree.uniqueId
          };
        }
        
        return {
          ...tree,
          children: tree.children ? tree.children.map(child => updateNodeInTree(child, nodeId, updatedNode)) : []
        };
      };
      
      const updatedTree = updateNodeInTree(targetTree, nodeId, updatedNode);
      
      // Update in Redux
      dispatch(setDependencies({
        treeId: targetTreeId,
        tree: updatedTree,
        accumulated: calculateAccumulatedFromTree(updatedTree)
      }));
      
      // After un-importing, trigger the cascading update process
      setTimeout(() => {
        updateAllImportedTrees();
      }, 0);
    });
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