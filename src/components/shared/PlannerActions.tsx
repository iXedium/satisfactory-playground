/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
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
}) => {
  // const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Remove unused state

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

  return (
    <div style={lastSectionStyle}>
      <input
        type="text"
        placeholder="Search..."
        style={searchStyle}
        onChange={(e) => onSearchChange(e.target.value)}
      />

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
        <span>∑</span> {/* Sigma icon for summary */}
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