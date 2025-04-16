import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { theme } from '../../styles/theme';
import StyledCheckbox from './StyledCheckbox';

interface SettingsMenuProps {
  showExtensions: boolean;
  onShowExtensionsChange: (show: boolean) => void;
  accumulateExtensions: boolean;
  onAccumulateExtensionsChange: (accumulate: boolean) => void;
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
  // Add creation options
  autoImport: boolean;
  onAutoImportChange: (value: boolean) => void;
  // children?: React.ReactNode; // Remove children prop
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  showExtensions,
  onShowExtensionsChange,
  accumulateExtensions,
  onAccumulateExtensionsChange,
  showMachines,
  onShowMachinesChange,
  showMachineMultiplier,
  onShowMachineMultiplierChange,
  // children, // Remove children destructuring
  autoImport, // Renamed
  onAutoImportChange, // Renamed
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  // Update menu position when it's opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position menu to align right edge with button's right edge
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4, // Add small gap
        left: rect.right + window.scrollX, // Start from right edge
        width: rect.width // Match button width initially (menu will likely be wider)
      });
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && 
          buttonRef.current && 
          !buttonRef.current.contains(event.target as Node)) {
            // Check if the click was inside the portal menu
            const menuElement = document.getElementById('settings-menu-portal');
            if (menuElement && !menuElement.contains(event.target as Node)) {
                 setIsOpen(false);
            }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Styles - kept local for now
  const iconButtonStyle: React.CSSProperties = {
    padding: '4px',
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    color: theme.colors.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    fontSize: '14px',
  };

  const settingsMenuStyle: React.CSSProperties = {
    position: 'absolute', // Use absolute for portal positioning relative to viewport
    top: `${menuPosition.top}px`,
    left: `${menuPosition.left}px`, // Set left edge 
    transform: 'translateX(-100%)', // Shift left by its own width to align right edges
    backgroundColor: theme.colors.dark,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.borderRadius,
    padding: '12px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 9999,
    minWidth: '200px',
    // Removed marginTop as top includes offset now
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const compactCheckboxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    whiteSpace: 'nowrap', // Prevent wrapping
  };

  return (
    <div style={{ position: 'relative' }}> {/* Container for positioning context */}
      <button 
        ref={buttonRef}
        style={iconButtonStyle}
        onClick={toggleMenu}
        title="Settings"
      >
        <span>⚙️</span>
      </button>
      
      {/* Settings Dropdown Menu - Rendered in Portal */}
      {isOpen && ReactDOM.createPortal(
        <div 
          id="settings-menu-portal" // Unique ID for portal element
          style={settingsMenuStyle}
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside closing the menu
        >
          <h4 style={{ margin: '0 0 8px 0', color: theme.colors.text, fontSize: '14px' }}>Display Options</h4>
          <div style={checkboxContainerStyle}>
            <div style={compactCheckboxStyle}>
              <StyledCheckbox 
                checked={showExtensions} 
                onChange={() => onShowExtensionsChange(!showExtensions)}
                label=""
              />
              <span>Show Extensions</span>
            </div>
            <div style={compactCheckboxStyle}>
              <StyledCheckbox 
                checked={accumulateExtensions} 
                onChange={() => onAccumulateExtensionsChange(!accumulateExtensions)}
                label=""
              />
              <span>Accumulate Extensions</span>
            </div>
            <div style={compactCheckboxStyle}>
              <StyledCheckbox 
                checked={showMachines} 
                onChange={() => onShowMachinesChange(!showMachines)}
                label=""
              />
              <span>Show Machines</span>
            </div>
            <div style={compactCheckboxStyle}>
              <StyledCheckbox 
                checked={showMachineMultiplier} 
                onChange={() => onShowMachineMultiplierChange(!showMachineMultiplier)}
                label=""
              />
              <span>Show Multiplier</span>
            </div>
            {/* Add Compact View checkbox if needed later */}
            {/* <div style={compactCheckboxStyle}>
              <StyledCheckbox 
                checked={compactView} 
                onChange={toggleCompactView}
                label=""
              />
              <span>Compact View</span>
            </div> */}
          </div>
          {/* Remove children rendering */}
          {/* {children && <div style={{ marginTop: '12px', borderTop: `1px solid ${theme.colors.dropdown.border}`, paddingTop: '12px' }}>{children}</div>} */}

          {/* Add New Section for Creation Options */} 
          <div style={{ marginTop: '12px', borderTop: `1px solid ${theme.colors.dropdown.border}`, paddingTop: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: theme.colors.text, fontSize: '14px' }}>Creation Options</h4>
            <div style={checkboxContainerStyle}>
              <div style={compactCheckboxStyle}>
                <StyledCheckbox 
                  checked={autoImport} // Renamed prop
                  // StyledCheckbox onChange returns boolean directly
                  onChange={onAutoImportChange} // Renamed prop
                  label=""
                />
                <span>Auto Import Chains</span> {/* Updated Label */}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SettingsMenu; 