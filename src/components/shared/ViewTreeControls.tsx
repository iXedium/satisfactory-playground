import React from 'react';
import ViewModeSwitch from '../ViewModeSwitch'; // Adjust path as needed
import StyledSelect from './StyledSelect';
import { theme } from '../../styles/theme';

// Types moved from useFactoryPlanner for clarity
type TreeSortKey = 'originalDepth' | 'amount' | 'name' | 'nominalRate';
type SortDirection = 'asc' | 'desc';
type ViewMode = "accumulated" | "tree";

interface ViewTreeControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExpandCollapseAll: (expand: boolean) => void;
  // --- Tree View Sort Props ---
  treeSortKey: TreeSortKey;
  onTreeSortKeyChange: (key: TreeSortKey) => void;
  treeSortDirection: SortDirection;
  onTreeSortDirectionChange: (direction: SortDirection) => void;
  // -----------------------------
}

const depthOptions = [
  { id: "all", name: "All" },
  { id: "1", name: "1" },
  { id: "2", name: "2" },
  { id: "3", name: "3" },
  { id: "4", name: "4" },
  { id: "5", name: "5" },
];

const sortOptions = [
  { id: "originalDepth", name: "Hierarchy" },
  { id: "amount", name: "Rate" },
  { id: "nominalRate", name: "Nominal Rate" },
  { id: "name", name: "Name" },
];

const ViewTreeControls: React.FC<ViewTreeControlsProps> = ({
  viewMode,
  onViewModeChange,
  onExpandCollapseAll,
  treeSortKey,
  onTreeSortKeyChange,
  treeSortDirection,
  onTreeSortDirectionChange,
}) => {

  // Handler for depth change (placeholder)
  const handleDepthChange = () => {};

  const toggleSortDirection = () => {
    onTreeSortDirectionChange(treeSortDirection === 'asc' ? 'desc' : 'asc');
  };

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

      {/* Tree Controls Section - Only shown in Tree View Mode */}
      {viewMode === 'tree' && (
        <div style={sectionStyle}>
          {/* Expand/Collapse Buttons */}
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
          
          {/* Depth Select (unused for now) */}
          {/* <StyledSelect
            options={depthOptions}
            value={"all"} // Use prop selectedDepth later
            onChange={handleDepthChange}
            variant="compact"
            style={{ width: "60px" }}
          /> */}

          {/* Sort Controls */}
          <StyledSelect
            options={sortOptions}
            value={treeSortKey}
            // The value passed by StyledSelect should be TreeSortKey
            onChange={(value) => onTreeSortKeyChange(value as TreeSortKey)}
            variant="compact"
            style={{ width: "90px" }}
          />
          <button
            style={iconButtonStyle}
            onClick={toggleSortDirection}
            title={`Sort Direction (${treeSortDirection === 'asc' ? 'Ascending' : 'Descending'})`}
          >
            {/* Simple Arrow Indicator */}
            {treeSortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      )}
    </>
  );
};

export default ViewTreeControls; 