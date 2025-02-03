import React from 'react';
import ItemWithIcon from './ItemWithIcon';
import RecipeSelect from './RecipeSelect';
import { Recipe } from '../data/dexieDB';
import { theme } from '../styles/theme';

interface ItemNodeProps {
  itemId: string;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  // Future props for production metrics:
  // machineCount?: number;
  // overclock?: number;
  // excessProduction?: number;
}

const ItemNode: React.FC<ItemNodeProps> = ({
  itemId,
  amount,
  isRoot = false,
  isByproduct = false,
  recipes,
  selectedRecipeId,
  onRecipeChange,
}) => {
  const getItemColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    return theme.colors.nodeDefault;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: theme.colors.nodeBg,
    }}>
      <ItemWithIcon 
        itemId={itemId}
        amount={amount}
        color={getItemColor()}
      />
      
      {recipes && recipes.length > 0 && !isByproduct && (
        <RecipeSelect
          recipes={recipes}
          value={selectedRecipeId || ''}
          onChange={(recipeId) => onRecipeChange?.(recipeId) || null}
          placeholder="Select Recipe"
          style={{ 
            minWidth: '200px',
            marginLeft: 'auto'
          }}
        />
      )}
    </div>
  );
};

export default ItemNode;
