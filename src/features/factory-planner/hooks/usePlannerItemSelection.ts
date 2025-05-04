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