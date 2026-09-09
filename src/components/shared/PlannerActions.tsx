/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../styles/theme';
import SettingsMenu from './SettingsMenu'; // Keep settings separate or move here?
import StyledSwitch from '../../components/shared/StyledSwitch';
import { useUndoRedo } from '../../features/factory-planner/hooks/useUndoRedo';

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
  isDirty?: boolean; // Add isDirty prop
  activeSetupName?: string | null; // Add activeSetupName prop
  tabName?: string; // Current tab name
  // Save/load error state
  saveError?: string | null;
  onClearSaveError?: () => void;
  // Comparison props
  showComparison?: boolean;
  hasComparisonSnapshot?: boolean;
  snapshotInfo?: { name: string; timestamp: number; treeCount: number } | null;
  onStoreSnapshot?: () => void;
  onClearSnapshot?: () => void;
  onToggleComparison?: () => void;
  onResetToSnapshot?: (removeNewNodes: boolean) => Promise<void>;
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
  isDirty, // Destructure isDirty
  activeSetupName, // Destructure activeSetupName
  tabName,
  saveError, // Destructure saveError
  onClearSaveError, // Destructure onClearSaveError
  // Comparison props
  showComparison,
  hasComparisonSnapshot,
  snapshotInfo,
  onStoreSnapshot,
  onClearSnapshot,
  onToggleComparison,
  onResetToSnapshot,
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
    transition: 'background-color 0.2s ease, border-color 0.2s ease', // Add border-color transition
  };

  // Style for the save button when dirty
  const dirtyIconButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    outline: `2px solid ${theme.colors.danger}`, // Red border
    // Optionally, slightly change background or icon color?
    // color: theme.colors.danger,
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
    padding: '0px 6px',
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
    padding: '0px',
    fontSize: '14px',
  };

  // --- Save Handlers ---
  const handleSaveButtonClick = () => {
    setIsSaveMenuOpen(prev => !prev);
  };

  const handleSaveAsNewClick = () => {
    if (!onSaveSetup || !getSaveNames) return;
    const defaultName = tabName || activeSetupName || "";
    const name = prompt("Enter a new name for this setup:", defaultName);
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

  // Log the received isDirty prop value on render
  // console.log(`[PlannerActions Render] isDirty prop: ${isDirty}`);

  // Undo/Redo hook (keyboard shortcuts enabled)
  const { canUndo, canRedo, undo, redo, lastUndoAction, lastRedoAction } = useUndoRedo(true);

  // Disabled button style
  const disabledIconButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  return (
    <div style={lastSectionStyle}>
      {/* Undo/Redo Buttons */}
      <button
        style={canUndo ? iconButtonStyle : disabledIconButtonStyle}
        onClick={undo}
        disabled={!canUndo}
        title={canUndo ? `Undo: ${lastUndoAction || 'last action'} (Ctrl+Z)` : 'Nothing to undo'}
      >
        <span>↩️</span>
      </button>
      <button
        style={canRedo ? iconButtonStyle : disabledIconButtonStyle}
        onClick={redo}
        disabled={!canRedo}
        title={canRedo ? `Redo: ${lastRedoAction || 'last action'} (Ctrl+Y)` : 'Nothing to redo'}
      >
        <span>↪️</span>
      </button>

      {/* Separator */}
      <div style={{ 
        width: '1px', 
        height: '20px', 
        backgroundColor: theme.colors.border, 
        margin: '0 4px' 
      }} />

      {/* Display Active Setup Name */}
      {activeSetupName && (
        <span
          style={{
            color: theme.colors.text,
            fontSize: "13px",
            fontWeight: "bold",
            marginRight: "10px",
            whiteSpace: "nowrap",
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={activeSetupName}
        >
          {activeSetupName}
          {isDirty ? "*" : ""}
        </span>
      )}

      {/* Direct Save Button (if activeSetupName exists) */}
      {activeSetupName && onSaveSetup && (
        <button
          style={isDirty ? dirtyIconButtonStyle : iconButtonStyle}
          onClick={() => onSaveSetup(activeSetupName)}
          title={`Save "${activeSetupName}"${
            isDirty ? " (unsaved changes)" : ""
          }`}
        >
          <span>💾</span>
        </button>
      )}

      {/* Load Button & Menu Container */}
      <div style={{ position: "relative" }}>
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
              <div style={{ ...dropdownItemStyle, cursor: "default" }}>
                No saved setups
              </div>
            ) : (
              savedSetups.map((name) => (
                <div
                  key={name}
                  style={dropdownItemStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      theme.colors.dropdown.hoverBackground)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                  onClick={() => handleLoadItemClick(name)}
                  title={`Load "${name}"`}
                >
                  <span style={{ flexGrow: 1, marginRight: "10px" }}>
                    {name}
                  </span>
                  <div style={itemActionsStyle}>
                    <button
                      style={{
                        ...itemActionButtonStyle,
                        color: theme.colors.danger,
                      }}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItemClick(name);
                      }}
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
      <div style={{ position: "relative" }}>
        {onSaveSetup && (
          <button
            ref={saveButtonRef}
            style={iconButtonStyle}
            onClick={handleSaveButtonClick}
            title={"Save Options..."}
          >
            <span>💻</span>
          </button>
        )}
        {isSaveMenuOpen && (
          <div ref={saveMenuRef} style={dropdownMenuStyle}>
            <div
              style={dropdownItemStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  theme.colors.dropdown.hoverBackground)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
              onClick={handleSaveAsNewClick}
            >
              Save as New...
            </div>
            {savedSetups.length > 0 && (
              <hr
                style={{
                  border: "none",
                  borderTop: `1px solid ${theme.colors.dropdown.border}`,
                  margin: "0",
                }}
              />
            )}
            {savedSetups.map((name) => (
              <div
                key={name}
                style={dropdownItemStyle}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    theme.colors.dropdown.hoverBackground)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
                onClick={() => handleOverwriteClick(name)}
                title={`Overwrite "${name}"`}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save/Load Error Display */}
      {saveError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: 'rgba(255, 107, 107, 0.15)',
            border: '1px solid rgba(255, 107, 107, 0.4)',
            borderRadius: '4px',
            color: '#ff6b6b',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
          title={saveError}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
            {saveError}
          </span>
          {onClearSaveError && (
            <button
              onClick={onClearSaveError}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6b6b',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 2px',
                lineHeight: 1,
              }}
              title="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Settings Menu Button */}
      <SettingsMenu
        showMachines={showMachines}
        onShowMachinesChange={onShowMachinesChange}
        showMachineMultiplier={showMachineMultiplier}
        onShowMachineMultiplierChange={onShowMachineMultiplierChange}
        autoImport={autoImport}
        onAutoImportChange={onAutoImportChange}
      />

      {/* Comparison Controls */}
      {onStoreSnapshot && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          marginLeft: '8px', 
          borderLeft: `1px solid ${theme.colors.border}`, 
          paddingLeft: '8px' 
        }}>
          {/* Store Baseline Button - wrap in arrow function to prevent event being passed */}
          <button
            style={{
              ...iconButtonStyle,
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.3px',
              minWidth: 'auto',
              width: 'auto',
            }}
            onClick={() => onStoreSnapshot()}
            title={hasComparisonSnapshot ? `Update baseline (current: ${snapshotInfo?.name || 'Stored'})` : 'Store current state as baseline'}
          >
            Store
          </button>

          {/* Toggle Comparison Display (only if snapshot exists) */}
          {hasComparisonSnapshot && onToggleComparison && (
            <button
              style={{
                ...(showComparison ? activeIconButtonStyle : iconButtonStyle),
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.3px',
                minWidth: 'auto',
                width: 'auto',
              }}
              onClick={onToggleComparison}
              title={showComparison ? 'Hide comparison' : 'Show comparison'}
            >
              Compare
            </button>
          )}

          {/* Reset to Baseline Button (only if snapshot exists) */}
          {hasComparisonSnapshot && onResetToSnapshot && (
            <button
              style={{
                ...iconButtonStyle,
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.3px',
                minWidth: 'auto',
                width: 'auto',
              }}
              onClick={(e) => onResetToSnapshot(e.shiftKey)}
              title="Reset to baseline values. Shift+Click: also remove new nodes added after store."
            >
              Reset
            </button>
          )}

          {/* Clear Baseline Button (only if snapshot exists) */}
          {hasComparisonSnapshot && onClearSnapshot && (
            <button
              style={{
                ...iconButtonStyle,
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.3px',
                minWidth: 'auto',
                width: 'auto',
              }}
              onClick={onClearSnapshot}
              title="Clear baseline"
            >
              Clear
            </button>
          )}
        </div>
      )}

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