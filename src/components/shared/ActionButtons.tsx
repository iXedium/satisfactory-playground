import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

interface ActionButtonsProps {
  onExpandCollapseAll: (expand: boolean) => void;
  viewMode: "accumulated" | "tree";
  onClearSavedData?: () => void;
  containerStyle?: React.CSSProperties;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onExpandCollapseAll,
  viewMode,
  onClearSavedData,
  containerStyle,
}) => {
  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.buttonText,
    border: 'none',
    borderRadius: theme.border.radius,
    padding: `${sizes.spacing.small} ${sizes.spacing.medium}`,
    cursor: 'pointer',
    fontSize: sizes.fontSize.standard,
    transition: 'background-color 0.2s',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const iconButtonStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: theme.colors.text,
    border: 'none',
    borderRadius: theme.border.radius,
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    transition: 'background-color 0.2s',
    height: '40px',
    width: '40px',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: sizes.spacing.small,
        ...containerStyle
      }}
    >
      {/* Only show expand/collapse buttons in tree view */}
      {viewMode === "tree" && (
        <>
          <button
            style={buttonStyle}
            onClick={() => onExpandCollapseAll(true)}
            title="Expand All Nodes"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary}
          >
            Expand All
          </button>
          
          <button
            style={buttonStyle}
            onClick={() => onExpandCollapseAll(false)}
            title="Collapse All Nodes"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary}
          >
            Collapse All
          </button>
        </>
      )}
      
      {/* Clear Saved Data button */}
      {onClearSavedData && (
        <button
          style={iconButtonStyle}
          onClick={() => {
            if (window.confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
              onClearSavedData();
            }
          }}
          title="Clear Saved Data"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 50, 50, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span role="img" aria-label="Clear data">🗑️</span>
        </button>
      )}
    </div>
  );
};

export default ActionButtons; 