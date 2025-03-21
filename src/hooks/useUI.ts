import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import {
  setActiveTab,
  toggleSection,
  setSectionExpanded,
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setViewMode,
  resetUI
} from '../features/uiSlice';

/**
 * Hook for UI state management
 * 
 * Provides access to UI state and actions for manipulating the UI
 */
export function useUI() {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(state => state.ui);
  
  // Tab navigation
  const setTab = useCallback((tab: string) => {
    dispatch(setActiveTab(tab));
  }, [dispatch]);
  
  // Section expansion
  const toggleSectionExpansion = useCallback((sectionId: string) => {
    dispatch(toggleSection(sectionId));
  }, [dispatch]);
  
  const expandSection = useCallback((sectionId: string, expanded: boolean = true) => {
    dispatch(setSectionExpanded({ sectionId, expanded }));
  }, [dispatch]);
  
  const isSectionExpanded = useCallback((sectionId: string) => {
    return !!ui.expandedSections[sectionId];
  }, [ui.expandedSections]);
  
  // Modal management
  const showModal = useCallback((modalId: string, type?: string, data?: any) => {
    dispatch(openModal({ modalId, type, data }));
  }, [dispatch]);
  
  const hideModal = useCallback((modalId: string) => {
    dispatch(closeModal(modalId));
  }, [dispatch]);
  
  const isModalOpen = useCallback((modalId: string) => {
    return ui.modals[modalId]?.isOpen || false;
  }, [ui.modals]);
  
  const getModalData = useCallback((modalId: string) => {
    return ui.modals[modalId]?.data;
  }, [ui.modals]);
  
  // Sidebar management
  const toggleSidebarOpen = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);
  
  const setSidebarOpenState = useCallback((isOpen: boolean) => {
    dispatch(setSidebarOpen(isOpen));
  }, [dispatch]);
  
  // Theme management
  const setThemePreference = useCallback((theme: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(theme));
  }, [dispatch]);
  
  // View mode management
  const setViewModePreference = useCallback((mode: 'default' | 'compact' | 'expanded') => {
    dispatch(setViewMode(mode));
  }, [dispatch]);
  
  // Reset UI
  const resetAllUI = useCallback(() => {
    dispatch(resetUI());
  }, [dispatch]);
  
  // Combine all exports into a single object
  return {
    // State
    activeTab: ui.activeTab,
    sidebarOpen: ui.sidebarOpen,
    theme: ui.theme,
    viewMode: ui.viewMode,
    
    // Actions
    setTab,
    toggleSectionExpansion,
    expandSection,
    isSectionExpanded,
    showModal,
    hideModal,
    isModalOpen,
    getModalData,
    toggleSidebarOpen,
    setSidebarOpenState,
    setThemePreference,
    setViewModePreference,
    resetAllUI
  };
}

export default useUI; 