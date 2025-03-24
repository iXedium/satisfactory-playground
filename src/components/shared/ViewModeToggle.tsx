import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

type ViewMode = "accumulated" | "tree";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  containerStyle?: React.CSSProperties;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  containerStyle,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: sizes.spacing.medium,
        ...containerStyle
      }}
    >
      <label style={{ color: theme.colors.text, fontSize: sizes.fontSize.standard }}>
        View Mode:
      </label>
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          background: theme.colors.dark,
          borderRadius: theme.border.radius,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.dropdown.border}`,
        }}
      >
        <button
          style={{
            background: viewMode === 'tree' 
              ? theme.colors.primary 
              : 'transparent',
            color: viewMode === 'tree' 
              ? theme.colors.buttonText 
              : theme.colors.text,
            border: 'none',
            padding: `${sizes.spacing.small} ${sizes.spacing.medium}`,
            cursor: 'pointer',
            fontSize: sizes.fontSize.standard,
            transition: 'all 0.2s',
          }}
          onClick={() => onViewModeChange('tree')}
        >
          Tree View
        </button>
        <button
          style={{
            background: viewMode === 'accumulated' 
              ? theme.colors.primary 
              : 'transparent',
            color: viewMode === 'accumulated' 
              ? theme.colors.buttonText 
              : theme.colors.text,
            border: 'none',
            padding: `${sizes.spacing.small} ${sizes.spacing.medium}`,
            cursor: 'pointer',
            fontSize: sizes.fontSize.standard,
            transition: 'all 0.2s',
          }}
          onClick={() => onViewModeChange('accumulated')}
        >
          Accumulated View
        </button>
      </div>
    </div>
  );
};

export default ViewModeToggle; 