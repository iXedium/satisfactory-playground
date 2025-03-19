import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
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
    
    // Find the source node's excess
    const sourceExcess = excessMap[sourceNode.uniqueId] || 0;

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
    
    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      if (treeId !== sourceTreeId && tree.id === sourceNode.id && !tree.isImport) {
        targetTreeId = treeId;
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
        excess: sourceExcess, // Use the source node's excess
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
        [targetTreeId]: sourceExcess
      }));
    }

    // Now dispatch the import action with the isNewTree flag
    dispatch(importNode({
      sourceTreeId: sourceTreeId,
      sourceNodeId: nodeId,
      targetTreeId: targetTreeId,
      isNewTree: isNewTree // Pass flag to avoid double-counting
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
