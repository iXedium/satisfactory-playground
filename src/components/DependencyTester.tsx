import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item, Recipe } from "../data/dexieDB";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedDependencies } from "../utils/calculateAccumulatedDependencies";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import ItemWithIcon from "./ItemWithIcon";
import ItemSelect from "./ItemSelect";
import RecipeSelect from "./RecipeSelect";
import { uiStyles } from "../styles/uiStyles";
import { getComponents, getRecipesForItem } from "../data/dbQueries";

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

  // Calculate dependencies
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

        <div>
          <label style={uiStyles.formGroup}>View Mode:</label>
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            style={uiStyles.select}
          >
            <option value="accumulated">Accumulated</option>
            <option value="tree">Tree</option>
          </select>
        </div>

        <button
          onClick={handleCalculate}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#007bff"}
          style={uiStyles.button}
        >
          Calculate
        </button>
      </div>

      {viewMode === "accumulated" && dependencies.accumulatedDependencies && (
        <div style={dependencyStyles.listContainer}>
          <h3>Accumulated Dependencies</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {/* Root item */}
            {dependencies.selectedItem && (
              <li style={{ marginBottom: "8px" }}>
                <ItemWithIcon 
                  itemId={dependencies.selectedItem} 
                  amount={dependencies.itemCount}
                  color={dependencyStyles.rootColor} 
                />
              </li>
            )}

            {/* Dependencies */}
            {Object.entries(dependencies.accumulatedDependencies).map(([item, amount]) => (
              <li key={item} style={{ marginBottom: "8px" }}>
                <ItemWithIcon 
                  itemId={item} 
                  amount={amount}
                  color={amount < 0 ? dependencyStyles.byproductColor : dependencyStyles.defaultColor} 
                />
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
