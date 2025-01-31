import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import {
  calculateDependencyTree,
  DependencyNode,
} from "../utils/calculateDependencies";
import { calculateAccumulatedDependencies } from "../utils/calculateAccumulatedDependencies";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";

type ViewMode = "accumulated" | "tree";

const DependencyTester: React.FC = () => {
  const items = useSelector((state: RootState) => state.data.items);
  const recipes = useSelector((state: RootState) => state.data.recipes);
  const state = useSelector((state: RootState) => state);

  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [itemCount, setItemCount] = useState(1);
  const [dependencyTree, setDependencyTree] = useState<DependencyNode | null>(
    null
  );
  const [accumulatedDependencies, setAccumulatedDependencies] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("accumulated");

  const filteredRecipes = recipes.filter((recipe) => recipe.out[selectedItem]);

  React.useEffect(() => {
    if (filteredRecipes.length > 0) {
      const defaultRecipe =
        filteredRecipes.find(
          (r) => r.name === items.find((i) => i.id === selectedItem)?.name
        ) || filteredRecipes[0];
      setSelectedRecipe(defaultRecipe.id);
    }
  }, [selectedItem, filteredRecipes, items]);

  const handleCalculate = () => {
    if (selectedItem && selectedRecipe) {
      const tree = calculateDependencyTree(selectedItem, itemCount, state);
      setDependencyTree(tree);

      const accumulated = calculateAccumulatedDependencies(selectedItem, itemCount, state);
      setAccumulatedDependencies(accumulated);
    }
  };

  return (
    <div className="container">
      <h2>Dependency Tester</h2>

      <label>Item:</label>
      <select
        value={selectedItem}
        onChange={(e) => setSelectedItem(e.target.value)}
      >
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
          <select
            value={selectedRecipe}
            onChange={(e) => setSelectedRecipe(e.target.value)}
          >
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
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
        >
          <option value="accumulated">Accumulated</option>
          <option value="tree">Tree</option>
        </select>
      </div>

      {viewMode === "accumulated" &&
        Object.keys(accumulatedDependencies).length > 0 && (
          <div style={{ textAlign: "left", paddingLeft: "10px" }}>
            {" "}
            {/* ✅ Left-aligned list */}
            <h3>Accumulated Dependencies</h3>
            <ul>
              {/* Produced Item First */}
              <li style={{ color: "#add8e6" }}>
                {selectedItem}: {itemCount.toFixed(2)}
              </li>

              {Object.entries(accumulatedDependencies).map(([item, amount]) => (
                <li
                  key={item}
                  style={{
                    color:
                      amount < 0
                        ? dependencyStyles.byproductColor
                        : dependencyStyles.defaultColor,
                  }}
                >
                  {item}: {amount.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        )}

      {viewMode === "tree" && dependencyTree && (
        <div>
          <h3>Tree View</h3>
          <DependencyTree dependencyTree={dependencyTree} />
        </div>
      )}
    </div>
  );
};

export default DependencyTester;
