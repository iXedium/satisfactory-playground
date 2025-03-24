import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import StyledCheckbox from '../shared/StyledCheckbox';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  showExtensions: boolean;
  onShowExtensionsChange: (show: boolean) => void;
  accumulateExtensions: boolean;
  onAccumulateExtensionsChange: (accumulate: boolean) => void;
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
  compactView: boolean;
  onCompactViewChange: (compact: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  buttonRef,
  showExtensions,
  onShowExtensionsChange,
  accumulateExtensions,
  onAccumulateExtensionsChange,
  showMachines,
  onShowMachinesChange,
  showMachineMultiplier,
  onShowMachineMultiplierChange,
  compactView,
  onCompactViewChange,
}) => {
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Update menu position when it's opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 200) // Ensure minimum width
      });
    }
  }, [isOpen, buttonRef]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, buttonRef, onClose]);

  if (!isOpen) return null;

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: sizes.spacing.small,
  };

  const checkboxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: sizes.spacing.small,
    padding: `${sizes.spacing.small} 0`,
    cursor: 'pointer',
  };
  
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      id="settings-menu"
      style={{
        position: 'absolute',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        width: `${menuPosition.width}px`,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.dropdown.border}`,
        borderRadius: theme.border.radius,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        padding: sizes.spacing.medium,
        zIndex: 1000,
        minWidth: '200px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4 style={{ 
        margin: `0 0 ${sizes.spacing.standard} 0`, 
        color: theme.colors.text, 
        fontSize: sizes.fontSize.standard 
      }}>
        Display Options
      </h4>
      
      <div style={checkboxContainerStyle}>
        <div style={checkboxStyle} onClick={() => onShowExtensionsChange(!showExtensions)}>
          <StyledCheckbox 
            checked={showExtensions} 
            onChange={() => onShowExtensionsChange(!showExtensions)}
            label=""
          />
          <span>Show Extensions</span>
        </div>
        
        <div style={checkboxStyle} onClick={() => onAccumulateExtensionsChange(!accumulateExtensions)}>
          <StyledCheckbox 
            checked={accumulateExtensions} 
            onChange={() => onAccumulateExtensionsChange(!accumulateExtensions)}
            label=""
          />
          <span>Accumulate Extensions</span>
        </div>
        
        <div style={checkboxStyle} onClick={() => onShowMachinesChange(!showMachines)}>
          <StyledCheckbox 
            checked={showMachines} 
            onChange={() => onShowMachinesChange(!showMachines)}
            label=""
          />
          <span>Show Machines</span>
        </div>
        
        <div style={checkboxStyle} onClick={() => onShowMachineMultiplierChange(!showMachineMultiplier)}>
          <StyledCheckbox 
            checked={showMachineMultiplier} 
            onChange={() => onShowMachineMultiplierChange(!showMachineMultiplier)}
            label=""
            disabled={!showMachines}
          />
          <span style={{ opacity: showMachines ? 1 : 0.5 }}>Show Multiplier</span>
        </div>
        
        <div style={checkboxStyle} onClick={() => onCompactViewChange(!compactView)}>
          <StyledCheckbox 
            checked={compactView} 
            onChange={() => onCompactViewChange(!compactView)}
            label=""
          />
          <span>Compact View</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsPanel; 