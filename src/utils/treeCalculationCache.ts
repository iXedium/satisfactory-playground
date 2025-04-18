import { DependencyNode } from "../types";

// Cache for memoizing tree calculations
export const nodeCache = new Map<string, DependencyNode>();

export const getNodeFromCache = async (nodeId: string): Promise<DependencyNode | null> => {
  // In a real-world scenario with async storage, you might await here.
  // Since it's a Map, it's synchronous, but we keep the async signature 
  // for potential future changes or compatibility with the original code.
  return nodeCache.get(nodeId) || null;
};

export const cacheNode = async (nodeId: string, node: DependencyNode) => {
  // Similarly, keep async signature.
  nodeCache.set(nodeId, node);
};

export const clearNodeFromCache = async (nodeId: string) => {
  // Keep async signature.
  nodeCache.delete(nodeId);
};

export const clearNodeCache = () => {
  // This can remain synchronous as it directly manipulates the Map.
  nodeCache.clear();
  
}; 