/**
 * RecipeSelection Component
 * 
 * Allows the user to select an item and recipe for calculations.
 */

import React, { useState, useEffect } from "react";
import { Select, Card } from "../../components/common";
import { getComponents } from "../../data/dbQueries";
import { Recipe, Item } from "../../types/core";
import { theme } from "../../styles/theme";

export interface RecipeSelectionProps {
  /**
   * Currently selected item ID
   */
  selectedItemId: string;
  
  /**
   * Currently selected recipe ID
   */
  selectedRecipeId: string;
  
  /**
   * Array of available recipes for the selected item
   */
  availableRecipes: Recipe[];
  
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Callback when an item is selected
   */
  onItemSelect: (itemId: string) => void;
  
  /**
   * Callback when a recipe is selected
   */
  onRecipeSelect: (recipeId: string) => void;
}

/**
 * RecipeSelection component for selecting items and recipes
 */
const RecipeSelection: React.FC<RecipeSelectionProps> = ({
  selectedItemId,
  selectedRecipeId,
  availableRecipes,
  isLoading,
  onItemSelect,
  onRecipeSelect,
}) => {
  const [items, setItems] = useState<Item[]>([]);
  
  // Load all items on component mount
  useEffect(() => {
    getComponents().then(loadedItems => {
      if (loadedItems) {
        setItems(loadedItems);
      }
    });
  }, []);
  
  // Format items for the Select component
  const itemOptions = items.map(item => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
  }));
  
  // Format recipes for the Select component
  const recipeOptions = availableRecipes.map(recipe => ({
    id: recipe.id,
    name: recipe.name || 'Unnamed Recipe',
    description: recipe.description,
  }));
  
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      gap: "16px" 
    }}>
      <div style={{ 
        display: "flex", 
        gap: "16px",
        flexWrap: "wrap" 
      }}>
        {/* Item selection */}
        <div style={{ flex: "1 1 300px" }}>
          <Select
            label="Item"
            value={selectedItemId}
            onChange={onItemSelect}
            options={itemOptions}
            placeholder="Select an item"
            isLoading={isLoading}
            fullWidth
            renderOption={(option) => (
              <div style={{ 
                display: "flex", 
                alignItems: "center",
                gap: "8px" 
              }}>
                {option.icon && (
                  <img 
                    src={option.icon} 
                    alt={option.name} 
                    style={{ 
                      width: "20px", 
                      height: "20px" 
                    }} 
                  />
                )}
                <span>{option.name}</span>
              </div>
            )}
          />
        </div>
        
        {/* Recipe selection */}
        <div style={{ flex: "1 1 300px" }}>
          <Select
            label="Recipe"
            value={selectedRecipeId}
            onChange={onRecipeSelect}
            options={recipeOptions}
            placeholder="Select a recipe"
            isLoading={isLoading}
            disabled={!selectedItemId || availableRecipes.length === 0}
            fullWidth
            renderOption={(option) => (
              <div>
                <div style={{ fontWeight: "bold" }}>{option.name}</div>
                {option.description && (
                  <div style={{ 
                    fontSize: "12px",
                    color: theme.colors.textSecondary 
                  }}>
                    {option.description}
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </div>
      
      {/* No recipes available message */}
      {selectedItemId && !isLoading && availableRecipes.length === 0 && (
        <div style={{ 
          color: theme.colors.textSecondary,
          padding: "8px",
          backgroundColor: theme.colors.backgroundAlt,
          borderRadius: theme.border.radius,
          fontSize: "14px",
        }}>
          No recipes available for this item.
        </div>
      )}
    </div>
  );
};

export default React.memo(RecipeSelection); 