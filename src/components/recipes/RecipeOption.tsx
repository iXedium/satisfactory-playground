/**
 * RecipeOption Component
 * 
 * Displays a single recipe option in the recipe dropdown.
 */

import React from "react";
import { Recipe } from "../../types/core";

export interface RecipeOptionProps {
  /**
   * Recipe to display
   */
  recipe: Recipe;
  
  /**
   * Whether this option is currently selected
   */
  isSelected: boolean;
  
  /**
   * Callback fired when this option is selected
   */
  onSelect: () => void;
}

/**
 * RecipeOption component for displaying a recipe in the dropdown
 */
const RecipeOption: React.FC<RecipeOptionProps> = ({
  recipe,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      className={`recipe-option ${isSelected ? 'recipe-option--selected' : ''}`}
      onClick={onSelect}
      style={{
        padding: '10px 12px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
        borderLeft: isSelected ? '3px solid #0078d4' : '3px solid transparent',
        transition: 'background-color 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #eee',
      }}
    >
      <div className="recipe-option__content">
        {/* Recipe name */}
        <div 
          className="recipe-option__name"
          style={{
            fontWeight: isSelected ? 'bold' : 'normal',
            marginBottom: '2px',
          }}
        >
          {recipe.name || 'Unnamed Recipe'}
        </div>
        
        {/* Recipe description (if available) */}
        {recipe.description && (
          <div 
            className="recipe-option__description"
            style={{
              fontSize: '12px',
              color: '#666',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '250px',
            }}
          >
            {recipe.description}
          </div>
        )}
      </div>
      
      {/* Recipe efficiency (if available) */}
      {recipe.efficiency && (
        <div 
          className="recipe-option__efficiency"
          style={{
            fontSize: '12px',
            backgroundColor: '#f0f0f0',
            padding: '2px 6px',
            borderRadius: '10px',
            color: '#555',
          }}
        >
          {`${Math.round(recipe.efficiency * 100)}%`}
        </div>
      )}
    </div>
  );
};

export default React.memo(RecipeOption); 