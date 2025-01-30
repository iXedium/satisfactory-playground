import React from "react";
// import DataDebug from "./components/DataDebug";
import DependencyTester from "./components/DependencyTester";
import "./App.css";
const App: React.FC = () => {
  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Satisfactory Playground</h1>
      {/* <DataDebug /> */}
      <DependencyTester />
    </div>
  );
};

export default App;
