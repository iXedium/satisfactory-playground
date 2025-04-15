import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import Icon from '../Icon';
import { Item, Recipe } from '../../types';
import { IconSize } from '../Icon';
import StyledSelect from './StyledSelect';

interface ItemDetailsProps {
  item: Item;
  itemId: string;
  amount: number;
  size?: IconSize;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  onIconClick?: () => void;
  nominalRate?: number;
  isByproduct?: boolean;
  isImport?: boolean;
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  getItemColor?: () => string;
}

const ItemDetails: React.FC<ItemDetailsProps> = ({
  item,
  itemId,
  amount,
  size = 'large',
  recipes = [],
  selectedRecipeId,
  onRecipeChange,
  onIconClick,
  nominalRate = 0,
  isByproduct = false,
  isImport = false,
  containerStyle,
  contentStyle,
  getItemColor = () => theme.colors.primary,
}) => {
  // Log received amount for byproducts
  if (isByproduct) {
    console.log(`[BYPRODUCT DEBUG] ItemDetails Render: Received amount for ${item?.name} - Amount=${amount}`);
  }
  
  // Section container styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.border.radius,
    border: `1px solid ${theme.colors.dropdown.border}`,
    padding: `${sizes.spacing.medium} ${sizes.spacing.small}`,
    display: "flex",
    alignItems: "center",
    height: "100%",
    borderLeft: `4px solid ${getItemColor()}`,
    flex: 2,
    minWidth: "200px",
    position: "relative",
    zIndex: sizes.zIndex.base,
    overflow: "hidden",
    ...containerStyle
  };

  return (
    <div
      style={sectionStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Item icon */}
      <div
        style={{
          cursor: onIconClick ? "pointer" : "default",
          marginRight: sizes.spacing.large,
          alignSelf: "flex-start",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onIconClick) onIconClick();
        }}
      >
        <Icon itemId={itemId} size={size} />
      </div>

      {/* Item info and recipe */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          height: "100%",
          position: "relative",
          zIndex: sizes.zIndex.base,
          gap: sizes.spacing.large,
          ...contentStyle
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Item name and actual amount */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            color: theme.colors.text,
            fontSize: sizes.fontSize.large,
          }}
        >
          <span>{item.name}</span>
          {(console.log(`[BYPRODUCT DEBUG] ItemDetails Render: Rendering amount for ${item.name} (Byproduct: ${isByproduct}) - Amount=${amount}`), null)}
          <span style={{
            fontSize: sizes.fontSize.standard,
            opacity: 1,
            color: isByproduct ? theme.colors.nodeByproduct : theme.colors.text
          }}>
            {amount.toFixed(2)}
          </span>
          {nominalRate > 0 && !isByproduct && !isImport && (
            <span style={{
              fontSize: sizes.fontSize.standard,
              opacity: 0.6,
              marginLeft: sizes.spacing.small
            }}>
              ({nominalRate.toFixed(2)})
            </span>
          )}
        </div>

        {/* Recipe selector - aligned to bottom */}
        <div
          style={{ 
            marginTop: "auto", 
            position: "relative", 
            zIndex: sizes.zIndex.controls 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {recipes && recipes.length > 0 && onRecipeChange && !isByproduct && !isImport && (
            <StyledSelect
              value={selectedRecipeId || ""}
              onChange={onRecipeChange}
              options={recipes}
              variant="compact"
              style={{ width: "100%" }}
              renderOption={(option, isInDropdown) => (
                <div 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: sizes.spacing.large,
                    padding: `${sizes.spacing.small} ${sizes.spacing.large}`,
                    backgroundColor: isInDropdown && option.id === selectedRecipeId 
                      ? 'rgba(255, 122, 0, 0.1)' 
                      : 'transparent',
                    borderRadius: theme.border.radius,
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{option.name}</span>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemDetails; 