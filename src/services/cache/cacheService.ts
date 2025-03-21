/**
 * CacheService
 * 
 * Provides caching functionality for expensive operations like tree calculations.
 * This service separates caching logic from business logic.
 */

import { DependencyNode } from '../../types/core';

/**
 * In-memory cache for dependency tree nodes
 */
export const nodeCache = new Map<string, DependencyNode>();

/**
 * Get a node from the cache by its unique ID
 * 
 * @param nodeId - The unique ID of the node
 * @returns The cached node or null if not found
 */
export async function getNodeFromCache(nodeId: string): Promise<DependencyNode | null> {
  return nodeCache.get(nodeId) || null;
}

/**
 * Store a node in the cache
 * 
 * @param nodeId - The unique ID of the node
 * @param node - The node to cache
 */
export async function cacheNode(nodeId: string, node: DependencyNode): Promise<void> {
  nodeCache.set(nodeId, node);
}

/**
 * Remove a node from the cache
 * 
 * @param nodeId - The unique ID of the node to remove
 */
export async function clearNodeFromCache(nodeId: string): Promise<void> {
  nodeCache.delete(nodeId);
}

/**
 * Clear all nodes from the cache
 */
export async function clearCache(): Promise<void> {
  nodeCache.clear();
}

/**
 * Get the current size of the cache
 * 
 * @returns The number of items in the cache
 */
export function getCacheSize(): number {
  return nodeCache.size;
}

/**
 * Clear nodes matching a pattern from the cache
 * 
 * @param pattern - A string pattern to match against node IDs
 */
export async function clearCacheByPattern(pattern: string): Promise<void> {
  for (const key of nodeCache.keys()) {
    if (key.includes(pattern)) {
      nodeCache.delete(key);
    }
  }
}

/**
 * Memoize a function with caching
 * 
 * @param fn - The function to memoize
 * @param keyFn - Function to generate cache key from arguments
 * @returns Memoized function with same signature as original
 */
export function memoize<T, R>(
  fn: (...args: T[]) => R, 
  keyFn: (...args: T[]) => string
): (...args: T[]) => R {
  const cache = new Map<string, R>();
  
  return (...args: T[]): R => {
    const key = keyFn(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
} 