import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item } from "../data/dexieDB";
import { calculateDependencyTree, DependencyNode } from "../utils/calculateDependencyTree";
import { calculateAccumulatedFromTree, AccumulatedNode } from "../utils/calculateAccumulatedFromTree";
import { setDependencies, deleteTree, updateAccumulated } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { getComponents } from "../data/dbQueries";
import { setRecipeSelection } from "../features/recipeSelectionsSlice";
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
  const [itemCount, setItemCount] = useState(1);
  const [excessMap, setExcessMap] = useState<Record<string, number>>({});
  const [machineCountMap, setMachineCountMap] = useState<Record<string, number>>({});
  const [machineMultiplierMap, setMachineMultiplierMap] = useState<Record<string, number>>({});
  const [isAddItemCollapsed, setIsAddItemCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [showExtensions, setShowExtensions] = useState(true);
  const [accumulateExtensions, setAccumulateExtensions] = useState(false);
  const [showMachines, setShowMachines] = useState(true);
  
  const commandBarRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const accumulatedViewRef = useRef<HTMLDivElement>(null);

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
      
      // Calculate the dependency tree
      const tree = await calculateDependencyTree(
        selectedItem,
        itemCount,
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
        if (treeRef.current) {
          treeRef.current.style.opacity = '0.99';
          setTimeout(() => {
            if (treeRef.current) treeRef.current.style.opacity = '1';
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

    const tree = await calculateDependencyTree(
      dependencies.dependencyTrees[treeId].id, 
      dependencies.dependencyTrees[treeId].amount, 
      recipeId, 
      updatedRecipeSelections,
      0,
      affectedBranches
    );

    if (tree) {
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

    const tree = await calculateDependencyTree(
      dependencies.dependencyTrees[treeId].id,
      dependencies.dependencyTrees[treeId].amount,
      dependencies.dependencyTrees[treeId].selectedRecipeId || "",
      recipeSelections,
      0,
      affectedBranches,
      '',
      newExcessMap
    );

    if (tree) {
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
    if (treeRef.current) {
      treeRef.current.style.opacity = '0.99';
      setTimeout(() => {
        if (treeRef.current) treeRef.current.style.opacity = '1';
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
          itemCount={itemCount}
          onItemCountChange={setItemCount}
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
          isAddItemCollapsed={isAddItemCollapsed}
          onAddItemCollapsedChange={setIsAddItemCollapsed}
        />
      </div>
      
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '8px'
      }}>
        <div 
          ref={treeRef}
          style={{
            display: viewMode === "tree" ? 'block' : 'none',
            height: viewMode === "tree" ? 'auto' : 0,
            overflow: 'visible'
          }}
        >
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
              isRoot={true}
              onDelete={() => handleDeleteTree(treeId)}
            />
          ))}
        </div>
        
        <div 
          ref={accumulatedViewRef}
          style={{
            display: viewMode === "accumulated" ? 'block' : 'none',
            height: viewMode === "accumulated" ? 'auto' : 0,
            overflow: 'visible'
          }}
        >
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
          />
        </div>
      </div>
    </div>
  );
};

export default DependencyTester;
