import React from 'react';
import ViewModeSwitch from '../ViewModeSwitch'; // Adjust path as needed
import StyledSelect from './StyledSelect';
import { theme } from '../../styles/theme';

type ViewMode = "accumulated" | "tree";

interface ViewTreeControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExpandCollapseAll: (expand: boolean) => void;
  // Add depth state/handler if needed later
  // selectedDepth: string | number;
  // onDepthChange: (depth: string | number) => void;
}

const depthOptions = [
  { id: "all", name: "All" },
  { id: "1", name: "1" },
  { id: "2", name: "2" },
  { id: "3", name: "3" },
  { id: "4", name: "4" },
  { id: "5", name: "5" },
];

const ViewTreeControls: React.FC<ViewTreeControlsProps> = ({
  viewMode,
  onViewModeChange,
  onExpandCollapseAll,
  // selectedDepth = "all", // Default value
  // onDepthChange,
}) => {

  // Handler for depth change (placeholder)
  const handleDepthChange = () => {};

  // Styles - kept local for now
  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 8px',
    borderRight: `1px solid ${theme.colors.dropdown.border}`,
  };

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

  return (
    <>
      {/* View Mode Toggle Section */}
      <div style={sectionStyle}>
        <ViewModeSwitch
          viewMode={viewMode}
          onChange={onViewModeChange}
          data-view-mode-switch
        />
      </div>

      {/* Tree Controls Section */}
      <div style={sectionStyle}>
        <button 
          style={iconButtonStyle}
          onClick={() => onExpandCollapseAll(true)}
          title="Expand All"
        >
          <span>+</span>
        </button>
        <button 
          style={iconButtonStyle}
          onClick={() => onExpandCollapseAll(false)}
          title="Collapse All"
        >
          <span>-</span>
        </button>
        
        <StyledSelect
          options={depthOptions}
          value={"all"} // Use prop selectedDepth later
          onChange={handleDepthChange}
          variant="compact"
          style={{ width: "60px" }}
        />
      </div>
    </>
  );
};

export default ViewTreeControls; 