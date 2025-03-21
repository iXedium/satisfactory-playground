/**
 * useRecipeSelection Hook
 * 
 * Custom hook for managing recipe selections and related operations.
 * Provides a consistent interface for components to handle recipe changes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Recipe } from '../types/core';
import { getRecipesForItem, getRecipeById } from '../data/dbQueries';
import { setRecipeSelection } from '../features/recipeSelectionsSlice';
import { memoize } from '../services/cache/cacheService';

// Memoize database queries for better performance
const memoizedGetRecipes = memoize(
  async (id: string) => getRecipesForItem(id),
  (id) => `recipes-${id}`
);

const memoizedGetRecipe = memoize(
  async (id: string) => getRecipeById(id),
  (id) => `recipe-${id}`
);

interface UseRecipeSelectionProps {
  itemId: string;
  nodeId: string;
}

interface UseRecipeSelectionResult {
  recipes: Recipe[];
  selectedRecipeId: string | null;
  selectedRecipe: Recipe | null;
  isLoading: boolean;
  error: string | null;
  handleRecipeChange: (recipeId: string) => void;
}

/**
 * Hook for managing recipe selections
 */
export function useRecipeSelection({
  itemId,
  nodeId
}: UseRecipeSelectionProps): UseRecipeSelectionResult {
  const dispatch = useDispatch();
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load recipes for the item
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchRecipes = async () => {
      try {
        // Load recipes for the item
        const availableRecipes = await memoizedGetRecipes(itemId);
        
        if (isMounted) {
          setRecipes(availableRecipes || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading recipes:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    fetchRecipes();

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  // Set the selected recipe ID from global state
  useEffect(() => {
    const recipeId = recipeSelections[nodeId] || null;
    setSelectedRecipeId(recipeId);
    
    // Load the selected recipe details
    if (recipeId) {
      let isMounted = true;
      
      const fetchRecipe = async () => {
        try {
          const recipe = await memoizedGetRecipe(recipeId);
          if (isMounted && recipe) {
            setSelectedRecipe(recipe);
          }
        } catch (err) {
          console.error('Error loading selected recipe:', err);
        }
      };
      
      fetchRecipe();
      
      return () => {
        isMounted = false;
      };
    } else {
      setSelectedRecipe(null);
    }
  }, [recipeSelections, nodeId]);

  /**
   * Handle changing the selected recipe
   */
  const handleRecipeChange = useCallback((recipeId: string) => {
    dispatch(setRecipeSelection({ nodeId, recipeId }));
  }, [dispatch, nodeId]);

  return {
    recipes,
    selectedRecipeId,
    selectedRecipe,
    isLoading,
    error,
    handleRecipeChange
  };
}

export default useRecipeSelection; 