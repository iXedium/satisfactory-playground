import React, { useEffect, useState } from "react";
import DependencyTester from "./components/DependencyTester";
import "./App.css";
import { populateDexie } from "./data/dexieInit";
import { injectThemeVariables } from './styles/theme';

const App: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Inject theme variables
        injectThemeVariables();
        
        // Initialize database
        console.log("Initializing database...");
        await populateDexie();
        console.log("Database initialization complete");
        setDbStatus('ready');
      } catch (error) {
        console.error("Failed to initialize application:", error);
        setDbStatus('error');
        setErrorMessage(error instanceof Error ? error.message : "Unknown error initializing the application");
      }
    };

    initializeApp();
  }, []);

  // Loading state
  if (dbStatus === 'loading') {
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
        <div style={{ fontSize: '16px' }}>Initializing database...</div>
      </div>
    );
  }

  // Error state
  if (dbStatus === 'error') {
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
          {errorMessage || "There was a problem initializing the application."}
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

  // Ready state - render the main application
  return (
    <div>
      <DependencyTester />
    </div>
  );
};

export default App;
