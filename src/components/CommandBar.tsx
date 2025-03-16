import React from "react";
import { theme } from "../styles/theme";
import StyledSelect from "./shared/StyledSelect";
import ViewModeSwitch from "./ViewModeSwitch";

interface CommandBarProps {
  viewMode: "tree" | "accumulated";
  onViewModeChange: (mode: "tree" | "accumulated") => void;
}

const CommandBar: React.FC<CommandBarProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  // Placeholder functions for future implementation
  const handleExpandCollapseAll = () => {};
  const handleDepthChange = (depth: string) => {};
  const handleAccumulateExtensions = () => {};
  const handleToggleMachines = () => {};
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {};
  const handleToggleCompact = () => {};

  // Depth options for dropdown
  const depthOptions = [
    { id: "all", name: "All Depths" },
    { id: "1", name: "Depth 1" },
    { id: "2", name: "Depth 2" },
    { id: "3", name: "Depth 3" },
    { id: "4", name: "Depth 4" },
    { id: "5", name: "Depth 5" },
  ];

  // Styles
  const commandBarStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backgroundColor: theme.colors.darker,
    padding: "8px 16px",
    borderBottom: `1px solid ${theme.colors.dropdown.border}`,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
  };

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 8px",
    borderRight: `1px solid ${theme.colors.dropdown.border}`,
  };

  const lastSectionStyle: React.CSSProperties = {
    ...sectionStyle,
    borderRight: "none",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    backgroundColor: theme.colors.buttonDefault,
    color: theme.colors.text,
    border: "none",
    borderRadius: theme.border.radius,
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: theme.colors.primary,
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: theme.colors.text,
    fontSize: "14px",
    cursor: "pointer",
  };

  const searchStyle: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: "6px 10px",
    fontSize: "14px",
    width: "200px",
  };

  return (
    <div style={commandBarStyle}>
      {/* Row 1 - Main controls */}
      <div style={rowStyle}>
        {/* View Mode Section */}
        <div style={sectionStyle}>
          <span style={{ color: theme.colors.text, fontSize: "14px" }}>View:</span>
          <ViewModeSwitch
            viewMode={viewMode}
            onChange={onViewModeChange}
            data-view-mode-switch
          />
        </div>

        {/* Tree Controls Section */}
        <div style={sectionStyle}>
          <button 
            style={buttonStyle}
            onClick={handleExpandCollapseAll}
            title="Expand or collapse all extensions"
          >
            Expand All
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: theme.colors.text, fontSize: "14px" }}>Depth:</span>
            <StyledSelect
              options={depthOptions}
              value="all"
              onChange={handleDepthChange}
              variant="compact"
              style={{ width: "120px" }}
            />
          </div>
        </div>

        {/* Display Options Section */}
        <div style={sectionStyle}>
          <label style={checkboxLabelStyle}>
            <input 
              type="checkbox" 
              onChange={handleAccumulateExtensions}
            />
            Accumulate Extensions
          </label>
          
          <label style={checkboxLabelStyle}>
            <input 
              type="checkbox" 
              onChange={handleToggleMachines}
              defaultChecked
            />
            Show Machines
          </label>
          
          <label style={checkboxLabelStyle}>
            <input 
              type="checkbox" 
              onChange={handleToggleCompact}
            />
            Compact View
          </label>
        </div>

        {/* Search Section */}
        <div style={lastSectionStyle}>
          <input
            type="text"
            placeholder="Search items..."
            style={searchStyle}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Row 2 - Additional controls (for future use) */}
      <div style={rowStyle}>
        <div style={lastSectionStyle}>
          <button style={buttonStyle} disabled>
            Save
          </button>
          <button style={buttonStyle} disabled>
            Load
          </button>
          <button style={buttonStyle} disabled>
            Compare
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommandBar; 