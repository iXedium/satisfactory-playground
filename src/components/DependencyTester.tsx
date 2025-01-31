import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch, store } from "../store";
import { db, Recipe } from "../data/dexieDB";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedDependencies } from "../utils/calculateAccumulatedDependencies";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";

type ViewMode = "accumulated" | "tree";

const DependencyTester: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const items = useSelector((state: RootState) => state.data.items);
  const dependencies = useSelector((state: RootState) => state.dependencies);
  console.log("Redux Dependencies in Component:", dependencies); // ✅ Debugging


  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(""); // ✅ Add recipe state
  const [itemCount, setItemCount] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("accumulated");
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]); // ✅ Fix: Explicitly define the type

  // 🔹 Fetch recipes when item changes
  useEffect(() => {
    if (selectedItem) {
      db.recipes
        .toArray()
        .then((allRecipes) => {
          const filtered = allRecipes.filter((recipe) =>
            Object.keys(recipe.out).includes(selectedItem)
          );

          setFilteredRecipes(filtered); // ✅ Update dropdown options

          if (filtered.length > 0) {
            const defaultRecipe =
              filtered.find((r) => r.name === items.find((i) => i.id === selectedItem)?.name) ||
              filtered[0];
            setSelectedRecipe(defaultRecipe.id); // ✅ Set default recipe
          } else {
            setSelectedRecipe(""); // ❌ No recipe found
          }
        })
        .catch((error) => console.error("Error fetching recipes:", error));
    }
  }, [selectedItem, items]);

  // 🔹 Calculate dependencies
  const handleCalculate = async () => {
    if (selectedItem && selectedRecipe) {
      const tree = await calculateDependencyTree(selectedItem, itemCount);
      console.log("🔍 Tree Calculation Result:", tree); // ✅ Debugging

      const accumulated = await calculateAccumulatedDependencies(selectedItem, itemCount);
      console.log("🔍 Accumulated Dependencies Result:", accumulated); // ✅ Debugging

      dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));

      // 🔹 Log Redux state after update
      setTimeout(() => {
        console.log("🔍 Redux State After Dispatch:", store.getState().dependencies);
      }, 500);
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
            {/* Ensure UI always renders something */}
            {Object.keys(dependencies.accumulatedDependencies).length === 0 ? (
              <li style={{ color: "red" }}>No dependencies found</li> // ✅ Debugging
            ) : (
              Object.entries(dependencies.accumulatedDependencies).map(([item, amount]) => (
                <li key={item} style={{ color: amount < 0 ? dependencyStyles.byproductColor : dependencyStyles.defaultColor }}>
                  {item}: {amount.toFixed(2)}
                </li>
              ))
            )}
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
