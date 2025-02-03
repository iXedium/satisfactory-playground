import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item, Recipe } from "../data/dexieDB";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import ItemWithIcon from "./ItemWithIcon";
import ItemSelect from "./ItemSelect";
import RecipeSelect from "./RecipeSelect";
import { uiStyles } from "../styles/uiStyles";
import { getComponents, getRecipesForItem } from "../data/dbQueries";
import ViewModeSwitch from "./ViewModeSwitch"; // new import for view mode switch
import { alignProperty } from "@mui/material/styles/cssUtils";
import { setRecipeSelection } from "../features/recipeSelectionsSlice";
import { findAffectedBranches } from "../utils/treeDiffing";
import ItemNode from "./ItemNode";
import { theme } from '../styles/theme';

type ViewMode = "accumulated" | "tree";

const DependencyTester: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [itemCount, setItemCount] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("accumulated");
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);

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
      getRecipesForItem(selectedItem)
        .then((recipes) => {
          setFilteredRecipes(recipes);
          if (recipes.length > 0) {
            const defaultRecipe = recipes.find((r) => r.id === selectedItem) || recipes[0];
            setSelectedRecipe(defaultRecipe.id);
          } else {
            setSelectedRecipe("");
          }
        })
        .catch(console.error);
    }
  }, [selectedItem]);

  // Update calculate handler with dependency checking
  const handleCalculate = async () => {
    if (selectedItem && selectedRecipe) {
      // Check if calculation is needed
      const needsCalculation = !lastCalculated 
        || lastCalculated.item !== selectedItem
        || lastCalculated.recipe !== selectedRecipe
        || lastCalculated.count !== itemCount;

      if (needsCalculation) {
        const tree = await calculateDependencyTree(selectedItem, itemCount, selectedRecipe, recipeSelections);
        const accumulated = calculateAccumulatedFromTree(tree);
        dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
        
        // Update last calculated state
        setLastCalculated({
          item: selectedItem,
          recipe: selectedRecipe,
          count: itemCount
        });
      }
    }
  };

  const handleTreeRecipeChange = async (nodeId: string, recipeId: string) => {
    // console.log('handleTreeRecipeChange called:', { nodeId, recipeId });
    
    const affectedBranches = dependencies.dependencyTree 
      ? findAffectedBranches(dependencies.dependencyTree, nodeId)
      : [];
    
    // Create updated recipe selections map
    const updatedRecipeSelections = {
      ...recipeSelections,
      [nodeId]: recipeId
    };
    
    // Update recipe selection in Redux
    dispatch(setRecipeSelection({ nodeId, recipeId }));

    // Use updated selections map instead of waiting for state update
    if (selectedItem && selectedRecipe) {
      const tree = await calculateDependencyTree(
        selectedItem, 
        itemCount, 
        selectedRecipe, 
        updatedRecipeSelections,  // Use updated map here
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

  return (
    <div className="container">
      <h2>Dependency Tester</h2>

      <div style={uiStyles.container}>
        <div>
          <label style={uiStyles.formGroup}>Item:</label>
          <ItemSelect
            items={items}
            value={selectedItem}
            onChange={setSelectedItem}
            placeholder="Select an Item"
          />
        </div>

        {filteredRecipes.length > 0 && (
          <div>
            <label style={uiStyles.formGroup}>Recipe:</label>
            <RecipeSelect
              recipes={filteredRecipes}
              value={selectedRecipe}
              onChange={setSelectedRecipe}
              placeholder="Select a Recipe"
            />
          </div>
        )}

        <div>
          <label style={uiStyles.formGroup}>Count:</label>
          <input
            type="number"
            min="1"
            value={itemCount}
            onChange={(e) => setItemCount(Number(e.target.value))}
            style={uiStyles.input}
          />
        </div>

        {/* Replace dropdown with switch */}
        <div>
          <label style={uiStyles.formGroup}>View Mode:</label>
          <ViewModeSwitch
            mode={viewMode === "tree" ? "tree" : "list"}
            onToggle={(mode) =>
              setViewMode(mode === "list" ? "accumulated" : "tree")
            }
          />
        </div>

        <button
          onClick={handleCalculate}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonDefault}
          style={uiStyles.button}
        >
          Calculate
        </button>
      </div>

      {Object.keys(dependencies.accumulatedDependencies || {}).length > 0 && (
        <div style={{ ...dependencyStyles.listContainer, display: viewMode === "accumulated" ? "block" : "none" }}>
          <h3 style={{ textAlign: "center" }}>Accumulated Dependencies</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {/* Root item */}
            {dependencies.selectedItem && (
              <li style={{ marginBottom: "8px" }}>
                <ItemNode
                  itemId={dependencies.selectedItem}
                  amount={dependencies.itemCount}
                  isRoot={true}
                />
              </li>
            )}

            {/* Dependencies */}
            {Object.entries(dependencies.accumulatedDependencies).map(([item, amount]) => (
              <li key={item} style={{ marginBottom: "8px" }}>
                <ItemNode
                  itemId={item}
                  amount={amount}
                  isByproduct={amount < 0}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dependencies.dependencyTree && (
        <div style={{ display: viewMode === "tree" ? "block" : "none" }}>
          <h3>Tree View</h3>
          <DependencyTree 
            dependencyTree={dependencies.dependencyTree}
            onRecipeChange={handleTreeRecipeChange}
          />
        </div>
      )}
    </div>
  );
};

export default DependencyTester;
