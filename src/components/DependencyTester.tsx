import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item, Recipe } from "../data/dexieDB";
import { getComponents, getRecipesForItem } from "../data/dexieQueries";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedDependencies } from "../utils/calculateAccumulatedDependencies";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";

type ViewMode = "accumulated" | "tree";

const DependencyTester: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [itemCount, setItemCount] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("accumulated");
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);

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
            const defaultRecipe =
              recipes.find((r) => r.name === items.find((i) => i.id === selectedItem)?.name) ||
              recipes[0];
            setSelectedRecipe(defaultRecipe.id);
          } else {
            setSelectedRecipe("");
          }
        })
        .catch(console.error);
    }
  }, [selectedItem, items]);

  // 🔹 Calculate dependencies
  const handleCalculate = async () => {
    if (selectedItem && selectedRecipe) {
      const tree = await calculateDependencyTree(selectedItem, itemCount, selectedRecipe);
      const accumulated = await calculateAccumulatedDependencies(selectedItem, itemCount);
      dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
    }
  };



  return (
    <div className="container">
      <h2>Dependency Tester</h2>

      <label>Item:</label>
      <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
        <option value="">Select an Item</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      {filteredRecipes.length > 0 && (
        <>
          <label>Recipe:</label>
          <select value={selectedRecipe} onChange={(e) => setSelectedRecipe(e.target.value)}>
            {filteredRecipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
              </option>
            ))}
          </select>
        </>
      )}

      <label>Count:</label>
      <input
        type="number"
        min="1"
        value={itemCount}
        onChange={(e) => setItemCount(Number(e.target.value))}
      />

      <button onClick={handleCalculate}>Calculate</button>

      <div>
        <label>View Mode:</label>
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
          <option value="accumulated">Accumulated</option>
          <option value="tree">Tree</option>
        </select>
      </div>

      {viewMode === "accumulated" && dependencies.accumulatedDependencies && (
        <div style={dependencyStyles.listContainer}>
          <h3>Accumulated Dependencies</h3>
          <ul>
            {/* ✅ Ensure the root item is displayed */}
            <li style={{ color: dependencyStyles.rootColor }}>
              {dependencies.selectedItem}: {dependencies.itemCount.toFixed(2)}
            </li>

            {Object.entries(dependencies.accumulatedDependencies).map(([item, amount]) => (
              <li key={item} style={{ color: amount < 0 ? dependencyStyles.byproductColor : dependencyStyles.defaultColor }}>
                {item}: {amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}



      {viewMode === "tree" && dependencies.dependencyTree && (
        <div>
          <h3>Tree View</h3>
          <DependencyTree dependencyTree={dependencies.dependencyTree} />
        </div>
      )}
    </div>
  );
};

export default DependencyTester;
