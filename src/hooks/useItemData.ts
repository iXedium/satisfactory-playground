/**
 * useItemData Hook
 * 
 * Custom hook for loading and managing item data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Item } from '../types/core';
import { getItems, getItemById, searchItems } from '../data/dbQueries';
import { memoizeWithTTL } from '../utils/memoization';

// Cache item fetching with 5 minute TTL
const getItemsCached = memoizeWithTTL(getItems, 5 * 60 * 1000);
const getItemByIdCached = memoizeWithTTL(getItemById, 5 * 60 * 1000);

interface UseItemDataProps {
  initialItemId?: string;
  preloadAll?: boolean;
}

interface UseItemDataResult {
  items: Item[];
  selectedItem: Item | null;
  isLoading: boolean;
  error: string | null;
  selectItem: (itemId: string) => void;
  searchItemsByTerm: (searchTerm: string) => Item[];
  refreshItems: () => void;
  getItemName: (itemId: string) => string;
}

/**
 * Hook for managing item data
 */
export function useItemData({
  initialItemId,
  preloadAll = true
}: UseItemDataProps = {}): UseItemDataResult {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(initialItemId);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load all items if preloadAll is true
  useEffect(() => {
    if (preloadAll) {
      setIsLoading(true);
      try {
        const allItems = getItemsCached();
        setItems(allItems);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading items');
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [preloadAll]);
  
  // Load selected item when selectedItemId changes
  useEffect(() => {
    if (selectedItemId) {
      setIsLoading(true);
      try {
        const item = getItemByIdCached(selectedItemId);
        setSelectedItem(item || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading selected item');
        setSelectedItem(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSelectedItem(null);
    }
  }, [selectedItemId]);
  
  /**
   * Set the selected item by ID
   */
  const selectItem = useCallback((itemId: string): void => {
    setSelectedItemId(itemId);
  }, []);
  
  /**
   * Search items by a search term
   */
  const searchItemsByTerm = useCallback((searchTerm: string): Item[] => {
    try {
      return searchItems(searchTerm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error searching items');
      return [];
    }
  }, []);
  
  /**
   * Get an item name by ID (returns "Unknown Item" if not found)
   */
  const getItemName = useCallback((itemId: string): string => {
    try {
      const item = getItemByIdCached(itemId);
      return item ? item.name : 'Unknown Item';
    } catch (err) {
      return 'Unknown Item';
    }
  }, []);
  
  /**
   * Force refresh of items data
   */
  const refreshItems = useCallback((): void => {
    setIsLoading(true);
    try {
      const allItems = getItems(); // Use non-cached version to force refresh
      setItems(allItems);
      
      if (selectedItemId) {
        const item = getItemById(selectedItemId); // Use non-cached version
        setSelectedItem(item || null);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing items');
    } finally {
      setIsLoading(false);
    }
  }, [selectedItemId]);
  
  // Create a map of items by ID for easier lookup
  const itemsMap = useMemo(() => {
    const map: Record<string, Item> = {};
    items.forEach(item => {
      map[item.id] = item;
    });
    return map;
  }, [items]);
  
  return {
    items,
    selectedItem,
    isLoading,
    error,
    selectItem,
    searchItemsByTerm,
    refreshItems,
    getItemName
  };
}

export default useItemData; 