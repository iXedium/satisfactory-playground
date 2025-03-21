/**
 * useTreeState Hook
 * 
 * Custom hook for managing tree state like expanded/collapsed nodes
 */

import { useState, useCallback } from 'react';

/**
 * Interface for the return value of useTreeState
 */
export interface UseTreeStateResult {
  /**
   * Map of node IDs to their expanded state
   */
  expandedNodes: Record<string, boolean>;
  
  /**
   * Function to handle node expansion state changes
   */
  handleNodeExpandChange: (nodeId: string, expanded: boolean) => void;
  
  /**
   * Function to expand all nodes
   */
  expandAll: () => void;
  
  /**
   * Function to collapse all nodes
   */
  collapseAll: () => void;
  
  /**
   * Function to reset node expansion state
   */
  resetExpandedNodes: () => void;
}

/**
 * Custom hook for managing tree state
 */
const useTreeState = (): UseTreeStateResult => {
  // State for expanded/collapsed nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // Handle node expansion state change
  const handleNodeExpandChange = useCallback((nodeId: string, expanded: boolean) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: expanded
    }));
  }, []);
  
  // Expand all nodes
  const expandAll = useCallback(() => {
    // We don't know all node IDs here, so this will be handled by the component
    // that knows the tree structure and calls this function with all node IDs
    setExpandedNodes(prev => {
      const newExpanded = { ...prev };
      Object.keys(newExpanded).forEach(key => {
        newExpanded[key] = true;
      });
      return newExpanded;
    });
  }, []);
  
  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(prev => {
      const newExpanded = { ...prev };
      Object.keys(newExpanded).forEach(key => {
        newExpanded[key] = false;
      });
      return newExpanded;
    });
  }, []);
  
  // Reset expanded nodes state
  const resetExpandedNodes = useCallback(() => {
    setExpandedNodes({});
  }, []);
  
  return {
    expandedNodes,
    handleNodeExpandChange,
    expandAll,
    collapseAll,
    resetExpandedNodes
  };
};

export default useTreeState; 