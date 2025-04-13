import React from 'react';
import { theme } from '../../styles/theme';
import SettingsMenu from './SettingsMenu'; // Keep settings separate or move here?

interface PlannerActionsProps {
  onSearchChange: (searchTerm: string) => void; // Example handler
  onClearSavedData?: () => void;
  // Include props for SettingsMenu if it's moved here
  showExtensions: boolean;
  onShowExtensionsChange: (show: boolean) => void;
  accumulateExtensions: boolean;
  onAccumulateExtensionsChange: (accumulate: boolean) => void;
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
}

const PlannerActions: React.FC<PlannerActionsProps> = ({
  onSearchChange,
  onClearSavedData,
  // Destructure settings props if moved
  showExtensions,
  onShowExtensionsChange,
  accumulateExtensions,
  onAccumulateExtensionsChange,
  showMachines,
  onShowMachinesChange,
  showMachineMultiplier,
  onShowMachineMultiplierChange,
}) => {

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

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    color: theme.colors.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    marginLeft: 'auto', // Push clear button further right if needed
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
  };

  return (
    <div style={lastSectionStyle}>
      <input
        type="text"
        placeholder="Search..."
        style={searchStyle}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {/* Render SettingsMenu here or keep in CommandBar? Let's keep it here for now */}
      <SettingsMenu 
        showExtensions={showExtensions}
        onShowExtensionsChange={onShowExtensionsChange}
        accumulateExtensions={accumulateExtensions}
        onAccumulateExtensionsChange={onAccumulateExtensionsChange}
        showMachines={showMachines}
        onShowMachinesChange={onShowMachinesChange}
        showMachineMultiplier={showMachineMultiplier}
        onShowMachineMultiplierChange={onShowMachineMultiplierChange}
      />
      
      {onClearSavedData && (
        <button 
          style={iconButtonStyle} // Using icon style for consistency
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