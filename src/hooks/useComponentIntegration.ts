import { useCallback } from 'react';
import { useUI } from './useUI';
import { useAppDispatch } from './useStore';
import { useSettings } from './useSettings';
import { usePersistentState } from './usePersistentState';

/**
 * Hook for cross-component integration
 * 
 * Provides centralized access to common cross-component functionality
 */
export function useComponentIntegration() {
  const dispatch = useAppDispatch();
  const { showModal, hideModal, setTab } = useUI();
  const { toggleBooleanSetting, updateDefaultRecipeSetting } = useSettings();
  
  // Track recently viewed items
  const [recentItems, setRecentItems] = usePersistentState<string[]>('recentItems', []);
  
  // Integration: Open settings
  const openSettings = useCallback(() => {
    showModal('settings');
  }, [showModal]);
  
  // Integration: Recipe selection - update default and show calculator
  const selectRecipeAndShowCalculator = useCallback((itemId: string, recipeId: string) => {
    // Update default recipe
    updateDefaultRecipeSetting(itemId, recipeId);
    
    // Open calculator tab
    setTab('calculator');
    
    // Record in recent items (keep last 10)
    setRecentItems(prev => {
      const filtered = prev.filter(id => id !== itemId);
      return [itemId, ...filtered].slice(0, 10);
    });
  }, [updateDefaultRecipeSetting, setTab, setRecentItems]);
  
  // Integration: Toggle component visibility in multiple places
  const toggleComponentVisibility = useCallback((componentId: string) => {
    // Use our existing boolean settings for components that have settings
    switch (componentId) {
      case 'machines':
        toggleBooleanSetting('showMachines');
        break;
      case 'byproducts':
        toggleBooleanSetting('showByproducts');
        break;
      case 'extensions':
        toggleBooleanSetting('showExtensions');
        break;
      default:
        // For custom UI-only components without settings
        // We could add additional handling here
        break;
    }
  }, [toggleBooleanSetting]);
  
  // Integration: Handle import/export across components
  const openImportExport = useCallback(() => {
    showModal('importExport');
  }, [showModal]);
  
  // Get the user's recent items
  const getRecentItems = useCallback(() => {
    return recentItems;
  }, [recentItems]);
  
  return {
    // Cross-component actions
    openSettings,
    selectRecipeAndShowCalculator,
    toggleComponentVisibility,
    openImportExport,
    getRecentItems,
    
    // Data
    recentItems
  };
}

export default useComponentIntegration; 