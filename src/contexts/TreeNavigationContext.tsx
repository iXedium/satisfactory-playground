import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface NavigationRequest {
  targetNodeId: string;
  treeId: string;
  pathNodeIds: string[]; // All node IDs in the path that need to be expanded
}

interface TreeNavigationContextType {
  navigationRequest: NavigationRequest | null;
  requestNavigateToNode: (targetNodeId: string, treeId: string) => void;
  clearNavigationRequest: () => void;
}

const TreeNavigationContext = createContext<TreeNavigationContextType | null>(null);

/**
 * Extracts the path of parent node IDs from a node's uniqueId.
 * Given: tree-computer-123-computer-0-cable-1
 * Returns: ['tree-computer-123', 'tree-computer-123-computer-0', 'tree-computer-123-computer-0-cable-1']
 */
function extractPathFromNodeId(nodeId: string, treeId: string): string[] {
  const path: string[] = [treeId]; // Always include the root tree ID
  
  // If the nodeId is just the treeId, return just the tree
  if (nodeId === treeId) {
    return path;
  }
  
  // The nodeId format is: treeId-itemId-depth-itemId-depth-...
  // We need to extract each parent by finding the pattern
  const suffix = nodeId.slice(treeId.length);
  if (!suffix.startsWith('-')) {
    // nodeId doesn't start with treeId, unexpected format
    logger.warn('[TreeNavigationContext] Unexpected nodeId format:', nodeId);
    return [nodeId];
  }
  
  // Parse the suffix to find each level
  // Format: -itemId-depth-itemId-depth-...
  const segments = suffix.slice(1).split('-');
  let currentPath = treeId;
  
  // Group segments into pairs (itemId, depth)
  for (let i = 0; i < segments.length - 1; i += 2) {
    const itemId = segments[i];
    const depth = segments[i + 1];
    if (itemId && depth !== undefined) {
      currentPath = `${currentPath}-${itemId}-${depth}`;
      path.push(currentPath);
    }
  }
  
  return path;
}

interface TreeNavigationProviderProps {
  children: ReactNode;
}

export const TreeNavigationProvider: React.FC<TreeNavigationProviderProps> = ({ children }) => {
  const [navigationRequest, setNavigationRequest] = useState<NavigationRequest | null>(null);

  const requestNavigateToNode = useCallback((targetNodeId: string, treeId: string) => {
    logger.debug('[TreeNavigationContext] Navigation requested to:', targetNodeId);
    const pathNodeIds = extractPathFromNodeId(targetNodeId, treeId);
    logger.debug('[TreeNavigationContext] Path to expand:', pathNodeIds);
    
    setNavigationRequest({
      targetNodeId,
      treeId,
      pathNodeIds,
    });
  }, []);

  const clearNavigationRequest = useCallback(() => {
    setNavigationRequest(null);
  }, []);

  return (
    <TreeNavigationContext.Provider value={{ navigationRequest, requestNavigateToNode, clearNavigationRequest }}>
      {children}
    </TreeNavigationContext.Provider>
  );
};

export const useTreeNavigation = (): TreeNavigationContextType => {
  const context = useContext(TreeNavigationContext);
  if (!context) {
    throw new Error('useTreeNavigation must be used within a TreeNavigationProvider');
  }
  return context;
};
