import React, { useEffect } from "react";
import DependencyTester from "./components/DependencyTester";
import "./App.css";
import { populateDexie } from "./data/dexieInit";
import { injectThemeVariables } from './styles/theme';

const App: React.FC = () => {
  useEffect(() => {
    populateDexie(); // ✅ Runs only once when the app starts
    injectThemeVariables();
  }, []);
  return (

    <div>
      <h1 style={{ textAlign: "center" }}>Satisfactory Playground</h1>
      {/* <DataDebug /> */}
      <DependencyTester />
    </div>
  );
};

export default App;
