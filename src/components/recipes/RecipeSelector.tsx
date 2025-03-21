/**
 * RecipeSelector Component
 * 
 * Main component for selecting recipes for an item.
 * Provides a searchable dropdown with recipe options.
 */

import React, { useState, useMemo } from "react";
import { Recipe } from "../../types/core";
import RecipeDropdown from "./RecipeDropdown";
import RecipeDetails from "./RecipeDetails";
import useRecipeSelection from "../../hooks/useRecipeSelection";

export interface RecipeSelectorProps {
  /**
   * ID of the item to get recipes for
   */
  itemId: string;
  
  /**
   * Unique ID of the node to track selection state
   */
  nodeId: string;
  
  /**
   * Whether to show recipe details
   */
  showDetails?: boolean;
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  
  /**
   * Placeholder text when no recipe is selected
   */
  placeholder?: string;
  
  /**
   * Size of the component
   */
  size?: "small" | "medium" | "large";
  
  /**
   * Additional class name
   */
  className?: string;
  
  /**
   * Inline styles
   */
  style?: React.CSSProperties;
  
  /**
   * Callback fired when a recipe is selected
   */
  onRecipeSelect?: (recipeId: string) => void;
}

/**
 * RecipeSelector component for selecting recipes
 */
const RecipeSelector: React.FC<RecipeSelectorProps> = ({
  itemId,
  nodeId,
  showDetails = true,
  disabled = false,
  placeholder = "Select a Recipe",
  size = "medium",
  className = "",
  style,
  onRecipeSelect,
}) => {
  // Use recipe selection hook to manage recipes and selection state
  const {
    recipes,
    selectedRecipeId,
    selectedRecipe,
    isLoading,
    error,
    handleRecipeChange,
  } = useRecipeSelection({ itemId, nodeId });
  
  // Local search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter recipes based on search term
  const filteredRecipes = useMemo(() => {
    if (!searchTerm) return recipes;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return recipes.filter(recipe => 
      recipe.name?.toLowerCase().includes(lowerSearchTerm) || 
      recipe.description?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [recipes, searchTerm]);
  
  // Handle recipe selection
  const handleSelect = (recipeId: string) => {
    handleRecipeChange(recipeId);
    if (onRecipeSelect) {
      onRecipeSelect(recipeId);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };
  
  return (
    <div className={`recipe-selector ${className}`} style={style}>
      {/* Recipe dropdown */}
      <RecipeDropdown
        recipes={filteredRecipes}
        selectedRecipeId={selectedRecipeId}
        onSelect={handleSelect}
        onSearchChange={handleSearchChange}
        searchTerm={searchTerm}
        isLoading={isLoading}
        disabled={disabled}
        placeholder={placeholder}
        size={size}
      />
      
      {/* Recipe details (optional) */}
      {showDetails && selectedRecipe && (
        <RecipeDetails recipe={selectedRecipe} />
      )}
      
      {/* Error message */}
      {error && (
        <div className="recipe-selector__error" style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default React.memo(RecipeSelector); 