/**
 * RecipeDetails Component
 * 
 * Displays detailed information about a selected recipe.
 */

import React from "react";
import { Recipe } from "../../types/core";

export interface RecipeDetailsProps {
  /**
   * Recipe to display details for
   */
  recipe: Recipe;
  
  /**
   * Whether to show full details or compact view
   */
  compact?: boolean;
  
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * RecipeDetails component for displaying detailed information about a recipe
 */
const RecipeDetails: React.FC<RecipeDetailsProps> = ({
  recipe,
  compact = false,
  className = "",
}) => {
  // Determine if we have ingredients and products to display
  const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0;
  const hasProducts = recipe.products && recipe.products.length > 0;
  
  if (!recipe) {
    return null;
  }
  
  return (
    <div 
      className={`recipe-details ${compact ? 'recipe-details--compact' : ''} ${className}`}
      style={{
        marginTop: '10px',
        padding: compact ? '8px' : '12px',
        backgroundColor: '#f8f8f8',
        borderRadius: '4px',
        border: '1px solid #eee',
        fontSize: compact ? '12px' : '14px',
      }}
    >
      {/* Recipe header with name and efficiency */}
      {!compact && (
        <div className="recipe-details__header" style={{ marginBottom: '10px' }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
            {recipe.name || 'Recipe Details'}
          </h3>
          {recipe.description && (
            <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '13px' }}>
              {recipe.description}
            </p>
          )}
          {recipe.efficiency && (
            <div style={{ fontSize: '13px' }}>
              Efficiency: <strong>{Math.round(recipe.efficiency * 100)}%</strong>
            </div>
          )}
        </div>
      )}
      
      <div className="recipe-details__content" style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: '10px' }}>
        {/* Ingredients section */}
        {hasIngredients && (
          <div 
            className="recipe-details__ingredients" 
            style={{ 
              flex: compact ? '1' : 'auto',
            }}
          >
            <h4 style={{ margin: '0 0 5px 0', fontSize: compact ? '12px' : '14px' }}>
              Ingredients
            </h4>
            <ul style={{ 
              margin: '0', 
              padding: '0 0 0 20px',
              listStyle: 'disc',
            }}>
              {recipe.ingredients.map(ing => (
                <li key={ing.itemId} style={{ marginBottom: '3px' }}>
                  <span>{ing.itemName || ing.itemId}</span>
                  {ing.amount && (
                    <span style={{ color: '#666', marginLeft: '5px' }}>
                      ({ing.amount}/min)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Products section */}
        {hasProducts && (
          <div 
            className="recipe-details__products" 
            style={{ 
              flex: compact ? '1' : 'auto',
            }}
          >
            <h4 style={{ margin: '0 0 5px 0', fontSize: compact ? '12px' : '14px' }}>
              Products
            </h4>
            <ul style={{ 
              margin: '0', 
              padding: '0 0 0 20px',
              listStyle: 'disc',
            }}>
              {recipe.products.map(prod => (
                <li key={prod.itemId} style={{ marginBottom: '3px' }}>
                  <span>{prod.itemName || prod.itemId}</span>
                  {prod.amount && (
                    <span style={{ color: '#666', marginLeft: '5px' }}>
                      ({prod.amount}/min)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Machine information */}
      {recipe.machine && !compact && (
        <div className="recipe-details__machine" style={{ marginTop: '10px', fontSize: '13px' }}>
          <strong>Machine:</strong> {recipe.machine}
          {recipe.manufacturingDuration && (
            <span style={{ marginLeft: '10px' }}>
              <strong>Duration:</strong> {recipe.manufacturingDuration}s
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(RecipeDetails); 