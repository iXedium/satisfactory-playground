import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import StyledSelect from './StyledSelect';
import StyledCheckbox from '../shared/StyledCheckbox';

interface ViewOptionsPanelProps {
  compactView: boolean;
  onCompactViewChange: (compactView: boolean) => void;
  selectedDepth: string;
  onDepthChange: (depth: string) => void;
  containerStyle?: React.CSSProperties;
}

const ViewOptionsPanel: React.FC<ViewOptionsPanelProps> = ({
  compactView,
  onCompactViewChange,
  selectedDepth,
  onDepthChange,
  containerStyle,
}) => {
  const depthOptions = [
    { id: "all", name: "All" },
    { id: "1", name: "1" },
    { id: "2", name: "2" },
    { id: "3", name: "3" },
    { id: "4", name: "4" },
    { id: "5", name: "5" },
  ];

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: sizes.spacing.small,
  };

  const checkboxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: sizes.spacing.small,
    cursor: 'pointer',
  };

  return (
    <div 
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: sizes.spacing.large,
        padding: sizes.spacing.medium,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.border.radius,
        border: `1px solid ${theme.colors.dropdown.border}`,
        ...containerStyle,
      }}
    >
      {/* View Option Controls */}
      <div>
        <label style={{ 
          color: theme.colors.text, 
          fontSize: sizes.fontSize.standard,
          marginRight: sizes.spacing.medium,
          display: 'block',
          marginBottom: sizes.spacing.small,
        }}>
          Depth:
        </label>
        <StyledSelect
          value={selectedDepth}
          onChange={onDepthChange}
          options={depthOptions}
          style={{ width: '120px' }}
          variant="compact"
        />
      </div>

      {/* View Options Checkboxes */}
      <div style={checkboxContainerStyle}>
        <div style={checkboxStyle} onClick={() => onCompactViewChange(!compactView)}>
          <StyledCheckbox 
            checked={compactView} 
            onChange={() => onCompactViewChange(!compactView)}
            label=""
          />
          <span style={{ color: theme.colors.text }}>Compact View</span>
        </div>
      </div>
    </div>
  );
};

export default ViewOptionsPanel; 