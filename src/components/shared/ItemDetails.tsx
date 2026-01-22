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
import { ViewDensity } from '../../features/factory-planner/hooks/usePlannerDisplayOptions'; // Import ViewDensity

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
  importSourceRecipeName?: string; // Recipe name of the source node for imports
  getItemColor?: () => string;
  viewDensity?: ViewDensity; // ADD viewDensity prop (optional for now)
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
  importSourceRecipeName,
  getItemColor = () => theme.colors.primary,
  viewDensity = 'relaxed', // Default to relaxed if not provided
}) => {
  const [hoveredRecipe, setHoveredRecipe] = useState<Recipe | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const popupRef = useRef<HTMLDivElement>(null); // Ref for the popup itself
  const hoveredElementRef = useRef<HTMLDivElement | null>(null); // Ref for the element being hovered
  
  // Log received amount for byproducts
  // if (isByproduct) {
    //
  // }
  
  const isCompact = viewDensity === 'compact'; // Helper boolean

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
    
    // Remove timeout for immediate hide
    // hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredRecipe(null);
      setPopupPosition(null);
    // }, 150); 
  };

  // Remove useEffect for timeout cleanup
  /*
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);
  */

  // Helper to format the rate
  const formatRate = (rate: number, id: string): string => {
    // Reverted: Treat power like any other item for now
    // if (id === 'power') {
    //   return `${(rate / 1000).toFixed(2)} GW`; // Convert MW to GW
    // }
    return `${rate.toFixed(2)}`; // Default formatting (likely implies /min)
  };

  return (
    <>
      {/* Main Component Structure */}
      <div
        className="item-details"
        style={{ 
          '--item-color': getItemColor(),
          cursor: onIconClick ? 'pointer' : undefined 
        } as React.CSSProperties}
        onClick={(e) => {
          // Only stop propagation if there's no icon click handler
          // For imports, we want the click to trigger scrolling
          if (onIconClick) {
            e.stopPropagation();
            onIconClick();
          } else {
            e.stopPropagation();
          }
        }}
      >
        {/* Item icon */}
        <div
          className="item-details-icon-container"
        >
          <Icon itemId={itemId} size={size} />
        </div>

        {/* Item info and recipe */}
        <div
          className="item-details-content"
        >
          {/* Item name and actual amount (rate conditionally rendered) */}
          <div
            className="item-details-name-rate"
          >
            <span>
              {isImport && importSourceRecipeName ? `[${importSourceRecipeName}] ` : ''}
              {item.name}
            </span>
            {/* Render rate here ONLY if relaxed */}
            {!isCompact && nominalRate > 0 && !isByproduct && !isImport && (
              <span className="item-details-nominal-rate">
                ({formatRate(nominalRate, itemId)})
              </span>
            )}
          </div>

          {/* Recipe selector - always rendered after name */}
          <div
            className="recipe-selector-container"
            onClick={(e) => e.stopPropagation()}
          >
            {recipes && recipes.length > 0 && onRecipeChange && !isByproduct && !isImport && (
              <StyledSelect
                value={selectedRecipeId || ""}
                onChange={onRecipeChange}
                options={recipes}
                variant="compact"
                renderOption={(option, isInDropdown) => (
                  <div 
                    key={option.id}
                    onMouseEnter={(e) => handleMouseEnter(e, option as Recipe)}
                    onMouseLeave={handleMouseLeave}
                    className={`recipe-option ${isInDropdown && option.id === selectedRecipeId ? 'selected' : ''}`}
                  >
                    <span style={{ fontWeight: 'bold' }}>{option.name}</span>
                  </div>
                )}
              />
            )}
          </div>

          {/* Render rate here ONLY if compact */}
          {isCompact && nominalRate > 0 && !isByproduct && !isImport && (
            <span className="item-details-nominal-rate">
              ({formatRate(nominalRate, itemId)})
            </span>
          )}

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
          // Remove mouse enter/leave from popup itself (wasn't there, but good practice)
        >
          <RecipeDetailsPopup recipe={hoveredRecipe} primaryOutputItemId={itemId} />
        </div>,
        document.body // Render popup in the document body
      )}
    </>
  );
};

export default ItemDetails; 