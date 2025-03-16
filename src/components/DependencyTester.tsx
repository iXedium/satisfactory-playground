import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item } from "../data/dexieDB";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import { getComponents } from "../data/dbQueries";
import { setRecipeSelection } from "../features/recipeSelectionsSlice";
import { findAffectedBranches } from "../utils/treeDiffing";
import AccumulatedView from "./AccumulatedView";
import CommandBar from "./CommandBar";

type ViewMode = "accumulated" | "tree";

const DependencyTester: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [itemCount, setItemCount] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [excessMap, setExcessMap] = useState<Record<string, number>>({});
  const [machineCountMap, setMachineCountMap] = useState<Record<string, number>>({});
  const [machineMultiplierMap, setMachineMultiplierMap] = useState<Record<string, number>>({});
  const [isAddItemCollapsed, setIsAddItemCollapsed] = useState(false);
  const [commandBarHeight, setCommandBarHeight] = useState(100);
  
  const commandBarRef = useRef<HTMLDivElement>(null);

  // Add state to track last calculated values
  const [lastCalculated, setLastCalculated] = useState<{
    item: string;
    recipe: string;
    count: number;
  } | null>(null);

  // Load components on mount
  useEffect(() => {
    getComponents().then(setItems).catch(console.error);
  }, []);

  // Update command bar height on resize and when add item section is toggled
  useEffect(() => {
    const updateCommandBarHeight = () => {
      // Force a reflow to ensure we get the correct height
      setTimeout(() => {
        if (commandBarRef.current) {
          const height = commandBarRef.current.getBoundingClientRect().height;
          console.log("CommandBar height:", height);
          setCommandBarHeight(height - 10); // Add some extra padding
        }
      }, 0);
    };

    // Initial measurement
    updateCommandBarHeight();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateCommandBarHeight();
    });
    
    if (commandBarRef.current) {
      resizeObserver.observe(commandBarRef.current);
    }

    // Set up window resize listener for good measure
    window.addEventListener('resize', updateCommandBarHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCommandBarHeight);
    };
  }, [isAddItemCollapsed]);

  // Update calculate handler with dependency checking
  const handleCalculate = async () => {
    if (selectedItem && selectedRecipe) {
      try {
        // Check if calculation is needed
        const needsCalculation = !lastCalculated 
          || lastCalculated.item !== selectedItem
          || lastCalculated.recipe !== selectedRecipe
          || lastCalculated.count !== itemCount;

        if (needsCalculation) {
          const tree = await calculateDependencyTree(
            selectedItem,
            itemCount,
            selectedRecipe,
            recipeSelections
          );
          
          if (!tree) {
            console.error("Failed to calculate dependency tree");
            return;
          }
          
          const accumulated = calculateAccumulatedFromTree(tree);
          
          dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
          
          // Update last calculated state
          setLastCalculated({
            item: selectedItem,
            recipe: selectedRecipe,
            count: itemCount
          });
        }
      } catch (error) {
        console.error("Error in handleCalculate:", error);
      }
    }
  };

  const handleTreeRecipeChange = async (nodeId: string, recipeId: string) => {
    const affectedBranches = dependencies.dependencyTree 
      ? findAffectedBranches(dependencies.dependencyTree, nodeId)
      : [];
    
    const updatedRecipeSelections = {
      ...recipeSelections,
      [nodeId]: recipeId
    };
    
    dispatch(setRecipeSelection({ nodeId, recipeId }));

    if (selectedItem && selectedRecipe) {
      const tree = await calculateDependencyTree(
        selectedItem, 
        itemCount, 
        selectedRecipe, 
        updatedRecipeSelections,
        0,
        affectedBranches
      );
      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));

      setLastCalculated({
        item: selectedItem,
        recipe: selectedRecipe,
        count: itemCount
      });
    }
  };

  const handleExcessChange = async (nodeId: string, excess: number) => {
    const newExcessMap = { ...excessMap, [nodeId]: excess };
    setExcessMap(newExcessMap);

    if (selectedItem && selectedRecipe) {
      // Find affected branches when excess changes
      const affectedBranches = dependencies.dependencyTree 
        ? findAffectedBranches(dependencies.dependencyTree, nodeId)
        : [];

      const tree = await calculateDependencyTree(
        selectedItem,
        itemCount,
        selectedRecipe,
        recipeSelections,
        0,
        affectedBranches, // Pass affected branches
        '',
        newExcessMap
      );
      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));

      setLastCalculated({
        item: selectedItem,
        recipe: selectedRecipe,
        count: itemCount
      });
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'auto',
      paddingTop: `${commandBarHeight}px`, // Dynamic padding based on CommandBar height
    }}>
      {/* CommandBar with integrated item selection */}
      <div 
        ref={commandBarRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <CommandBar 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          items={items}
          selectedItem={selectedItem}
          onItemChange={setSelectedItem}
          selectedRecipe={selectedRecipe}
          onRecipeChange={setSelectedRecipe}
          itemCount={itemCount}
          onItemCountChange={setItemCount}
          onCalculate={handleCalculate}
          onAddItemSectionToggle={setIsAddItemCollapsed}
        />
      </div>

      {/* Main content area */}
      {Object.keys(dependencies.accumulatedDependencies || {}).length > 0 && (
        <div style={{ ...dependencyStyles.listContainer, display: viewMode === "accumulated" ? "block" : "none" }}>
          <AccumulatedView
            onRecipeChange={handleTreeRecipeChange}
            onExcessChange={handleExcessChange}
            excessMap={excessMap}
            machineCountMap={machineCountMap}
            onMachineCountChange={handleMachineCountChange}
            machineMultiplierMap={machineMultiplierMap}
            onMachineMultiplierChange={handleMachineMultiplierChange}
          />
        </div>
      )}

      {dependencies.dependencyTree && (
        <div style={{ 
          ...dependencyStyles.listContainer, 
          display: viewMode === "tree" ? "block" : "none"
        }}>
          <DependencyTree 
            dependencyTree={dependencies.dependencyTree}
            onRecipeChange={handleTreeRecipeChange}
            onExcessChange={handleExcessChange}
            excessMap={excessMap}
            machineCountMap={machineCountMap}
            onMachineCountChange={handleMachineCountChange}
            machineMultiplierMap={machineMultiplierMap}
            onMachineMultiplierChange={handleMachineMultiplierChange}
          />
        </div>
      )}
    </div>
  );
};

export default DependencyTester;
