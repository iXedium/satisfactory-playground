/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../styles/theme';
import SettingsMenu from './SettingsMenu'; // Keep settings separate or move here?
import StyledSwitch from '../../components/shared/StyledSwitch';

interface PlannerActionsProps {
  onSearchChange: (searchTerm: string) => void; // Example handler
  onClearSavedData?: () => void;
  // Include props for SettingsMenu if it's moved here
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
  autoImport: boolean;
  onAutoImportChange: (value: boolean) => void;
  // Add Summary Toggle props
  isSummaryVisible: boolean;
  onToggleSummary: () => void;
  // Add Save/Load handlers
  onSaveSetup?: (name: string) => Promise<void>;
  onLoadSetup?: (name: string) => Promise<void>;
  // Add getSaveNames and onDeleteSetup
  getSaveNames?: () => string[];
  onDeleteSetup?: (name: string) => Promise<void>;
  // We might need getSaveNames to populate the load menu later
  // getSaveNames?: () => string[]; 
}

const PlannerActions: React.FC<PlannerActionsProps> = ({
  onSearchChange,
  onClearSavedData,
  // Destructure settings props if moved
  showMachines,
  onShowMachinesChange,
  showMachineMultiplier,
  onShowMachineMultiplierChange,
  autoImport,
  onAutoImportChange,
  // Destructure summary props
  isSummaryVisible,
  onToggleSummary,
  // Destructure save/load handlers
  onSaveSetup,
  onLoadSetup,
  // Destructure new props
  getSaveNames,
  onDeleteSetup,
}) => {
  const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false); // State for save menu
  const loadButtonRef = useRef<HTMLButtonElement>(null); // Ref for load button
  const loadMenuRef = useRef<HTMLDivElement>(null); // Ref for load menu
  const saveButtonRef = useRef<HTMLButtonElement>(null); // Ref for save button
  const saveMenuRef = useRef<HTMLDivElement>(null); // Ref for save menu

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isLoadMenuOpen &&
        loadButtonRef.current &&
        !loadButtonRef.current.contains(event.target as Node) &&
        loadMenuRef.current &&
        !loadMenuRef.current.contains(event.target as Node)
      ) {
        setIsLoadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLoadMenuOpen]);

  // Close Save dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSaveMenuOpen &&
        saveButtonRef.current &&
        !saveButtonRef.current.contains(event.target as Node) &&
        saveMenuRef.current &&
        !saveMenuRef.current.contains(event.target as Node)
      ) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSaveMenuOpen]);

  // Styles - kept local for now
  const lastSectionStyle: React.CSSProperties = { 
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 8px', 
    // Removed borderRight if it was here
    marginLeft: 'auto', // Push actions to the right
  };

  const searchStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: '4px 8px',
    fontSize: '13px',
    width: '180px',
  };

  const iconButtonStyle: React.CSSProperties = {
    padding: "4px",
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    color: theme.colors.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    fontSize: "14px",
    transition: 'background-color 0.2s ease', // Add transition for hover/active state
  };

  const activeIconButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    backgroundColor: theme.colors.primary, // Indicate active state
    color: theme.colors.buttonText, // Change icon color for contrast
  };

  const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0, // Align with the right side of the button container
    top: '100%', // Position below the button container
    marginTop: '4px',
    backgroundColor: theme.colors.darker,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 1050, // Ensure it's above other elements
    maxHeight: '300px',
    overflowY: 'auto',
    minWidth: '200px',
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    color: theme.colors.text,
    cursor: 'pointer',
    borderBottom: `1px solid ${theme.colors.dropdown.border}`,
  };

  const dropdownItemHoverStyle: React.CSSProperties = {
    ...dropdownItemStyle,
    backgroundColor: theme.colors.dropdown.hoverBackground,
  };

  const itemActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const itemActionButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    padding: '2px',
    fontSize: '14px',
  };

  // --- Save Handlers ---
  const handleSaveButtonClick = () => {
    setIsSaveMenuOpen(prev => !prev);
  };

  const handleSaveAsNewClick = () => {
    if (!onSaveSetup || !getSaveNames) return;
    const name = prompt("Enter a new name for this setup:");
    if (!name?.trim()) {
        if (name !== null) { alert("Save name cannot be empty."); }
        return;
    }
    
    const existingNames = getSaveNames();
    if (existingNames.includes(name)) {
        alert(`"${name}" already exists. Select it from the list to overwrite.`);
        return; // Don't save if name already exists via this path
    }
    
    onSaveSetup(name); // Save with the new name
    setIsSaveMenuOpen(false); // Close menu
  };

  const handleOverwriteClick = (name: string) => {
    if (!onSaveSetup) return;
    // Optional: Add a confirmation here? 
    // if (window.confirm(`Overwrite existing setup "${name}"?`)) {
      onSaveSetup(name); // Overwrite existing save
      setIsSaveMenuOpen(false); // Close menu
    // }
  };

  // --- Load Handlers ---
  const handleLoadButtonClick = () => {
    setIsLoadMenuOpen(prev => !prev);
  };

  const handleLoadItemClick = (name: string) => {
    if (onLoadSetup) {
      onLoadSetup(name);
      setIsLoadMenuOpen(false); // Close menu after loading
    }
  };

  const handleDeleteItemClick = (name: string) => {
    if (onDeleteSetup) {
      if (window.confirm(`Are you sure you want to delete setup "${name}"?`)) {
        onDeleteSetup(name);
        // Keep menu open or close? Close seems reasonable for now.
        setIsLoadMenuOpen(false); 
      }
    }
  };

  const savedSetups = getSaveNames ? getSaveNames() : [];

  return (
    <div style={lastSectionStyle}>
      <input
        type="text"
        placeholder="Search..."
        style={searchStyle}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {/* Load Button & Menu Container */} 
      <div style={{ position: 'relative' }}> {/* Container for positioning */} 
        {onLoadSetup && (
          <button
            ref={loadButtonRef}
            style={iconButtonStyle}
            onClick={handleLoadButtonClick}
            title="Load Setup"
          >
            <span>📂</span>
          </button>
        )}
        {isLoadMenuOpen && (
          <div ref={loadMenuRef} style={dropdownMenuStyle}>
            {savedSetups.length === 0 ? (
              <div style={{ ...dropdownItemStyle, cursor: 'default' }}>No saved setups</div>
            ) : (
              savedSetups.map(name => (
                <div 
                  key={name} 
                  style={dropdownItemStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.dropdown.hoverBackground)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  // Removed direct onClick from the div to prevent accidental loads
                >
                  <span onClick={() => handleLoadItemClick(name)} style={{ flexGrow: 1, marginRight: '10px' }}>{name}</span>
                  <div style={itemActionsStyle}>
                    {/* Optional: Add load icon button? */}
                    {/* <button 
                      style={itemActionButtonStyle} 
                      title="Load" 
                      onClick={() => handleLoadItemClick(name)}
                    > 💾 </button> */} 
                    <button 
                      style={{...itemActionButtonStyle, color: theme.colors.danger }} 
                      title="Delete"
                      onClick={() => handleDeleteItemClick(name)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Save Button & Menu Container */} 
      <div style={{ position: 'relative' }}> 
        {onSaveSetup && (
          <button
            ref={saveButtonRef}
            style={iconButtonStyle}
            onClick={handleSaveButtonClick} // Use the new handler
            title="Save Setup"
          >
            <span>💾</span>
          </button>
        )}
        {isSaveMenuOpen && (
          <div ref={saveMenuRef} style={dropdownMenuStyle}>
            {/* Save as New option */} 
            <div 
              style={dropdownItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.dropdown.hoverBackground)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              onClick={handleSaveAsNewClick}
            >
              Save as New...
            </div>
            {/* Separator */} 
            {savedSetups.length > 0 && (
              <hr style={{ border: 'none', borderTop: `1px solid ${theme.colors.dropdown.border}`, margin: '0' }} />
            )}
            {/* Existing saves for overwrite */} 
            {savedSetups.map(name => (
              <div 
                key={name} 
                style={dropdownItemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.dropdown.hoverBackground)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={() => handleOverwriteClick(name)}
                title={`Overwrite "${name}"`}
              >
                {name}
              </div>
            ))}
            {/* Optional: Message if no saves exist yet */} 
            {/* {savedSetups.length === 0 && (<div style={{...dropdownItemStyle, cursor: 'default'}}>No setups to overwrite</div>)} */}
          </div>
        )}
      </div>

      {/* Settings Menu Button */}
      <SettingsMenu 
        showMachines={showMachines}
        onShowMachinesChange={onShowMachinesChange}
        showMachineMultiplier={showMachineMultiplier}
        onShowMachineMultiplierChange={onShowMachineMultiplierChange}
        autoImport={autoImport}
        onAutoImportChange={onAutoImportChange}
      />
      
      {/* Summary Toggle Button */}
      <button 
        style={isSummaryVisible ? activeIconButtonStyle : iconButtonStyle}
        onClick={onToggleSummary}
        title="Toggle Item Summary"
      >
        <span>∑</span>
      </button>

      {/* Clear Saved Data Button */}
      {onClearSavedData && (
        <button 
          style={iconButtonStyle}
          onClick={onClearSavedData}
          title="Clear Saved Data"
        >
          <span>🗑️</span>
        </button>
      )}
    </div>
  );
};

export default PlannerActions; 