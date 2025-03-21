/**
 * useSettings Hook
 * 
 * Custom hook for managing application settings like
 * theme, production rates, and other user preferences.
 */

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  updateTheme,
  updateProductionRate,
  updateDefaultRecipes,
  toggleSetting
} from '../features/settingsSlice';

type ThemeType = 'light' | 'dark' | 'system';

interface UseSettingsResult {
  // Theme settings
  theme: ThemeType;
  updateThemeSetting: (theme: ThemeType) => void;
  
  // Production rate settings
  productionRate: number;
  updateProductionRateSetting: (rate: number) => void;
  
  // Default recipe settings
  defaultRecipes: Record<string, string>;
  updateDefaultRecipeSetting: (itemId: string, recipeId: string) => void;
  
  // Boolean settings
  showByproducts: boolean;
  showExcess: boolean;
  roundUpMachines: boolean;
  toggleBooleanSetting: (key: 'showByproducts' | 'showExcess' | 'roundUpMachines') => void;
  
  // Is the settings feature enabled
  isFeatureEnabled: (featureName: string) => boolean;
}

/**
 * Hook for managing application settings
 */
export function useSettings(): UseSettingsResult {
  const dispatch = useDispatch();
  
  // Get settings from Redux store
  const theme = useSelector((state: RootState) => state.settings.theme);
  const productionRate = useSelector((state: RootState) => state.settings.productionRate);
  const defaultRecipes = useSelector((state: RootState) => state.settings.defaultRecipes);
  const showByproducts = useSelector((state: RootState) => state.settings.showByproducts);
  const showExcess = useSelector((state: RootState) => state.settings.showExcess);
  const roundUpMachines = useSelector((state: RootState) => state.settings.roundUpMachines);
  const enabledFeatures = useSelector((state: RootState) => state.settings.enabledFeatures);
  
  /**
   * Update the theme setting
   */
  const updateThemeSetting = useCallback((newTheme: ThemeType): void => {
    dispatch(updateTheme(newTheme));
  }, [dispatch]);
  
  /**
   * Update the production rate setting
   */
  const updateProductionRateSetting = useCallback((rate: number): void => {
    dispatch(updateProductionRate(rate));
  }, [dispatch]);
  
  /**
   * Update a default recipe for an item
   */
  const updateDefaultRecipeSetting = useCallback((itemId: string, recipeId: string): void => {
    dispatch(updateDefaultRecipes({ itemId, recipeId }));
  }, [dispatch]);
  
  /**
   * Toggle a boolean setting
   */
  const toggleBooleanSetting = useCallback((key: 'showByproducts' | 'showExcess' | 'roundUpMachines'): void => {
    dispatch(toggleSetting(key));
  }, [dispatch]);
  
  /**
   * Check if a feature is enabled
   */
  const isFeatureEnabled = useCallback((featureName: string): boolean => {
    return enabledFeatures.includes(featureName);
  }, [enabledFeatures]);
  
  return {
    theme,
    updateThemeSetting,
    productionRate,
    updateProductionRateSetting,
    defaultRecipes,
    updateDefaultRecipeSetting,
    showByproducts,
    showExcess,
    roundUpMachines,
    toggleBooleanSetting,
    isFeatureEnabled
  };
}

export default useSettings; 