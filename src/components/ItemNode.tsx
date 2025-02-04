import React, { useEffect, useState } from 'react';
import Icon, { IconSize } from './Icon';
import RecipeSelect from './RecipeSelect';
import { Recipe } from '../data/dexieDB';
import { theme } from '../styles/theme';
import { getItemById } from "../data/dbQueries";
import { iconStyles } from "../styles/iconStyles";

interface ItemNodeProps {
  itemId: string;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  size?: IconSize;
}

const ItemNode: React.FC<ItemNodeProps> = ({
  itemId,
  amount,
  isRoot = false,
  isByproduct = false,
  recipes,
  selectedRecipeId,
  onRecipeChange,
  size = "medium"
}) => {
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    getItemById(itemId).then(setItem);
  }, [itemId]);

  const getItemColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    return theme.colors.nodeDefault;
  };

  if (!item) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gridTemplateAreas: `
        "icon name amount"
        "icon content content"
      `,
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '4px',
      backgroundColor: theme.colors.nodeBg,
      minHeight: '64px', // Ensures consistent height for nodes
      alignItems: 'start'
    }}>
      {/* Icon section - spans 2 rows */}
      <div style={{ 
        gridArea: 'icon',
        display: 'flex',
        alignItems: 'center',
        color: getItemColor()
      }}>
        <Icon 
          itemId={itemId} 
          color={getItemColor()}
          size={size}
          wrapperPadding={0}
        />
      </div>

      {/* Item name section */}
      <div style={{ 
        gridArea: 'name',
        color: getItemColor(),
        fontSize: '1.1em',
        alignSelf: 'center'
      }}>
        {item.name}
      </div>

      {/* Amount section */}
      <div style={{ 
        gridArea: 'amount',
        color: getItemColor(),
        fontSize: '1.2em',
        fontWeight: 'bold',
        textAlign: 'right',
        alignSelf: 'center'
      }}>
        {amount !== undefined && `${amount.toFixed(2)}/min`}
      </div>

      {/* Content section - for recipe select and future additions */}
      <div style={{ 
        gridArea: 'content',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        {recipes && recipes.length > 0 && !isByproduct && (
          <RecipeSelect
            recipes={recipes}
            value={selectedRecipeId || ''}
            onChange={(recipeId) => onRecipeChange?.(recipeId) || null}
            placeholder="Select Recipe"
            style={{ 
              minWidth: '180px'
            }}
          />
        )}
        {/* Future content can be added here */}
      </div>
    </div>
  );
};

export default ItemNode;
