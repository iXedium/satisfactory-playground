import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '../store';
import { useUI } from '../hooks/useUI';
import { useSettingsState } from '../hooks/useStore';
import { persistence } from '../services/persistence';

// Create a context for app-wide state and utilities
interface AppStateContextType {
  // Theme integration
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  // Settings integration
  settings: ReturnType<typeof useSettingsState>;
  // Persistence service access
  persistence: typeof persistence;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

// Helper hook to use the context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// Provider component
export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get UI state including theme
  const { theme } = useUI();
  
  // Get settings state
  const settings = useSettingsState();
  
  // Resolve theme based on system preference and theme setting
  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);
  
  // Construct the context value
  const contextValue = useMemo(() => ({
    theme,
    resolvedTheme,
    settings,
    persistence,
  }), [theme, resolvedTheme, settings]);
  
  // Apply theme class to body
  React.useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${resolvedTheme}-theme`);
  }, [resolvedTheme]);
  
  return (
    <ReduxProvider store={store}>
      <AppStateContext.Provider value={contextValue}>
        {children}
      </AppStateContext.Provider>
    </ReduxProvider>
  );
};

export default AppStateProvider; 