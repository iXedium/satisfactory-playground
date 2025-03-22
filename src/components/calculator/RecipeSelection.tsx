/**
 * RecipeSelection Component
 * 
 * Allows the user to select an item and recipe for calculations.
 */

import React, { useState, useEffect, ChangeEvent } from "react";
import { Select, Card, SelectOption } from "../../components/common";
import { db } from "../../data/dexieDB";
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

// Extended SelectOption with icon
interface ItemSelectOption extends SelectOption {
  icon?: string;
  name: string;
}

// Extended SelectOption with description
interface RecipeSelectOption extends SelectOption {
  description?: string;
  name: string;
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
    const loadItems = async () => {
      const loadedItems = await db.items.where("category").equals("components").toArray();
      setItems(loadedItems);
    };
    
    loadItems();
  }, []);
  
  // Format items for the Select component
  const itemOptions: ItemSelectOption[] = items.map(item => ({
    value: item.id,
    label: item.name,
    icon: item.icon,
    name: item.name,
  }));
  
  // Format recipes for the Select component
  const recipeOptions: RecipeSelectOption[] = availableRecipes.map(recipe => ({
    value: recipe.id,
    label: recipe.name || 'Unnamed Recipe',
    name: recipe.name || 'Unnamed Recipe',
    description: recipe.description,
  }));

  // Handle select changes
  const handleItemChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onItemSelect(e.target.value);
  };

  const handleRecipeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onRecipeSelect(e.target.value);
  };
  
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
            onChange={handleItemChange}
            options={itemOptions}
            placeholder="Select an item"
            disabled={isLoading}
            fullWidth
            renderOption={(option: SelectOption) => {
              const itemOption = option as ItemSelectOption;
              return (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center",
                  gap: "8px" 
                }}>
                  {itemOption.icon && (
                    <img 
                      src={itemOption.icon} 
                      alt={itemOption.name} 
                      style={{ 
                        width: "20px", 
                        height: "20px" 
                      }} 
                    />
                  )}
                  <span>{itemOption.name}</span>
                </div>
              );
            }}
          />
        </div>
        
        {/* Recipe selection */}
        <div style={{ flex: "1 1 300px" }}>
          <Select
            label="Recipe"
            value={selectedRecipeId}
            onChange={handleRecipeChange}
            options={recipeOptions}
            placeholder="Select a recipe"
            disabled={!selectedItemId || availableRecipes.length === 0 || isLoading}
            fullWidth
            renderOption={(option: SelectOption) => {
              const recipeOption = option as RecipeSelectOption;
              return (
                <div>
                  <div style={{ fontWeight: "bold" }}>{recipeOption.name}</div>
                  {recipeOption.description && (
                    <div style={{ 
                      fontSize: "12px",
                      color: theme.colors.textSecondary 
                    }}>
                      {recipeOption.description}
                    </div>
                  )}
                </div>
              );
            }}
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