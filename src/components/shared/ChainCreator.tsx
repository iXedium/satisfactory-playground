import React, { useState } from 'react';
import { Item, Recipe } from '../../types';
import ItemSelect from '../ItemSelect';
import RecipeSelect from '../RecipeSelect';
import { calculateDependencyTree } from '../../utils';
import { calculateAccumulatedFromTree } from '../../utils';

interface ChainCreatorProps {
  items: Item[];
  selectedItem: string;
  onItemSelect: (itemId: string) => void;
  selectedRecipe: string;
  onRecipeSelect: (recipeId: string) => void;
  onCalculate: () => Promise<void>;
  recipeSelections: Record<string, string>;
  excessMap: Record<string, number>;
  generateTreeId: (itemId: string) => string;
  setDependencies: (payload: any) => void;
}

const ChainCreator: React.FC<ChainCreatorProps> = ({
  items,
  selectedItem,
  onItemSelect,
  selectedRecipe,
  onRecipeSelect,
  onCalculate,
  recipeSelections,
  excessMap,
  generateTreeId,
  setDependencies,
}) => {
  // This is the implementation of the provided handleCalculate method,
  // now extracted into this component
  const handleCalculateChain = async () => {
    if (!selectedItem || !selectedRecipe) return;
    
    try {
      const treeId = generateTreeId(selectedItem);
      
      // Calculate the dependency tree with amount set to 0
      const tree = await calculateDependencyTree(
        selectedItem,
        0, // Set initial amount to 0 instead of itemCount
        selectedRecipe,
        recipeSelections,
        0,
        [],
        '',
        excessMap
      );
      
      if (!tree) {
        console.error("Failed to calculate dependency tree");
        return;
      }
      
      // Calculate accumulated values from the tree
      const accumulated = calculateAccumulatedFromTree(tree);
      
      // Dispatch action to add this tree to the dependencies
      setDependencies({ treeId, tree, accumulated });
    } catch (error) {
      console.error("Error calculating dependencies:", error);
    }
  };

  return (
    <div>
      {/* This component doesn't render its own UI, but exposes its 
          functionality to be used by parent components like CommandBar */}
    </div>
  );
};

export default ChainCreator; 