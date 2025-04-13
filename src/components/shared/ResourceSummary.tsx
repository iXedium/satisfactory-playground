import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import { Item } from '../../types';
import Icon from '../Icon';
import { getItemById } from '../../data';

export interface GroupedItem {
  itemId: string;
  amount: number;
  isByproduct: boolean;
  name?: string;
  depth: number;
  normalizedMachineCount: number;
  isImport: boolean;
}

interface ResourceSummaryProps {
  item: GroupedItem;
  index: number;
  onConsumerClick?: (nodeId: string) => void;
  nodeRef?: React.RefObject<HTMLDivElement> | ((instance: HTMLDivElement | null) => void);
  containerStyle?: React.CSSProperties;
}

const ResourceSummary: React.FC<ResourceSummaryProps> = ({
  item,
  index,
  onConsumerClick,
  nodeRef,
  containerStyle
}) => {
  const [itemDetails, setItemDetails] = useState<Item | null>(null);

  // Fetch item data
  useEffect(() => {
    getItemById(item.itemId).then((fetchedItem) => setItemDetails(fetchedItem || null));
  }, [item.itemId]);

  // Determine if this is a raw material (no associated recipe)
  const isRawMaterial = item.isImport;

  // Styling based on item type
  const getItemStyle = () => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderRadius: theme.border.radius,
      marginBottom: '4px',
      backgroundColor: index % 2 === 0 ? theme.colors.darker : theme.colors.dark,
      border: `1px solid ${theme.colors.dropdown.border}`,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    };

    // Apply styling based on item type
    if (item.isByproduct) {
      return {
        ...baseStyle,
        borderLeft: `4px solid ${theme.colors.nodeByproduct}`,
      };
    } else if (isRawMaterial) {
      return {
        ...baseStyle,
        borderLeft: `4px solid ${theme.colors.nodeImport}`,
      };
    }

    return baseStyle;
  };

  // Apply proper styling to amount display
  const getAmountStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontWeight: 'bold',
      fontSize: '14px',
    };

    if (item.isByproduct) {
      return {
        ...baseStyle,
        color: theme.colors.nodeByproduct,
      };
    } else if (isRawMaterial) {
      return {
        ...baseStyle,
        color: theme.colors.nodeImport,
      };
    }

    return {
      ...baseStyle,
      color: theme.colors.primary,
    };
  };

  if (!itemDetails) return null;

  return (
    <div 
      ref={nodeRef as React.RefObject<HTMLDivElement>}
      style={{
        ...getItemStyle(),
        ...containerStyle
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Icon 
          itemId={item.itemId} 
          size="medium" 
          showWrapper 
        />
        <div style={{ marginLeft: '12px' }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: theme.colors.text, 
            fontSize: '14px' 
          }}>
            {itemDetails.name || item.name || 'Unknown Item'}
          </div>
          {item.depth > 0 && (
            <div style={{ 
              color: theme.colors.textSecondary, 
              fontSize: '12px' 
            }}>
              Depth: {item.depth}
            </div>
          )}
        </div>
      </div>
      <div style={getAmountStyle()}>
        {Math.abs(item.amount).toFixed(2)}/min
      </div>
    </div>
  );
};

export default ResourceSummary; 