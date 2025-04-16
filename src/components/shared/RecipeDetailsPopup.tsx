import React, { useState, useEffect } from 'react';
import { Recipe } from '../../types';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import Icon from '../Icon';
import { getItemById } from '../../data'; // Import getItemById

interface RecipeDetailsPopupProps {
  recipe: Recipe;
  primaryOutputItemId: string; // Add prop to know the main item
}

// Helper component to render an item line and fetch its name
interface ItemLineProps {
  itemId: string;
  amount: number;
  time: number;
  calculateRate: (amount: number, time: number) => number;
  isByproduct?: boolean; // Add optional prop for styling
}

const ItemLine: React.FC<ItemLineProps> = ({ itemId, amount, time, calculateRate, isByproduct = false }) => {
  const [itemName, setItemName] = useState<string>(itemId.replace(/item:/g, '').replace(/_/g, ' ')); // Default name

  useEffect(() => {
    let isMounted = true;
    getItemById(itemId).then(item => {
      if (isMounted && item) {
        setItemName(item.name);
      }
    });
    return () => { isMounted = false; }; // Cleanup on unmount
  }, [itemId]);

  const itemLineStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: sizes.spacing.small,
  };

  const rateStyle: React.CSSProperties = {
    marginLeft: 'auto', // Push rate to the right
    color: isByproduct ? theme.colors.nodeByproduct : theme.colors.textSecondary, // Use byproduct color for rate if applicable
  };
  
  const nameStyle: React.CSSProperties = {
    color: isByproduct ? theme.colors.nodeByproduct : theme.colors.text, // Use byproduct color for name if applicable
  };

  return (
    <div style={itemLineStyle}>
      <Icon
        itemId={itemId}
        size="tiny"
        wrapperPadding={2}
        showWrapper={false}
      />
      <span> </span>
      <span style={nameStyle}>{itemName}</span>
      <span style={rateStyle}>{calculateRate(amount, time).toFixed(2)}</span>
    </div>
  );
};

const RecipeDetailsPopup: React.FC<RecipeDetailsPopupProps> = ({ recipe, primaryOutputItemId }) => {
  const calculateRate = (amount: number, time: number): number => {
    if (!time || time <= 0) return 0;
    return (amount * 60) / time;
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker, // Use a slightly darker background
    border: `1px solid ${theme.colors.border}`, // Use theme border color
    borderRadius: theme.border.radius,
    padding: sizes.spacing.medium, // Keep medium padding
    display: 'flex',
    flexDirection: 'column',
    gap: sizes.spacing.small, // Reduce gap slightly
    color: theme.colors.text,
    fontSize: sizes.fontSize.small,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)', // Slightly stronger shadow
    minWidth: '180px', 
    zIndex: sizes.zIndex.tooltip, // This z-index is for the element *within* the portal
  };
  
  const titleStyle: React.CSSProperties = {
    margin: `0 0 ${sizes.spacing.small} 0`, // Add bottom margin
    paddingBottom: sizes.spacing.small, 
    textAlign: 'center', 
    borderBottom: `1px solid ${theme.colors.border}`,
    fontWeight: 'bold',
    fontSize: sizes.fontSize.standard, // Slightly larger title
    color: theme.colors.textLight, // Lighter title text
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: sizes.spacing.xsmall,
    fontSize: sizes.fontSize.small, // Ensure section titles are small
  };

  return (
    <div style={{ ...sectionStyle, pointerEvents: 'none' }}>
      <h4 style={titleStyle}>
        {recipe.name}
      </h4>
      
      {/* Inputs */}
      <div>
        <div style={sectionTitleStyle}>Inputs</div>
        {Object.entries(recipe.in).map(([itemId, amount]) => (
          <ItemLine 
            key={itemId}
            itemId={itemId} 
            amount={amount} 
            time={recipe.time} 
            calculateRate={calculateRate} 
          />
        ))}
      </div>

      {/* Outputs */}
      <div>
        <div style={sectionTitleStyle}>Outputs</div>
        {Object.entries(recipe.out).map(([itemId, amount]) => (
          <ItemLine 
            key={itemId}
            itemId={itemId} 
            amount={amount} 
            time={recipe.time} 
            calculateRate={calculateRate} 
            isByproduct={itemId !== primaryOutputItemId} // Determine if this output is a byproduct
          />
        ))}
      </div>
    </div>
  );
};

export default RecipeDetailsPopup; 