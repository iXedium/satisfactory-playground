/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import FactoryPlanner from "./features/factory-planner/components/FactoryPlanner";
import "./styles/App.css";
import { useInitialization, InitializationProvider } from "./contexts/InitializationContext";
import { HideToggleDragProvider } from "./contexts/HideToggleDragContext";
import { TreeNavigationProvider } from "./contexts/TreeNavigationContext";

import { useWorkspaceInit } from "./features/workspace/hooks/useWorkspaceInit";

const App: React.FC = () => {
  const { isLoading, isError, errorMessage } = useInitialization();
  useWorkspaceInit();

  useEffect(() => {
    const preventZoomOnInputs = (e: WheelEvent) => {
      if (
        e.ctrlKey && 
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', preventZoomOnInputs, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventZoomOnInputs);
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        color: '#f5f5f5',
        background: '#1e1e1e'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Loading Satisfactory Calculator</div>
        <div style={{ fontSize: '16px' }}>Initializing application...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        color: '#f5f5f5',
        background: '#1e1e1e'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b' }}>Error Loading Application</div>
        <div style={{ fontSize: '16px', maxWidth: '600px', textAlign: 'center' }}>
          {errorMessage || "An unknown error occurred."}
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            background: '#ff9f43',
            color: '#1e1e1e',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '16px',
            fontWeight: 'bold'
          }}
        >
          Reload Application
        </button>
      </div>
    );
  }

  return (
    <div>
      <FactoryPlanner />
    </div>
  );
};

const AppWithProvider: React.FC = () => (
  <InitializationProvider>
    <HideToggleDragProvider>
      <TreeNavigationProvider>
        <App />
      </TreeNavigationProvider>
    </HideToggleDragProvider>
  </InitializationProvider>
);

export default AppWithProvider;
