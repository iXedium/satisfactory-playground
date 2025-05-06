import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { getAllItems, getAllRecipes } from '../../../data';
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
    Promise.all([getAllItems(), getAllRecipes()]).then(([loadedItems, allRecipes]) => {
      if (loadedItems && allRecipes) {
        // console.log("[usePlannerItemSelection] All loaded items:", loadedItems);
        // const powerItemLoaded = loadedItems.find(item => item.id === 'power');
        // console.log("[usePlannerItemSelection] Is 'power' item loaded?", powerItemLoaded);

        const producibleItemIds = new Set<string>();
        allRecipes.forEach(recipe => {
          if (recipe.out) {
            Object.keys(recipe.out).forEach(itemId => producibleItemIds.add(itemId));
          }
        });
        // console.log("[usePlannerItemSelection] Producible item IDs:", producibleItemIds);
        // const powerItemIsProducible = producibleItemIds.has('power');
        // console.log("[usePlannerItemSelection] Is 'power' item producible?", powerItemIsProducible);

        const plannableCategories = ["parts", "components", "power"];
        const filteredItems = loadedItems.filter(item => 
          item.category && 
          plannableCategories.includes(item.category) &&
          producibleItemIds.has(item.id)
        );
        // console.log("[usePlannerItemSelection] Filtered items for selector:", filteredItems);
        // const powerItemInFinalList = filteredItems.find(item => item.id === 'power');
        // console.log("[usePlannerItemSelection] Is 'power' item in the final filtered list?", powerItemInFinalList);

        setItems(filteredItems);
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

  // Auto-save recent items to LAST SESSION localStorage (Only if array is not empty)
  useEffect(() => {
    try {
      if (recentItems.length > 0) { // Check if array is not empty
        localStorage.setItem(LS_RECENT_ITEMS, JSON.stringify(recentItems));
      } else {
        localStorage.removeItem(LS_RECENT_ITEMS); // Remove key if empty
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