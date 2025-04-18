import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { getComponents } from '../../../data';
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

export const usePlannerItemSelection = (): PlannerItemSelectionState => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [isAddItemCollapsed, setIsAddItemCollapsed] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Load initial items list
  useEffect(() => {
    getComponents().then(loadedItems => {
      if (loadedItems) {
        setItems(loadedItems);
      }
    });
  }, []);

  // Load/Save recent items
  useEffect(() => {
    try {
      const savedRecentItems = localStorage.getItem('savedRecentItems');
      if (savedRecentItems) {
        setRecentItems(JSON.parse(savedRecentItems));
      }
    } catch (error) {
      console.error("Error loading saved recent items:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('savedRecentItems', JSON.stringify(recentItems));
    } catch (error) {
      console.error("Error saving recent items:", error);
      localStorage.removeItem('savedRecentItems');
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

  // Function to clear related localStorage items
  const clearStorage = useCallback(() => {
    localStorage.removeItem('plannerSelectedItem');
    localStorage.removeItem('plannerSelectedRecipe');
    localStorage.removeItem('plannerRecentItems');
    // Reset state if needed
    setSelectedItem('');
    setSelectedRecipe('');
    setRecentItems([]);
  }, []);

  const removeRecentItem = useCallback((itemIdToRemove: string) => {
    setRecentItems(prevItems => {
      const newItems = prevItems.filter(id => id !== itemIdToRemove);
      try {
        localStorage.setItem('plannerRecentItems', JSON.stringify(newItems));
      } catch (error) {
        console.error("Error saving recent items after removal:", error);
        // Optionally revert state change? 
      }
      return newItems;
    });
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