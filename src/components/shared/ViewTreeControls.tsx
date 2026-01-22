import React from 'react';
import StyledSelect from './StyledSelect';
import { theme } from '../../styles/theme';
import { TreeSortKey, SortDirection } from '../../features/factory-planner/hooks/useFactoryPlanner';
import { ViewDensity } from '../../features/factory-planner/hooks/usePlannerDisplayOptions';

interface ViewTreeControlsProps {
  onExpandCollapseAll: (expand: boolean) => void;
  treeSortKey: TreeSortKey;
  onTreeSortKeyChange: (key: TreeSortKey) => void;
  treeSortDirection: SortDirection;
  onTreeSortDirectionChange: (direction: SortDirection) => void;
  viewDensity: ViewDensity;
  setViewDensity: (density: ViewDensity) => void;
  showHiddenNodes: boolean;
  onShowHiddenNodesChange: (show: boolean) => void;
}

const sortByKeyOptions: { id: TreeSortKey; name: string }[] = [
  { id: 'originalDepth', name: 'Hierarchy' },
  { id: 'name', name: 'Name' },
  { id: 'amount', name: 'Amount' },
  { id: 'nominalRate', name: 'Rate' },
  { id: 'Manual', name: 'Manual' },
];

const ViewTreeControls: React.FC<ViewTreeControlsProps> = ({
  onExpandCollapseAll,
  treeSortKey,
  onTreeSortKeyChange,
  treeSortDirection,
  onTreeSortDirectionChange,
  viewDensity,
  setViewDensity,
  showHiddenNodes,
  onShowHiddenNodesChange,
}) => {

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
    transition: 'background-color 0.2s ease',
  };

  const activeIconButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    backgroundColor: theme.colors.primary,
    color: theme.colors.buttonText,
  };

  const selectStyle: React.CSSProperties = {
    width: '90px',
  };

  return (
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

          {/* Density Toggle Buttons */}
          <button
            style={viewDensity === 'relaxed' ? activeIconButtonStyle : iconButtonStyle}
            onClick={() => setViewDensity('relaxed')}
            title="Relaxed View"
          >
            <span>☐</span>
          </button>
          <button
            style={viewDensity === 'compact' ? activeIconButtonStyle : iconButtonStyle}
            onClick={() => setViewDensity('compact')}
            title="Compact View"
          >
            <span>≡</span>
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
            onClick={toggleSortDirection}
            title={`Sort Direction (${treeSortDirection === 'asc' ? 'Ascending' : 'Descending'})`}
          >
            {treeSortDirection === 'asc' ? '↑' : '↓'}
          </button>

          {/* Show Hidden Nodes Toggle */}
          <button
            style={showHiddenNodes ? activeIconButtonStyle : iconButtonStyle}
            onClick={() => onShowHiddenNodesChange(!showHiddenNodes)}
            title={showHiddenNodes ? "Showing hidden chains" : "Hidden chains not shown"}
          >
            <span>{showHiddenNodes ? '👁' : '⌣'}</span>
          </button>
        </div>
  );
};

export default ViewTreeControls; 