import React, { useEffect, useState } from 'react';
import Icon, { IconSize } from './Icon';
import { Recipe } from '../data/dexieDB';
import { theme } from '../styles/theme';
import { getItemById } from "../data/dbQueries";
import { iconStyles } from "../styles/iconStyles";
import StyledSelect from './shared/StyledSelect';
import StyledInput from './shared/StyledInput';

interface ItemNodeProps {
  itemId: string;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  size?: IconSize;
  excess?: number;
  onExcessChange?: (excess: number) => void;
  style?: React.CSSProperties;
  index?: number; // Add index prop for alternating backgrounds
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
  excess = 0,
  onExcessChange,
  style,
  index = 0
}) => {
  const [item, setItem] = useState<any>(null);
  const [localExcess, setLocalExcess] = useState(excess);

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

  const handleExcessChange = (value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setLocalExcess(numValue);
    onExcessChange?.(numValue);
  };

  if (!item) return null;

  const baseStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gridTemplateAreas: `
      "icon content rates"
    `,
    gap: '12px',
    padding: '8px 12px',
    color: getItemColor(),
    backgroundColor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: theme.border.radius,
    ...style
  };

  return (
    <div style={baseStyles}>
      <div style={{ gridArea: 'icon' }}>
        <Icon itemId={itemId} size={size} style={{ backgroundColor: theme.colors.iconBg }} />
      </div>

      <div style={{ 
        gridArea: 'content',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <span>{item.name}</span>
        {recipes && recipes.length > 0 && onRecipeChange && (
          <StyledSelect
            value={selectedRecipeId || ''}
            onChange={onRecipeChange}
            options={recipes}
            variant="compact"
            style={{ width: '200px' }}
          />
        )}
      </div>

      <div style={{ 
        gridArea: 'rates',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: 'flex-end'
      }}>
        <span>{amount.toFixed(2)}/min</span>
        {onExcessChange && (
          <StyledInput
            type="number"
            value={localExcess}
            onChange={(e) => handleExcessChange(e.target.value)}
            variant="compact"
            style={{ width: '80px' }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
};

export default ItemNode;
