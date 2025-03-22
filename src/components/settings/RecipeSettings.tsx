/**
 * RecipeSettings Component
 * 
 * Component for managing default recipe preferences.
 */

import React, { useState, useEffect } from "react";
import { Select, Button, Input, SelectOption } from "../../components/common";
import { theme } from "../../styles/theme";
import useSettings from "../../hooks/useSettings";
import { db } from "../../data/dexieDB";
import { Item, Recipe } from "../../types/core";

export interface RecipeSettingsProps {}

// Extended SelectOption with icon
interface ItemSelectOption extends SelectOption {
  icon?: string;
}

// Extended SelectOption with description
interface RecipeSelectOption extends SelectOption {
  description?: string;
}

/**
 * Component for default recipe settings
 */
const RecipeSettings: React.FC<RecipeSettingsProps> = () => {
  // Get settings from the hook
  const { 
    defaultRecipes,
    updateDefaultRecipeSetting
  } = useSettings();
  
  // Component state
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Load items on component mount
  useEffect(() => {
    const loadItems = async () => {
      const loadedItems = await db.items.where("category").equals("components").toArray();
      setItems(loadedItems);
    };
    
    loadItems();
  }, []);
  
  // Load recipes when item is selected
  useEffect(() => {
    const loadRecipes = async () => {
      if (!selectedItem) {
        setAvailableRecipes([]);
        return;
      }
      
      try {
        // Find recipes where the item is in the "out" field
        const recipes = await db.recipes.filter(recipe => {
          return recipe.out && Object.keys(recipe.out).includes(selectedItem);
        }).toArray();
        
        setAvailableRecipes(recipes);
      } catch (error) {
        console.error(`Error finding recipes for ${selectedItem}:`, error);
        setAvailableRecipes([]);
      }
    };
    
    loadRecipes();
  }, [selectedItem]);
  
  // Handle item selection
  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedItem(e.target.value);
  };
  
  // Handle recipe selection
  const handleRecipeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedItem) {
      updateDefaultRecipeSetting(selectedItem, e.target.value);
    }
  };
  
  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Filter items by search term
  const filteredItems = searchTerm 
    ? items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;
  
  // Format items for the select component
  const itemOptions: ItemSelectOption[] = filteredItems.map(item => ({
    value: item.id,
    label: item.name,
    icon: item.icon
  }));
  
  // Format recipes for the select component
  const recipeOptions: RecipeSelectOption[] = availableRecipes.map(recipe => ({
    value: recipe.id,
    label: recipe.name || 'Unnamed Recipe',
    description: recipe.description
  }));
  
  // Get current default recipe for the selected item
  const currentDefaultRecipe = selectedItem ? defaultRecipes[selectedItem] || "" : "";
  
  // Section style
  const sectionStyle: React.CSSProperties = {
    marginBottom: "24px"
  };
  
  return (
    <div>
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          Default Recipes
        </h3>
        
        <p style={{ 
          marginBottom: "16px",
          color: theme.colors.textSecondary,
          fontSize: "14px"
        }}>
          Set default recipes for items with multiple production methods. These recipes will be used automatically when adding new items.
        </p>
        
        {/* Search input */}
        <div style={{ marginBottom: "16px" }}>
          <Input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={handleSearchChange}
            fullWidth
          />
        </div>
        
        {/* Item selection */}
        <div style={{ 
          display: "flex", 
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: "1 1 300px" }}>
            <Select
              label="Item"
              value={selectedItem}
              onChange={handleItemSelect}
              options={itemOptions}
              placeholder="Select an item"
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
                        alt={option.label} 
                        style={{ 
                          width: "20px", 
                          height: "20px" 
                        }} 
                      />
                    )}
                    <span>{option.label}</span>
                  </div>
                );
              }}
            />
          </div>
          
          {/* Recipe selection */}
          <div style={{ flex: "1 1 300px" }}>
            <Select
              label="Default Recipe"
              value={currentDefaultRecipe}
              onChange={handleRecipeSelect}
              options={recipeOptions}
              placeholder="Select a default recipe"
              disabled={!selectedItem || availableRecipes.length === 0}
              fullWidth
              renderOption={(option: SelectOption) => {
                const recipeOption = option as RecipeSelectOption;
                return (
                  <div>
                    <div style={{ fontWeight: "bold" }}>{option.label}</div>
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
        
        {/* No recipes message */}
        {selectedItem && availableRecipes.length === 0 && (
          <div style={{ 
            padding: "12px",
            backgroundColor: theme.colors.backgroundAlt,
            borderRadius: theme.border.radius,
            color: theme.colors.textSecondary,
            fontSize: "14px",
            marginBottom: "16px"
          }}>
            No recipes available for this item.
          </div>
        )}
        
        {/* Default recipes list */}
        {Object.keys(defaultRecipes).length > 0 && (
          <div style={sectionStyle}>
            <h4 style={{ 
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "12px",
              color: theme.colors.textPrimary
            }}>
              Current Default Recipes
            </h4>
            
            <div style={{ 
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.border.radius,
              overflow: "hidden"
            }}>
              {Object.entries(defaultRecipes).map(([itemId, recipeId]) => {
                const item = items.find(i => i.id === itemId);
                const recipe = availableRecipes.find(r => r.id === recipeId) || 
                  { id: recipeId, name: "Unknown Recipe" };
                
                if (!item) return null;
                
                return (
                  <div key={itemId} style={{ 
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderBottom: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundAlt
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      gap: "8px" 
                    }}>
                      {item.icon && (
                        <img 
                          src={item.icon} 
                          alt={item.name} 
                          style={{ 
                            width: "20px", 
                            height: "20px" 
                          }} 
                        />
                      )}
                      <span>{item.name}</span>
                    </div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      gap: "8px" 
                    }}>
                      <span style={{ color: theme.colors.textSecondary }}>
                        {recipe.name}
                      </span>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedItem(itemId);
                        }}
                      >
                        Change
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          updateDefaultRecipeSetting(itemId, "");
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeSettings; 