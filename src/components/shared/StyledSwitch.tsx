import React from 'react';
import { theme } from '../../styles/theme';

interface StyledSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: React.CSSProperties;
}

const StyledSwitch: React.FC<StyledSwitchProps> = ({ checked, onChange, style }) => {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: '48px',
        height: '24px',
        backgroundColor: checked ? theme.colors.buttonDefault : theme.colors.dark,
        border: `2px solid ${theme.colors.dropdown.border}`,
        borderRadius: '12px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        ...style
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          backgroundColor: theme.colors.text,
          borderRadius: '2px',
          position: 'absolute',
          top: '2px',
          left: checked ? '26px' : '2px',
          transition: 'all 0.2s ease-in-out'
        }}
      />
    </div>
  );
};

export default StyledSwitch; 