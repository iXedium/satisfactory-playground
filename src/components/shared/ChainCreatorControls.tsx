import React, { useState, useEffect } from 'react';
import { Item, Recipe } from '../../types';
import StyledSelect from './StyledSelect';
import Icon from '../Icon';
import { theme } from '../../styles/theme';
import { getRecipesForItem } from '../../data';

interface ChainCreatorControlsProps {
  items: Item[];
  selectedItem: string;
  onItemSelect: (itemId: string) => void;
  selectedRecipe: string;
  onRecipeSelect: (recipeId: string) => void;
  onCalculate: () => void;
  recentItems: string[];
  onRemoveRecentItem?: (itemId: string) => void;
  isCollapsed: boolean;
  // onToggleCollapse: () => void; // Remove unused prop
}

const ChainCreatorControls: React.FC<ChainCreatorControlsProps> = ({
  items,
  selectedItem,
  onItemSelect,
  selectedRecipe,
  onRecipeSelect,
  onCalculate,
  recentItems,
  onRemoveRecentItem,
  isCollapsed,
  // onToggleCollapse, // Remove unused prop from destructuring
}) => {
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [localSelectedItem, setLocalSelectedItem] = useState<string>(selectedItem);

  // Update filtered recipes when selected item changes
  useEffect(() => {
    if (selectedItem) {
      getRecipesForItem(selectedItem)
        .then(recipes => {
          setFilteredRecipes(recipes);
          // Select default recipe (match name or first)
          if (recipes.length > 0) {
            const selectedItemObj = items.find(i => i.id === selectedItem);
            const matchingRecipe = recipes.find(r => r.name === selectedItemObj?.name);
            onRecipeSelect(matchingRecipe ? matchingRecipe.id : recipes[0].id);
          }
        })
        .catch(console.error);
    } else {
      setFilteredRecipes([]);
      // Optionally clear recipe selection when item is cleared
      // onRecipeSelect(''); 
    }
  }, [selectedItem, onRecipeSelect, items]);

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    setLocalSelectedItem(itemId);
    onItemSelect(itemId);
  };
  
  // Styles - kept local for now
  const containerStyle: React.CSSProperties = {
      display: isCollapsed ? 'none' : 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center',
      padding: '4px 0',
      borderTop: `1px solid ${theme.colors.dropdown.border}`,
      marginTop: '2px',
  };
  
  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    backgroundColor: theme.colors.primary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
  };

  return (
    <div style={containerStyle}>
      {/* Item Selector */}
      <StyledSelect
        value={localSelectedItem}
        onChange={handleItemSelect}
        options={items}
        recentItems={recentItems}
        onRemoveRecentItem={onRemoveRecentItem}
        placeholder="Select Item"
        style={{ flex: 1, minWidth: '180px' }}
        renderOption={(option, isInDropdown) => (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '4px 8px',
            backgroundColor: isInDropdown && option.id === localSelectedItem ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
            borderRadius: theme.border.radius,
          }}>
            <Icon itemId={option.id} size="small" showWrapper={false} style={{ backgroundColor: theme.colors.dark }} />
            <span>{option.name}</span>
          </div>
        )}
      />
      
      {/* Recipe Selector */}
      <StyledSelect
        value={selectedRecipe}
        onChange={onRecipeSelect}
        options={filteredRecipes}
        placeholder={selectedItem ? "Select a Recipe" : "Select an item first"}
        style={{ 
          minWidth: '150px', 
          maxWidth: '250px', 
          flex: '1 1 auto',
          opacity: selectedItem ? 1 : 0.7
        }}
        disabled={!selectedItem || filteredRecipes.length === 0}
        renderOption={(option, isInDropdown) => (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '4px 8px',
              backgroundColor: isInDropdown && option.id === selectedRecipe ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
              borderRadius: theme.border.radius,
            }}
          >
            <span style={{ fontWeight: 'bold' }}>{option.name}</span>
          </div>
        )}
      />
      
      {/* Add Button */}
      <button 
        onClick={onCalculate}
        style={{
          ...buttonStyle,
          opacity: (selectedItem && selectedRecipe) ? 1 : 0.7,
        }}
        disabled={!selectedItem || !selectedRecipe}
        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonHover)}
        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.primary)}
      >
        Add
      </button>
    </div>
  );
};

export default ChainCreatorControls; 