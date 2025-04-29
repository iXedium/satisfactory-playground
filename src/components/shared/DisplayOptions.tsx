import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

interface DisplayOptionsProps {
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
  containerStyle?: React.CSSProperties;
}

const DisplayOptions: React.FC<DisplayOptionsProps> = ({
  showMachines,
  onShowMachinesChange,
  showMachineMultiplier,
  onShowMachineMultiplierChange,
  containerStyle,
}) => {
  const toggleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: sizes.spacing.small,
    margin: `${sizes.spacing.small} 0`,
  };

  const labelStyle: React.CSSProperties = {
    color: theme.colors.text,
    fontSize: sizes.fontSize.standard,
  };

  const checkboxStyle: React.CSSProperties = {
    accentColor: theme.colors.primary,
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: sizes.spacing.medium,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.border.radius,
        border: `1px solid ${theme.colors.dropdown.border}`,
        ...containerStyle
      }}
    >
      <h3 style={{ margin: `0 0 ${sizes.spacing.medium} 0`, color: theme.colors.text }}>
        Display Options
      </h3>
          
      
      <div style={toggleStyle}>
        <input
          type="checkbox"
          id="showMachines"
          checked={showMachines}
          onChange={(e) => onShowMachinesChange(e.target.checked)}
          style={checkboxStyle}
        />
        <label htmlFor="showMachines" style={labelStyle}>
          Show Machines
        </label>
      </div>
      
      <div style={toggleStyle}>
        <input
          type="checkbox"
          id="showMachineMultiplier"
          checked={showMachineMultiplier}
          onChange={(e) => onShowMachineMultiplierChange(e.target.checked)}
          style={checkboxStyle}
          disabled={!showMachines}
        />
        <label 
          htmlFor="showMachineMultiplier" 
          style={{ 
            ...labelStyle, 
            opacity: showMachines ? 1 : 0.5 
          }}
        >
          Show Machine Multiplier
        </label>
      </div>
    </div>
  );
};

export default DisplayOptions; 