import React from 'react';
import { AppStateProvider } from './providers/AppStateProvider';
import { useUI } from './hooks/useUI';
import DependencyTester from './components/DependencyTester';
import { Dashboard } from './components/dashboard';
import { 
  ErrorBoundary, 
  AccessibilityProvider, 
  SkipToContent 
} from './components/common';
import './App.css';

// Component for displaying content based on active tab
const TabContent: React.FC = () => {
  const { activeTab } = useUI();
  
  // Render the appropriate component based on the active tab
  switch (activeTab) {
    case 'home':
      return <Dashboard />;
    case 'dependencies':
    case 'calculator':
    case 'power':
    case 'settings':
    default:
      // For now, render the legacy component for all other tabs
      // This will be replaced with individual components as they're refactored
      return <DependencyTester />;
  }
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <AppStateProvider>
          <div className="app">
            <SkipToContent mainContentId="main-content" />
            <main id="main-content">
              <TabContent />
            </main>
          </div>
        </AppStateProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
};

export default App;
