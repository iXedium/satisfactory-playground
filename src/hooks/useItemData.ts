/**
 * useItemData Hook
 * 
 * Custom hook for loading and managing item data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Item } from '../types/core';
import { db } from '../data/dexieDB';

// Cache item fetching with 5 minute TTL
const getItems = async (): Promise<Item[]> => await db.items.toArray();
const getItemById = async (id: string): Promise<Item | undefined> => await db.items.get(id);
const searchItems = async (term: string): Promise<Item[]> => {
  const lowerTerm = term.toLowerCase();
  const items = await db.items.toArray();
  return items.filter(item => 
    item.name.toLowerCase().includes(lowerTerm) || 
    item.id.toLowerCase().includes(lowerTerm)
  );
};

import { memoizeWithTTL } from '../utils/memoization';

// Cache item fetching with 5 minute TTL
const getItemsCached = async () => {
  try {
    const items = await db.items.toArray();
    return items;
  } catch (error) {
    console.error('Error fetching items:', error);
    return [];
  }
};

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
  searchItemsByTerm: (searchTerm: string) => Promise<Item[]>;
  refreshItems: () => void;
  getItemName: (itemId: string) => Promise<string>;
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
      getItemsCached()
        .then(allItems => {
          setItems(allItems);
          setError(null);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Error loading items');
          setItems([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [preloadAll]);
  
  // Load selected item when selectedItemId changes
  useEffect(() => {
    if (selectedItemId) {
      setIsLoading(true);
      getItemById(selectedItemId)
        .then(item => {
          setSelectedItem(item || null);
          setError(null);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Error loading selected item');
          setSelectedItem(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
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
  const searchItemsByTerm = useCallback(async (searchTerm: string): Promise<Item[]> => {
    try {
      return await searchItems(searchTerm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error searching items');
      return [];
    }
  }, []);
  
  /**
   * Get an item name by ID (returns "Unknown Item" if not found)
   */
  const getItemName = useCallback(async (itemId: string): Promise<string> => {
    try {
      const item = await getItemById(itemId);
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
    getItemsCached()
      .then((fetchedItems) => {
        setItems(fetchedItems);
        if (selectedItemId) {
          const item = fetchedItems.find(item => item.id === selectedItemId) || null;
          setSelectedItem(item);
        }
        setError(null);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Error refreshing items');
      })
      .finally(() => {
        setIsLoading(false);
      });
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