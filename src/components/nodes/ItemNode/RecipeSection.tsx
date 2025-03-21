/**
 * RecipeSection Component
 * 
 * Displays recipe selection dropdown for an item node.
 */

import React from "react";
import { Select } from "../../../components/common";
import { Recipe } from "../../../types/core";
import { theme } from "../../../styles/theme";
import Icon from "../../shared/Icon";

export interface RecipeSectionProps {
  recipes: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
}

/**
 * RecipeSection component for recipe selection
 */
const RecipeSection: React.FC<RecipeSectionProps> = ({
  recipes,
  selectedRecipeId,
  onRecipeChange,
}) => {
  // Convert recipes to select options with output item icons
  const recipeOptions = recipes.map(recipe => ({
    value: recipe.id,
    label: recipe.name || "Unknown Recipe",
  }));

  // Handle recipe selection
  const handleRecipeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onRecipeChange) {
      onRecipeChange(e.target.value);
    }
  };

  return (
    <div>
      <Select
        label="Recipe"
        options={recipeOptions}
        value={selectedRecipeId}
        onChange={handleRecipeChange}
        placeholder="Select a recipe"
        fullWidth
        size="small"
      />
      
      {/* Show recipe details when a recipe is selected */}
      {selectedRecipeId && (
        <div
          style={{
            fontSize: "12px",
            color: theme.colors.textSecondary,
            marginTop: "4px",
          }}
        >
          {recipes.find(r => r.id === selectedRecipeId)?.description || 
            "No recipe description available"}
        </div>
      )}
    </div>
  );
};

export default React.memo(RecipeSection); 