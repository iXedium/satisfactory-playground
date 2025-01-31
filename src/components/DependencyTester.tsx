import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { db } from "../data/dexieDB";
import { calculateDependencyTree } from "../utils/calculateDependencies";
import { calculateAccumulatedDependencies } from "../utils/calculateAccumulatedDependencies";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import { CSSProperties } from "react";

import { Item } from "../types"; // ✅ Ensure you have a proper Item type


type ViewMode = "accumulated" | "tree";

const DependencyTester: React.FC = () => {
  const dispatch = useDispatch();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [itemCount, setItemCount] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("accumulated");

  const listStyle: CSSProperties = { textAlign: "left", paddingLeft: "10px" };


  useEffect(() => {
    const fetchData = async () => {
      const itemsData = await db.items.toArray();
      setItems(itemsData);
    };
    fetchData();
  }, []);

  const handleCalculate = async () => {
    if (selectedItem) {
      const recipes = await db.recipes
        .where("out")
        .equals(selectedItem)
        .toArray();
      const tree = calculateDependencyTree(selectedItem, itemCount, {
        recipes,
      });
      const accumulated = calculateAccumulatedDependencies(
        selectedItem,
        itemCount,
        { recipes }
      );

      dispatch(
        setDependencies({
          item: selectedItem,
          count: itemCount,
          tree,
          accumulated,
        })
      );
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

      {viewMode === "accumulated" && (
        <div style={dependencyStyles.listContainer}>
          <h3>Accumulated Dependencies</h3>
          <ul>
            <li style={{ color: dependencyStyles.rootColor }}>
              {selectedItem}: {itemCount.toFixed(2)}
            </li>
            {Object.entries(items).map(([item, amount]) => (
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

      {viewMode === "tree" && (
        <div>
          <h3>Tree View</h3>
          <DependencyTree
            dependencyTree={
              dependencyTree ?? {
                id: "",
                amount: 0,
                uniqueId: "",
                children: [],
              }
            }
          />
        </div>
      )}
    </div>
  );
};

export default DependencyTester;
