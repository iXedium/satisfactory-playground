/**
 * Settings Redux Slice
 * 
 * Manages all application settings and preferences.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the state shape for settings
export interface SettingsState {
  // Theme settings
  theme: 'light' | 'dark' | 'system';
  
  // Production rate settings
  productionRate: number;
  
  // Default recipe settings - itemId to recipeId mapping
  defaultRecipes: Record<string, string>;
  
  // Display settings
  showByproducts: boolean;
  showExcess: boolean;
  roundUpMachines: boolean;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  
  // UI settings
  compactView: boolean;
  
  // Feature flags - used to enable/disable features
  enabledFeatures: string[];
}

// Initial state
const initialState: SettingsState = {
  theme: 'dark',
  productionRate: 60, // Default to 60 items per minute
  defaultRecipes: {},
  showByproducts: true,
  showExcess: true,
  roundUpMachines: true,
  showMachines: true,
  showMachineMultiplier: false,
  showExtensions: false,
  accumulateExtensions: true,
  compactView: false,
  enabledFeatures: ['core', 'calculator']
};

// Load from localStorage if available
const loadInitialState = (): SettingsState => {
  try {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      return { ...initialState, ...JSON.parse(savedSettings) };
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }
  return initialState;
};

// Create the settings slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadInitialState(),
  reducers: {
    // Update theme
    updateTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
      saveToLocalStorage(state);
    },
    
    // Update production rate
    updateProductionRate: (state, action: PayloadAction<number>) => {
      state.productionRate = action.payload;
      saveToLocalStorage(state);
    },
    
    // Update default recipes
    updateDefaultRecipes: (state, action: PayloadAction<{ itemId: string, recipeId: string }>) => {
      const { itemId, recipeId } = action.payload;
      state.defaultRecipes[itemId] = recipeId;
      saveToLocalStorage(state);
    },
    
    // Toggle boolean settings
    toggleSetting: (state, action: PayloadAction<keyof SettingsState>) => {
      const key = action.payload;
      if (typeof state[key] === 'boolean') {
        // @ts-ignore: We've already checked that this is a boolean
        state[key] = !state[key];
        saveToLocalStorage(state);
      }
    },
    
    // Update multiple settings at once
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      Object.assign(state, action.payload);
      saveToLocalStorage(state);
    },
    
    // Add a feature to enabled features
    enableFeature: (state, action: PayloadAction<string>) => {
      if (!state.enabledFeatures.includes(action.payload)) {
        state.enabledFeatures.push(action.payload);
        saveToLocalStorage(state);
      }
    },
    
    // Remove a feature from enabled features
    disableFeature: (state, action: PayloadAction<string>) => {
      state.enabledFeatures = state.enabledFeatures.filter(
        feature => feature !== action.payload
      );
      saveToLocalStorage(state);
    },
    
    // Reset settings to defaults
    resetSettings: () => {
      localStorage.removeItem('appSettings');
      return initialState;
    }
  }
});

// Helper to save settings to localStorage
const saveToLocalStorage = (state: SettingsState) => {
  try {
    localStorage.setItem('appSettings', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
};

// Export actions
export const {
  updateTheme,
  updateProductionRate,
  updateDefaultRecipes,
  toggleSetting,
  updateSettings,
  enableFeature,
  disableFeature,
  resetSettings
} = settingsSlice.actions;

// Export reducer
export default settingsSlice.reducer; 