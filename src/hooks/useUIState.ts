/**
 * useUIState Hook
 * 
 * Custom hook for managing UI state like expanded nodes, selected views,
 * and other UI-related state.
 */

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { ViewMode } from '../types/core';
import { 
  toggleNodeExpanded, 
  setActiveTabIndex, 
  setViewMode,
  toggleSidebar
} from '../features/uiSlice';

interface UseUIStateResult {
  // Expanded nodes state
  expandedNodes: Record<string, boolean>;
  isNodeExpanded: (nodeId: string) => boolean;
  toggleExpanded: (nodeId: string) => void;
  
  // Active tab state
  activeTabIndex: number;
  setActiveTab: (index: number) => void;
  
  // View selection state
  selectedView: ViewMode;
  selectView: (view: ViewMode) => void;
  
  // Sidebar state
  isSidebarOpen: boolean;
  toggleSidebarOpen: () => void;
}

/**
 * Hook for managing UI state
 */
export function useUIState(): UseUIStateResult {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get UI state from Redux store
  const expandedNodes = useSelector((state: RootState) => state.ui.expandedNodes);
  const activeTabIndex = useSelector((state: RootState) => state.ui.activeTabIndex);
  const selectedView = useSelector((state: RootState) => state.ui.viewMode);
  const isSidebarOpen = useSelector((state: RootState) => state.ui.isSidebarOpen);
  
  /**
   * Check if a node is expanded
   */
  const isNodeExpanded = useCallback((nodeId: string): boolean => {
    return expandedNodes[nodeId] ?? true; // Default to expanded
  }, [expandedNodes]);
  
  /**
   * Toggle a node's expanded state
   */
  const toggleExpanded = useCallback((nodeId: string): void => {
    dispatch(toggleNodeExpanded(nodeId));
  }, [dispatch]);
  
  /**
   * Set the active tab index
   */
  const setActiveTab = useCallback((index: number): void => {
    dispatch(setActiveTabIndex(index));
  }, [dispatch]);
  
  /**
   * Select a view type
   */
  const selectView = useCallback((view: ViewMode): void => {
    dispatch(setViewMode(view));
  }, [dispatch]);
  
  /**
   * Toggle the sidebar open/closed state
   */
  const toggleSidebarOpen = useCallback((): void => {
    dispatch(toggleSidebar());
  }, [dispatch]);
  
  return {
    expandedNodes,
    isNodeExpanded,
    toggleExpanded,
    activeTabIndex,
    setActiveTab,
    selectedView,
    selectView,
    isSidebarOpen,
    toggleSidebarOpen
  };
}

export default useUIState; 