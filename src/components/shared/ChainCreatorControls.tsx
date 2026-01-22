import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import ReactDOM from 'react-dom';
import { Item, Recipe } from '../../types';
import { logger } from '../../utils/logger';
import StyledSelect from './StyledSelect';
import Icon from '../Icon';
import { theme } from '../../styles/theme';
import { getRecipesForItem } from '../../data';
import RecipeDetailsPopup from './RecipeDetailsPopup';

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
}) => {
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [localSelectedItem, setLocalSelectedItem] = useState<string>(selectedItem);
  
  const [hoveredRecipe, setHoveredRecipe] = useState<Recipe | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hoveredElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedItem) {
      getRecipesForItem(selectedItem)
        .then(recipes => {
          setFilteredRecipes(recipes);
          if (recipes.length > 0) {
            const selectedItemObj = items.find(i => i.id === selectedItem);
            const matchingRecipe = recipes.find(r => r.name === selectedItemObj?.name);
            onRecipeSelect(matchingRecipe ? matchingRecipe.id : recipes[0].id);
          }
        })
        .catch(err => logger.error('Error fetching recipes for item:', err));
    } else {
      setFilteredRecipes([]);
    }
  }, [selectedItem, onRecipeSelect, items]);

  const handleItemSelect = (itemId: string) => {
    setLocalSelectedItem(itemId);
    onItemSelect(itemId);
  };
  
  const handleRecipeMouseEnter = (event: MouseEvent<HTMLDivElement>, recipe: Recipe) => {
    hoveredElementRef.current = event.currentTarget;
    setHoveredRecipe(recipe);
    setPopupPosition(null);
  };

  useEffect(() => {
    if (hoveredRecipe && hoveredElementRef.current) {
      const targetElement = hoveredElementRef.current;
      const rect = targetElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const estimatedPopupWidth = 200;
      const estimatedPopupHeight = 150;
      let top = rect.bottom + window.scrollY + 5;
      let left = rect.left + window.scrollX + 5;
      if (left + estimatedPopupWidth > viewportWidth) {
        left = rect.left + window.scrollX - estimatedPopupWidth - 5;
      }
      if (top + estimatedPopupHeight > viewportHeight) {
        top = rect.top + window.scrollY - estimatedPopupHeight - 5;
      }
      if (left < 0) left = 5;
      if (top < 0) top = 5;
      setPopupPosition({ top, left });
    }
  }, [hoveredRecipe]);

  const handleRecipeMouseLeave = () => {
    hoveredElementRef.current = null;
    setHoveredRecipe(null);
    setPopupPosition(null);
  };

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
    <>
      <div style={containerStyle}>
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
              key={option.id}
              onMouseEnter={(e) => handleRecipeMouseEnter(e, option as Recipe)}
              onMouseLeave={handleRecipeMouseLeave}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '4px 8px',
                backgroundColor: isInDropdown && option.id === selectedRecipe ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
                borderRadius: theme.border.radius,
                width: '100%',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{option.name}</span>
            </div>
          )}
        />
        
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
      
      {hoveredRecipe && popupPosition && ReactDOM.createPortal(
        <div 
          ref={popupRef}
          style={{ 
            position: 'absolute', 
            top: `${popupPosition.top}px`, 
            left: `${popupPosition.left}px`, 
            zIndex: 10000 
          }} 
        >
          <RecipeDetailsPopup recipe={hoveredRecipe} primaryOutputItemId={localSelectedItem} /> 
        </div>,
        document.body
      )}
    </>
  );
};

export default ChainCreatorControls; 