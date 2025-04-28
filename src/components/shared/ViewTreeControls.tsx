import React from 'react';
// Removed unused ViewModeSwitch
import StyledSelect from './StyledSelect';
import { theme } from '../../styles/theme';
// Remove unused Icon import
// import Icon from '../Icon';
// Import shared types
import { TreeSortKey, SortDirection } from '../../features/factory-planner/hooks/useFactoryPlanner';

// Remove ViewMode type
// type ViewMode = "accumulated" | "tree";

interface ViewTreeControlsProps {
  // Remove viewMode props
  // viewMode: ViewMode;
  // onViewModeChange: (mode: ViewMode) => void;
  onExpandCollapseAll: (expand: boolean) => void;
  treeSortKey: TreeSortKey;
  onTreeSortKeyChange: (key: TreeSortKey) => void;
  treeSortDirection: SortDirection;
  onTreeSortDirectionChange: (direction: SortDirection) => void;
}

// Update options to match imported type
const sortByKeyOptions: { id: TreeSortKey; name: string }[] = [
  { id: 'originalDepth', name: 'Hierarchy' },
  { id: 'name', name: 'Name' },
  { id: 'amount', name: 'Amount' },
  { id: 'nominalRate', name: 'Rate' }, // Use correct key
];

const ViewTreeControls: React.FC<ViewTreeControlsProps> = ({
  // Remove viewMode props from destructuring
  // viewMode,
  // onViewModeChange,
  onExpandCollapseAll,
  treeSortKey,
  onTreeSortKeyChange,
  treeSortDirection,
  onTreeSortDirectionChange,
}) => {

  // Remove unused handler
  // const handleDepthChange = () => {};

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

  const selectStyle: React.CSSProperties = {
    width: '90px',
  };

  return (
    // Return the div directly
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

          {/* Sort Controls */}
          <StyledSelect
        options={sortByKeyOptions}
            value={treeSortKey}
        onChange={(val) => onTreeSortKeyChange(val as TreeSortKey)}
            variant="compact"
        style={selectStyle}
          />
          <button
            style={iconButtonStyle}
        onClick={toggleSortDirection} // Use the toggle handler
            title={`Sort Direction (${treeSortDirection === 'asc' ? 'Ascending' : 'Descending'})`}
          >
            {treeSortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
  );
};

export default ViewTreeControls; 