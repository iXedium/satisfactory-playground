import React, { useEffect, useState } from 'react';
import Icon, { IconSize } from './Icon';
import RecipeSelect from './RecipeSelect';
import { Recipe } from '../data/dexieDB';
import { theme } from '../styles/theme';
import { getItemById } from "../data/dbQueries";
import { iconStyles } from "../styles/iconStyles";

const numberInputStyles: React.CSSProperties = {
  width: '60px',
  padding: '2px 4px',
  fontSize: '0.9em',
  textAlign: 'right',
  backgroundColor: 'transparent',
  border: '1px solid currentColor',
  borderRadius: '2px',
  color: 'inherit',
  WebkitAppearance: 'none',
  MozAppearance: 'textfield'
};

interface ItemNodeProps {
  itemId: string;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  size?: IconSize;
  excess?: number;  // Keep as optional in interface
  onExcessChange?: (excess: number) => void;
  style?: React.CSSProperties;  // Add style prop
}

const ItemNode: React.FC<ItemNodeProps> = ({
  itemId,
  amount,
  isRoot = false,
  isByproduct = false,
  recipes,
  selectedRecipeId,
  onRecipeChange,
  size = "large",
  excess = 0,  // Set default to 0 here
  onExcessChange,
  style
}) => {
  const [item, setItem] = useState<any>(null);
  const [localExcess, setLocalExcess] = useState(excess); // Add local state

  // Update local state when prop changes
  useEffect(() => {
    setLocalExcess(excess);
  }, [excess]);

  useEffect(() => {
    getItemById(itemId).then(setItem);
  }, [itemId]);

  const getItemColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    return theme.colors.nodeDefault;
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setLocalExcess(e.target.value === '' ? 0 : Number(e.target.value));
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onExcessChange?.(localExcess);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.target.select();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      e.currentTarget.blur(); // Optional: blur the input on Enter
    }
  };

  if (!item) return null;

  return (
    <>
      <style>
        {`
          input[type="number"].no-spinners::-webkit-inner-spin-button,
          input[type="number"].no-spinners::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"].no-spinners {
            -moz-appearance: textfield;
          }
        `}
      </style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        gridTemplateAreas: `
          "icon name amount"
          "icon content amount-excess"
        `,
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '4px',
        minHeight: '64px', // Ensures consistent height for nodes
        alignItems: 'start',
        position: 'relative', // Add this to establish new stacking context
        overflow: 'visible',   // Ensure dropdowns can overflow
        ...style  // Add style prop
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

        {/* Combined amount and excess section */}
        <div style={{ 
          gridArea: 'amount',
          color: getItemColor(),
          fontSize: '1.2em',
          fontWeight: 'bold',
          textAlign: 'right',
          alignSelf: 'center'
        }}>
          {amount !== undefined && amount.toFixed(2)}
        </div>

        <div style={{ 
          gridArea: 'amount-excess',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <input
            type="number"
            className="no-spinners"
            value={localExcess ?? 0}  // Fallback to 0 if somehow undefined
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onClick={handleInputClick}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyPress}  // Add keypress handler
            style={numberInputStyles}
            placeholder="Excess"
          />
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
    </>
  );
};

export default ItemNode;
