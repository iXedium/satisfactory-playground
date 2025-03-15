import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item, Recipe } from "../data/dexieDB";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import { getComponents, getRecipesForItem } from "../data/dbQueries";
import ViewModeSwitch from "./ViewModeSwitch";
import { setRecipeSelection } from "../features/recipeSelectionsSlice";
import { findAffectedBranches } from "../utils/treeDiffing";
import ItemNode from "./ItemNode";
import { theme } from '../styles/theme';
import StyledSelect from "./shared/StyledSelect";
import StyledInput from "./shared/StyledInput";
import Icon from "./Icon";

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
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [excessMap, setExcessMap] = useState<Record<string, number>>({});
  const [machineCountMap, setMachineCountMap] = useState<Record<string, number>>({});
  const [machineMultiplierMap, setMachineMultiplierMap] = useState<Record<string, number>>({});

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

  // Fetch recipes when item changes
  useEffect(() => {
    if (selectedItem) {
      // Clear previous recipe selection
      setSelectedRecipe("");
      
      getRecipesForItem(selectedItem)
        .then((recipes) => {
          if (recipes.length > 0) {
            setFilteredRecipes(recipes);
            
            // Find the default recipe (either matching the item ID or the first one)
            const defaultRecipe = recipes.find((r) => r.id === selectedItem) || recipes[0];
            
            // Use setTimeout to ensure the state update happens after the filteredRecipes are set
            setTimeout(() => {
              setSelectedRecipe(defaultRecipe.id);
            }, 0);
          } else {
            setFilteredRecipes([]);
            setSelectedRecipe("");
          }
        })
        .catch(error => {
          console.error(`Error fetching recipes for ${selectedItem}:`, error);
          setFilteredRecipes([]);
          setSelectedRecipe("");
        });
    } else {
      setFilteredRecipes([]);
      setSelectedRecipe("");
    }
  }, [selectedItem]);

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
      const tree = await calculateDependencyTree(
        selectedItem,
        itemCount,
        selectedRecipe,
        recipeSelections,
        0,
        [], // No affected branches needed
        '',
        newExcessMap
      );
      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
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
    <div className="container" >
      <div style={{
        padding: '12px',
        background: theme.colors.dark,
        borderRadius: theme.border.radius,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left group: Production controls */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            flexWrap: 'wrap',
            flex: '1'
          }}>
            <StyledSelect
              value={selectedItem}
              onChange={setSelectedItem}
              options={items}
              placeholder="Select an Item"
              style={{ minWidth: '250px', maxWidth: '300px', flex: '1' }}
              renderOption={(option) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon itemId={option.id} size="small" showWrapper={false} style={{ backgroundColor: theme.colors.dark }} />
                  {option.name}
                </div>
              )}
            />
            
            {/* Recipe dropdown - always show it but disable if no recipes */}
            <StyledSelect
              value={selectedRecipe}
              onChange={setSelectedRecipe}
              options={filteredRecipes}
              placeholder={selectedItem ? "Select a Recipe" : "Select an item first"}
              style={{ 
                minWidth: '250px', 
                maxWidth: '300px', 
                flex: '1',
                opacity: selectedItem ? 1 : 0.7
              }}
              disabled={!selectedItem || filteredRecipes.length === 0}
              renderOption={(option) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold' }}>{option.name}</span>
                  </div>
                  {option.id === selectedRecipe && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: theme.colors.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>Selected</span>
                    </div>
                  )}
                </div>
              )}
            />
            
            <StyledInput
              type="number"
              min="1"
              value={itemCount}
              onChange={(e) => setItemCount(Number(e.target.value))}
              placeholder="Count"
              style={{ width: '120px' }}
            />
          </div>

          {/* Right group: Calculate button and view toggle */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            flexShrink: 0
          }}>
            <button
              onClick={handleCalculate}
              style={{
                height: '44px',
                padding: '0 24px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: theme.border.radius,
                background: theme.colors.buttonDefault,
                color: theme.colors.text,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonDefault}
            >
              Calculate
            </button>
            <ViewModeSwitch
              mode={viewMode === "tree" ? "tree" : "list"}
              onToggle={(mode) => setViewMode(mode === "list" ? "accumulated" : "tree")}
            />
          </div>
        </div>
      </div>

      {Object.keys(dependencies.accumulatedDependencies || {}).length > 0 && (
        <div style={{ ...dependencyStyles.listContainer, display: viewMode === "accumulated" ? "block" : "none" }}>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {dependencies.selectedItem && (
              <li style={{ marginBottom: "8px" }}>
                <ItemNode
                  itemId={dependencies.selectedItem}
                  amount={dependencies.itemCount}
                  isRoot={true}
                  index={0}
                  recipes={filteredRecipes}
                  selectedRecipeId={selectedRecipe}
                  onRecipeChange={(recipeId) => {
                    setSelectedRecipe(recipeId);
                    handleCalculate();
                  }}
                  excess={excessMap[dependencies.selectedItem] || 0}
                  onExcessChange={(excess) => {
                    if (dependencies.selectedItem) {
                      handleExcessChange(dependencies.selectedItem, excess);
                    }
                  }}
                  machineCount={machineCountMap[dependencies.selectedItem] || 1}
                  onMachineCountChange={(count) => {
                    if (dependencies.selectedItem) {
                      handleMachineCountChange(dependencies.selectedItem, count);
                    }
                  }}
                  machineMultiplier={machineMultiplierMap[dependencies.selectedItem] || 1}
                  onMachineMultiplierChange={(multiplier) => {
                    if (dependencies.selectedItem) {
                      handleMachineMultiplierChange(dependencies.selectedItem, multiplier);
                    }
                  }}
                />
              </li>
            )}
            {Object.entries(dependencies.accumulatedDependencies).map(([item, amount], index) => {
              const nodeId = `${item}-0`;
              const recipes = filteredRecipes.filter((r) => r.id === item) || [];
              return (
                <li key={item} style={{ marginBottom: "8px" }}>
                  <ItemNode
                    itemId={item}
                    amount={amount}
                    isByproduct={amount < 0}
                    index={index + 1}
                    recipes={recipes}
                    selectedRecipeId={recipeSelections[nodeId] || ''}
                    onRecipeChange={(recipeId) => handleTreeRecipeChange(nodeId, recipeId)}
                    excess={excessMap[item] || 0}
                    onExcessChange={(excess) => handleExcessChange(item, excess)}
                    machineCount={machineCountMap[item] || 1}
                    onMachineCountChange={(count) => handleMachineCountChange(item, count)}
                    machineMultiplier={machineMultiplierMap[item] || 1}
                    onMachineMultiplierChange={(multiplier) => handleMachineMultiplierChange(item, multiplier)}
                  />
                </li>
              );
            })}
          </ul>
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
