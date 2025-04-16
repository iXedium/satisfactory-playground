/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for portals
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import Icon from '../Icon';
import { Item, Recipe } from '../../types';
import { IconSize } from '../Icon';
import StyledSelect from './StyledSelect';
import RecipeDetailsPopup from './RecipeDetailsPopup'; // Import the new popup component

interface ItemDetailsProps {
  item: Item;
  itemId: string;
  amount: number;
  size?: IconSize;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  onIconClick?: () => void;
  nominalRate?: number;
  isByproduct?: boolean;
  isImport?: boolean;
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  getItemColor?: () => string;
}

const ItemDetails: React.FC<ItemDetailsProps> = ({
  item,
  itemId,
  amount,
  size = 'large',
  recipes = [],
  selectedRecipeId,
  onRecipeChange,
  onIconClick,
  nominalRate = 0,
  isByproduct = false,
  isImport = false,
  containerStyle,
  contentStyle,
  getItemColor = () => theme.colors.primary,
}) => {
  const [hoveredRecipe, setHoveredRecipe] = useState<Recipe | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const popupRef = useRef<HTMLDivElement>(null); // Ref for the popup itself
  const hoveredElementRef = useRef<HTMLDivElement | null>(null); // Ref for the element being hovered
  
  // Log received amount for byproducts
  if (isByproduct) {
    //console.log(`[BYPRODUCT DEBUG] ItemDetails Render: Received amount for ${item?.name} - Amount=${amount}`);
  }
  
  // Section container styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.border.radius,
    border: `1px solid ${theme.colors.dropdown.border}`,
    padding: `${sizes.spacing.medium} ${sizes.spacing.small}`,
    display: "flex",
    alignItems: "center",
    height: "100%",
    borderLeft: `4px solid ${getItemColor()}`,
    flex: 2,
    minWidth: "200px",
    position: "relative",
    zIndex: sizes.zIndex.base,
    overflow: "hidden",
    ...containerStyle
  };

  const handleMouseEnter = (event: MouseEvent<HTMLDivElement>, recipe: Recipe) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    hoveredElementRef.current = event.currentTarget; // Store the hovered element
    setHoveredRecipe(recipe);
    // Initially set position to null, let useEffect calculate it
    setPopupPosition(null); 
  };

  // Use useEffect to calculate position *after* hoveredRecipe is set, 
  // so we can measure the popup content if needed (though not strictly necessary here yet)
  useEffect(() => {
    if (hoveredRecipe && hoveredElementRef.current) {
      const targetElement = hoveredElementRef.current;
      const rect = targetElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Estimate popup dimensions (adjust if more accuracy needed after measuring popupRef.current)
      // These are rough estimates, might need tuning
      const estimatedPopupWidth = 200; 
      const estimatedPopupHeight = 150;

      let top = rect.bottom + window.scrollY + 5;
      let left = rect.left + window.scrollX + 5;

      // Check boundaries and adjust
      if (left + estimatedPopupWidth > viewportWidth) {
        // If too far right, position to the left of the element
        left = rect.left + window.scrollX - estimatedPopupWidth - 5;
      }
      if (top + estimatedPopupHeight > viewportHeight) {
        // If too far down, position above the element
        top = rect.top + window.scrollY - estimatedPopupHeight - 5;
      }
      
      // Ensure it doesn't go off-screen left or top either (less common)
      if (left < 0) left = 5;
      if (top < 0) top = 5;

      setPopupPosition({ top, left });
    }
  }, [hoveredRecipe]); // Rerun when hoveredRecipe changes

  const handleMouseLeave = () => {
    hoveredElementRef.current = null; // Clear the hovered element ref
    // Delay hiding the popup slightly
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredRecipe(null);
      setPopupPosition(null);
    }, 150); // 150ms delay - Keep delay for leaving the trigger element
  };

  return (
    <>
      {/* Main Component Structure */}
      <div
        style={sectionStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Item icon */}
        <div
          style={{
            cursor: onIconClick ? "pointer" : "default",
            marginRight: sizes.spacing.large,
            alignSelf: "flex-start",
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (onIconClick) onIconClick();
          }}
        >
          <Icon itemId={itemId} size={size} />
        </div>

        {/* Item info and recipe */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            height: "100%",
            position: "relative",
            zIndex: sizes.zIndex.base,
            gap: sizes.spacing.large,
            ...contentStyle
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Item name and actual amount */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
              color: theme.colors.text,
              fontSize: sizes.fontSize.large,
            }}
          >
            <span>{item.name}</span>
            {/* {(console.log(`[BYPRODUCT DEBUG] ItemDetails Render: Rendering amount for ${item.name} (Byproduct: ${isByproduct}) - Amount=${amount}`), null)} */}
            {nominalRate > 0 && !isByproduct && !isImport && (
              <span style={{
                fontSize: sizes.fontSize.standard,
                opacity: 0.6,
                marginLeft: sizes.spacing.small
              }}>
                ({nominalRate.toFixed(2)})
              </span>
            )}
          </div>

          {/* Recipe selector - aligned to bottom */}
          <div
            style={{ 
              marginTop: "auto", 
              position: "relative", 
              zIndex: sizes.zIndex.controls 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {recipes && recipes.length > 0 && onRecipeChange && !isByproduct && !isImport && (
              <StyledSelect
                value={selectedRecipeId || ""}
                onChange={onRecipeChange}
                options={recipes}
                variant="compact"
                style={{ width: "100%" }}
                renderOption={(option, isInDropdown) => (
                  <div 
                    key={option.id} // Add key for React lists
                    onMouseEnter={(e) => handleMouseEnter(e, option as Recipe)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: sizes.spacing.large,
                      padding: `${sizes.spacing.small} ${sizes.spacing.large}`,
                      backgroundColor: isInDropdown && option.id === selectedRecipeId 
                        ? 'rgba(255, 122, 0, 0.1)' 
                        : 'transparent',
                      borderRadius: theme.border.radius,
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>{option.name}</span>
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>
      {/* Portal for Recipe Details Popup */}
      {hoveredRecipe && popupPosition && ReactDOM.createPortal(
        <div 
          ref={popupRef}
          style={{ 
            position: 'absolute', 
            top: `${popupPosition.top}px`, 
            left: `${popupPosition.left}px`, 
            zIndex: 10000 // Set z-index higher than the dropdown's 9999
          }} 
        >
          <RecipeDetailsPopup recipe={hoveredRecipe} primaryOutputItemId={itemId} />
        </div>,
        document.body // Render popup in the document body
      )}
    </>
  );
};

export default ItemDetails; 