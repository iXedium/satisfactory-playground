import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

interface ItemNodeButtonsProps {
  isRoot?: boolean;
  isImport?: boolean;
  itemId: string;
  onDelete?: () => void;
  onImport?: (nodeId: string) => void;
  onUnimport?: (nodeId: string) => void;
  containerStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
}

const ItemNodeButtons: React.FC<ItemNodeButtonsProps> = ({
  isRoot = false,
  isImport = false,
  itemId,
  onDelete,
  onImport,
  onUnimport,
  containerStyle,
  buttonStyle: customButtonStyle,
}) => {
  // Styles
  const buttonBaseStyle: React.CSSProperties = {
    cursor: 'pointer',
    padding: '0px 6px',
    borderRadius: theme.border.radius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: sizes.fontSize.large,
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    lineHeight: '18px',
    height: sizes.button.compactHeight,
    width: sizes.button.compactWidth,
    ...customButtonStyle
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: sizes.spacing.small,
      padding: `${sizes.spacing.small} 0`,
      marginRight: sizes.spacing.xsmall,
      width: '24px',
      flex: '0 0 24px',
      alignItems: 'center',
      ...containerStyle
    }}>
      {/* Delete button for root nodes */}
      {isRoot && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            ...buttonBaseStyle,
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            color: '#ff3333',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            e.currentTarget.style.color = '#ff0000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            e.currentTarget.style.color = '#ff3333';
          }}
          title="Delete chain"
        >
          ×
        </button>
      )}
      
      {/* Import/Revert import button for child nodes */}
      {!isRoot && (onImport || onUnimport) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isImport) {
              onUnimport?.(itemId);
            } else {
              onImport?.(itemId);
            }
          }}
          style={{
            ...buttonBaseStyle,
            background: isImport 
              ? 'rgba(255, 50, 50, 0.1)' 
              : 'rgba(0, 150, 255, 0.1)',
            border: isImport 
              ? '1px solid rgba(255, 50, 50, 0.3)' 
              : '1px solid rgba(0, 150, 255, 0.3)',
            color: isImport ? '#ff3333' : '#0096ff',
          }}
          onMouseEnter={(e) => {
            if (isImport) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 50, 50, 0.2)';
              e.currentTarget.style.color = '#ff0000';
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(0, 150, 255, 0.2)';
              e.currentTarget.style.color = '#0077ff';
            }
          }}
          onMouseLeave={(e) => {
            if (isImport) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 50, 50, 0.1)';
              e.currentTarget.style.color = '#ff3333';
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(0, 150, 255, 0.1)';
              e.currentTarget.style.color = '#0096ff';
            }
          }}
          title={isImport ? "Revert import" : "Import from other chain"}
        >
          {isImport ? "↑" : "↓"}
        </button>
      )}
    </div>
  );
};

export default ItemNodeButtons; 