/**
 * RecipeSection Component
 * 
 * Displays recipe selection dropdown for an item node.
 */

import React from "react";
import { Recipe } from "../../../types/core";
import { RecipeSelector } from "../../../components/recipes";

export interface RecipeSectionProps {
  recipes: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  itemId: string;
  nodeId: string;
}

/**
 * RecipeSection component for recipe selection
 */
const RecipeSection: React.FC<RecipeSectionProps> = ({
  recipes,
  selectedRecipeId,
  onRecipeChange,
  itemId,
  nodeId,
}) => {
  // Handle recipe selection
  const handleRecipeChange = (recipeId: string) => {
    if (onRecipeChange) {
      onRecipeChange(recipeId);
    }
  };

  return (
    <RecipeSelector
      itemId={itemId}
      nodeId={nodeId}
      showDetails={true}
      disabled={false}
      placeholder="Select a recipe"
      size="small"
      onRecipeSelect={handleRecipeChange}
    />
  );
};

export default React.memo(RecipeSection); 