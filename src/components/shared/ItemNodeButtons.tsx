import React, { useEffect } from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import { useHideToggleDrag } from '../../contexts/HideToggleDragContext';

interface ItemNodeButtonsProps {
  isRoot?: boolean;
  isImport?: boolean;
  isHidden?: boolean;
  itemId: string;
  onDelete?: () => void;
  onDeleteAll?: () => void;
  onImport?: (nodeId: string) => void;
  onUnimport?: (nodeId: string) => void;
  onToggleHidden?: () => void;
  onToggleHiddenAll?: (targetHidden: boolean) => void;
  containerStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
}

const ItemNodeButtons: React.FC<ItemNodeButtonsProps> = ({
  isRoot = false,
  isImport = false,
  isHidden = false,
  itemId,
  onDelete,
  onDeleteAll,
  onImport,
  onUnimport,
  onToggleHidden,
  onToggleHiddenAll,
  containerStyle,
  buttonStyle: customButtonStyle,
}) => {
  // Use the hide toggle drag context for drag-to-toggle behavior
  const { state: dragState, startDrag, registerButton, unregisterButton, handleButtonEnter } = useHideToggleDrag();
  
  // Register/unregister this button with the context
  useEffect(() => {
    if (isRoot && onToggleHidden) {
      registerButton(itemId, isHidden, onToggleHidden);
      return () => unregisterButton(itemId);
    }
  }, [isRoot, itemId, isHidden, onToggleHidden, registerButton, unregisterButton]);

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
    <div 
      className="item-node-buttons"
      style={{
      display: 'flex',
      flexDirection: 'row',
      gap: sizes.spacing.small,
      padding: `${sizes.spacing.small} 0`,
      marginRight: sizes.spacing.xsmall,
      width: '48px',
      flex: '0 0 48px',
      alignItems: 'center',
      ...containerStyle
    }}>
      {/* Delete button for root nodes */}
      {isRoot && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (e.shiftKey && onDeleteAll) {
              onDeleteAll();
            } else {
              onDelete();
            }
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

      {/* Hide/Show toggle button for root nodes */}
      {isRoot && onToggleHidden && (
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent text selection during drag
            if (e.shiftKey) {
              // Shift+Click: toggle this chain and apply the result to all chains (single undo)
              if (onToggleHiddenAll) {
                onToggleHiddenAll(!isHidden);
              } else {
                onToggleHidden();
              }
              return;
            }
            // Start drag - target state is the opposite of current (what we're toggling TO)
            startDrag(!isHidden);
            // Also toggle this button immediately
            onToggleHidden();
          }}
          onMouseEnter={(e) => {
            // Handle drag-to-toggle
            if (dragState.isDragging) {
              handleButtonEnter(itemId);
            }
            // Visual hover effect
            e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.4)';
            e.currentTarget.style.color = isHidden ? '#444444' : '#31af61';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isHidden 
              ? 'rgba(128, 128, 128, 0.3)' 
              : 'rgba(128, 128, 128, 0.1)';
            e.currentTarget.style.color = isHidden ? '#666666' : '#5bc082';
          }}
          style={{
            ...buttonBaseStyle,
            background: isHidden 
              ? 'rgba(128, 128, 128, 0.3)' 
              : 'rgba(128, 128, 128, 0.1)',
            border: '1px solid rgba(128, 128, 128, 0.3)',
            color: isHidden ? '#666666' : '#5bc082',
            fontSize: '12px',
            userSelect: 'none', // Prevent text selection
          }}
          title={isHidden ? "Show chain (unhide)" : "Hide chain (drag to toggle multiple)"}
        >
          {isHidden ? '⌣' : '👁'}
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