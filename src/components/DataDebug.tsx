import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";

const DataDebug: React.FC = () => {
  const items = useSelector((state: RootState) => state.data.items);
  const recipes = useSelector((state: RootState) => state.data.recipes);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", background: "#222", color: "#fff" }}>
      <h2>Loaded Data Debug</h2>
      <h3>Items</h3>
      <pre>{JSON.stringify(items.slice(0, 5), null, 2)}</pre> {/* Display first 5 items */}
      <h3>Recipes</h3>
      <pre>{JSON.stringify(recipes.slice(0, 5), null, 2)}</pre> {/* Display first 5 recipes */}
    </div>
  );
};

export default DataDebug;
