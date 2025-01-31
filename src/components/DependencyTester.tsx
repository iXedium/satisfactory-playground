import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
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

  const [selectedItem, setSelectedItem] = useState("");
  const [itemCount, setItemCount] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("accumulated");

  const handleCalculate = async () => {
    if (selectedItem) {
      const tree = await calculateDependencyTree(selectedItem, itemCount);
      const accumulated = await calculateAccumulatedDependencies(
        selectedItem,
        itemCount
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

      {viewMode === "accumulated" && dependencies.accumulatedDependencies && (
        <div style={dependencyStyles.listContainer}>
          <h3>Accumulated Dependencies</h3>
          <ul>
            <li style={{ color: dependencyStyles.rootColor }}>
              {dependencies.selectedItem}: {dependencies.itemCount.toFixed(2)}
            </li>
            {Object.entries(dependencies.accumulatedDependencies).map(
              ([item, amount]) => (
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
              )
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
