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
  size = "large"
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
      gridTemplateColumns: 'auto minmax(0, 1fr) auto', // prevent middle column from expanding too much
      gridTemplateAreas: `
        "icon name amount"
        "icon content content"
      `,
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '4px',
      backgroundColor: theme.colors.nodeBg,
      minHeight: '64px', // Ensures consistent height for nodes
      alignItems: 'start',
      position: 'relative', // Add this to establish new stacking context
      overflow: 'visible'   // Ensure dropdowns can overflow
    }}>
      {/* Icon section - modified styles for vertical centering */}
      <div style={{ 
        gridArea: 'icon',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',  // Make container fill grid area height
        color: getItemColor(),
        padding: '4px'         // Optional padding to prevent icon from touching edges
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

      {/* Content section - updated styles */}
      <div style={{ 
        gridArea: 'content',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        minWidth: 0,        // Prevent flex blowout
        position: 'relative' // For dropdown positioning
      }}>
        {recipes && recipes.length > 0 && !isByproduct && (
          <div style={{
            position: 'relative',
            minWidth: '180px',
            maxWidth: '100%'
          }}>
            <RecipeSelect
              recipes={recipes}
              value={selectedRecipeId || ''}
              onChange={(recipeId) => onRecipeChange?.(recipeId) || null}
              placeholder="Select Recipe"
              style={{ 
                width: '100%'
              }}
            />
          </div>
        )}
        {/* Future content can be added here */}
      </div>
    </div>
  );
};

export default ItemNode;
