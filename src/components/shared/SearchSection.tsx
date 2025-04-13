import React, { useEffect, useState } from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import StyledSelect from './StyledSelect';
import Icon from '../Icon';
import ItemSelect from '../ItemSelect';
import RecipeSelect from '../RecipeSelect';
import { Item, Recipe } from '../../types';
import { getRecipesForItem } from '../../data';

interface SearchSectionProps {
  items: Item[];
  selectedItem: string;
  onItemSelect: (item: string) => void;
  selectedRecipe: string;
  onRecipeSelect: (recipe: string) => void;
  onCalculate: () => void;
  isCollapsed: boolean;
  containerStyle?: React.CSSProperties;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  items,
  selectedItem,
  onItemSelect,
  selectedRecipe,
  onRecipeSelect,
  onCalculate,
  isCollapsed,
  containerStyle,
}) => {
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);

  // Load recipes when selected item changes
  useEffect(() => {
    if (selectedItem) {
      getRecipesForItem(selectedItem).then(recipes => {
        if (recipes) {
          setFilteredRecipes(recipes);
          // If there's only one recipe, select it automatically
          if (recipes.length === 1 && recipes[0].id) {
            onRecipeSelect(recipes[0].id);
          } else if (recipes.length > 0 && !recipes.find(r => r.id === selectedRecipe)) {
            // If the currently selected recipe is not among the options, clear it
            onRecipeSelect('');
          }
        } else {
          setFilteredRecipes([]);
          onRecipeSelect('');
        }
      });
    } else {
      setFilteredRecipes([]);
      onRecipeSelect('');
    }
  }, [selectedItem, onRecipeSelect, selectedRecipe]);

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme.colors.primary,
    border: 'none',
    color: '#fff',
    padding: `${sizes.spacing.small} ${sizes.spacing.medium}`,
    borderRadius: theme.border.radius,
    cursor: 'pointer',
    fontSize: sizes.fontSize.standard,
    height: '40px',
    minWidth: '80px',
    transition: 'background-color 0.2s',
  };

  if (isCollapsed) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: sizes.spacing.standard,
        alignItems: 'center',
        padding: `${sizes.spacing.small} 0`,
        borderTop: `1px solid ${theme.colors.dropdown.border}`,
        marginTop: sizes.spacing.xsmall,
        ...containerStyle
      }}
    >
      {/* Item Selector */}
      <StyledSelect
        value={selectedItem}
        onChange={onItemSelect}
        options={items}
        placeholder="Select an Item"
        style={{ 
          minWidth: '150px', 
          maxWidth: '250px', 
          flex: '1 1 auto'
        }}
        renderOption={(option, isInDropdown) => (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: sizes.spacing.standard,
            padding: `${sizes.spacing.small} ${sizes.spacing.standard}`,
            backgroundColor: isInDropdown && option.id === selectedItem ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
            borderRadius: theme.border.radius,
          }}>
            <Icon itemId={option.id} size="small" showWrapper={false} style={{ backgroundColor: theme.colors.dark }} />
            {option.name}
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
              gap: sizes.spacing.standard,
              padding: `${sizes.spacing.small} ${sizes.spacing.standard}`,
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

export default SearchSection; 