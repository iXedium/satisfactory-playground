import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistenceService } from '../services/persistence';
import uiReducer from '../features/uiSlice';
import dataReducer from '../features/dataSlice';
import settingsReducer from '../features/settingsSlice';
import dependencyReducer from '../features/dependencySlice';
import importExportReducer from '../features/importExportSlice';
import recipeSelectionsReducer from '../features/recipeSelectionsSlice';
import machinesReducer from '../features/machinesSlice';

// Define the root state type and reducers configuration
const rootReducer = combineReducers({
  ui: uiReducer,
  data: dataReducer,
  settings: settingsReducer,
  dependencies: dependencyReducer,
  importExport: importExportReducer,
  recipeSelections: recipeSelectionsReducer,
  machines: machinesReducer
});

// Type for the entire Redux store state
export type RootState = ReturnType<typeof rootReducer>;

// Create storage keys for each slice
const STORAGE_KEYS = {
  UI: 'ui',
  SETTINGS: 'settings',
  DEPENDENCIES: 'dependencies',
  RECIPE_SELECTIONS: 'recipe_selections',
  MACHINES: 'machines'
};

/**
 * Configure the Redux store with persistence middleware
 */
export const configureAppStore = () => {
  // Create initial state from localStorage where applicable
  const preloadedState = {
    ui: persistenceService.loadState(STORAGE_KEYS.UI, {}),
    settings: persistenceService.loadState(STORAGE_KEYS.SETTINGS, {}),
    dependencies: persistenceService.loadState(STORAGE_KEYS.DEPENDENCIES, {}),
    recipeSelections: persistenceService.loadState(STORAGE_KEYS.RECIPE_SELECTIONS, { selections: {} }),
    machines: persistenceService.loadState(STORAGE_KEYS.MACHINES, { machineCount: {}, machineMultiplier: {} })
  };
  
  // Configure the store with preloaded state and middleware
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => 
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore non-serializable values in specific paths
          ignoredActions: ['persist/SAVE'],
          ignoredPaths: ['ui.callbacks']
        },
      })
  });
  
  // Set up persistence subscribers
  store.subscribe(() => {
    const state = store.getState();
    
    // Save each slice individually for better performance
    persistenceService.saveState(STORAGE_KEYS.UI, state.ui);
    persistenceService.saveState(STORAGE_KEYS.SETTINGS, state.settings);
    persistenceService.saveState(STORAGE_KEYS.DEPENDENCIES, state.dependencies);
    persistenceService.saveState(STORAGE_KEYS.RECIPE_SELECTIONS, state.recipeSelections);
    persistenceService.saveState(STORAGE_KEYS.MACHINES, state.machines);
  });
  
  return store;
};

// Export the store singleton
export const store = configureAppStore();

// Export the typed dispatch to use throughout the app
export type AppDispatch = typeof store.dispatch; 