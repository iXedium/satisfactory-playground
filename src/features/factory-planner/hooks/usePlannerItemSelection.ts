import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { getAllItems } from '../../../data';
import { Item } from '../../../types';

export interface PlannerItemSelectionState {
  items: Item[];
  selectedItem: string;
  setSelectedItem: Dispatch<SetStateAction<string>>;
  selectedRecipe: string;
  setSelectedRecipe: Dispatch<SetStateAction<string>>;
  isAddItemCollapsed: boolean;
  setIsAddItemCollapsed: Dispatch<SetStateAction<boolean>>;
  recentItems: string[];
  updateRecentItems: (itemId: string) => void;
  removeRecentItem: (itemId: string) => void;
  clearStorage: () => void;
}

// Define key
const LS_RECENT_ITEMS = 'lastSession_savedRecentItems';

export const usePlannerItemSelection = (): PlannerItemSelectionState => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [isAddItemCollapsed, setIsAddItemCollapsed] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Load initial items list
  useEffect(() => {
    getAllItems().then(loadedItems => {
      if (loadedItems) {
        setItems(loadedItems);
      }
    });
  }, []);

  // Load recent items from LAST SESSION localStorage
  useEffect(() => {
    try {
      const savedRecentItems = localStorage.getItem(LS_RECENT_ITEMS);
      if (savedRecentItems) {
        setRecentItems(JSON.parse(savedRecentItems));
      }
    } catch (error) {
      console.error("Error loading last session recent items:", error);
      localStorage.removeItem(LS_RECENT_ITEMS); // Clear potentially corrupt key
    }
  }, []); // Run only on mount

  // Auto-save recent items to LAST SESSION localStorage
  useEffect(() => {
    try {
      // Only save if there are items to prevent saving empty array unnecessarily
      if (recentItems.length > 0) { 
        localStorage.setItem(LS_RECENT_ITEMS, JSON.stringify(recentItems));
      } else {
        // If the list becomes empty, remove the key from storage
        localStorage.removeItem(LS_RECENT_ITEMS);
      }
    } catch (error) {
      console.error("Error saving last session recent items:", error);
    }
  }, [recentItems]);

  // Function to update recent items list
  const updateRecentItems = useCallback((itemId: string) => {
    setRecentItems(prev => {
      const filtered = prev.filter(id => id !== itemId);
      const updated = [itemId, ...filtered];
      return updated.slice(0, 10);
    });
  }, []);

  const removeRecentItem = useCallback((itemIdToRemove: string) => {
    setRecentItems(prevItems => {
      const newItems = prevItems.filter(id => id !== itemIdToRemove);
      return newItems;
    });
  }, []);

  const clearStorage = useCallback(() => {
    // Clear localStorage items this hook previously managed
    localStorage.removeItem('savedRecentItems');
    // Reset the local state
    setRecentItems([]);
    // Should probably clear selectedItem/selectedRecipe state too?
    setSelectedItem('');
    setSelectedRecipe('');
  }, []);

  return {
    items,
    selectedItem,
    setSelectedItem,
    selectedRecipe,
    setSelectedRecipe,
    isAddItemCollapsed,
    setIsAddItemCollapsed,
    recentItems,
    updateRecentItems,
    removeRecentItem,
    clearStorage,
  };
}; 