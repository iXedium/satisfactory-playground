import React from 'react';
import { theme } from '../../styles/theme';
import StyledCheckbox from './StyledCheckbox';

export type SortOption = 'name' | 'amount' | 'depth';
export type SortDirection = 'asc' | 'desc';

interface SortingControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: SortOption;
  onSortByChange: (option: SortOption) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
  showByproducts: boolean;
  onShowByproductsChange: (show: boolean) => void;
  showRawMaterials: boolean;
  onShowRawMaterialsChange: (show: boolean) => void;
  showIntermediates: boolean;
  onShowIntermediatesChange: (show: boolean) => void;
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  containerStyle?: React.CSSProperties;
}

const SortingControls: React.FC<SortingControlsProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  showByproducts,
  onShowByproductsChange,
  showRawMaterials,
  onShowRawMaterialsChange,
  showIntermediates,
  onShowIntermediatesChange,
  showMachines,
  onShowMachinesChange,
  containerStyle
}) => {
  const containerStyles: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    padding: '12px',
    borderRadius: theme.border.radius,
    marginBottom: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${theme.colors.dropdown.border}`,
    ...containerStyle
  };

  const sectionStyles: React.CSSProperties = {
    marginBottom: '12px'
  };

  const sectionTitleStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: '8px'
  };

  const searchInputStyles: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    backgroundColor: theme.colors.darker,
    border: `1px solid ${theme.colors.dropdown.border}`,
    color: theme.colors.text,
    borderRadius: theme.border.radius,
    fontSize: '14px',
    marginBottom: '8px'
  };

  const rowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '8px'
  };

  const buttonStyles: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    padding: '4px 8px',
    fontSize: '13px',
    color: theme.colors.text,
    cursor: 'pointer'
  };

  const activeButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    backgroundColor: theme.colors.primary,
    color: theme.colors.textLight,
    borderColor: theme.colors.primary
  };

  const checkboxContainerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '6px'
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '13px',
    color: theme.colors.text,
    marginLeft: '8px'
  };

  return (
    <div style={containerStyles}>
      {/* Search Section */}
      <div style={sectionStyles}>
        <div style={sectionTitleStyles}>Search</div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by name..."
          style={searchInputStyles}
        />
      </div>

      {/* Sort Section */}
      <div style={sectionStyles}>
        <div style={sectionTitleStyles}>Sort By</div>
        <div style={rowStyles}>
          <button
            style={sortBy === 'name' ? activeButtonStyles : buttonStyles}
            onClick={() => onSortByChange('name')}
          >
            Name
          </button>
          <button
            style={sortBy === 'amount' ? activeButtonStyles : buttonStyles}
            onClick={() => onSortByChange('amount')}
          >
            Amount
          </button>
          <button
            style={sortBy === 'depth' ? activeButtonStyles : buttonStyles}
            onClick={() => onSortByChange('depth')}
          >
            Depth
          </button>
        </div>
        <div style={rowStyles}>
          <button
            style={sortDirection === 'asc' ? activeButtonStyles : buttonStyles}
            onClick={() => onSortDirectionChange('asc')}
          >
            Ascending
          </button>
          <button
            style={sortDirection === 'desc' ? activeButtonStyles : buttonStyles}
            onClick={() => onSortDirectionChange('desc')}
          >
            Descending
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div style={sectionStyles}>
        <div style={sectionTitleStyles}>Show</div>
        <div style={checkboxContainerStyles}>
          <StyledCheckbox
            checked={showByproducts}
            onChange={() => onShowByproductsChange(!showByproducts)}
            label=""
          />
          <span style={labelStyles}>Byproducts</span>
        </div>
        <div style={checkboxContainerStyles}>
          <StyledCheckbox
            checked={showRawMaterials}
            onChange={() => onShowRawMaterialsChange(!showRawMaterials)}
            label=""
          />
          <span style={labelStyles}>Raw Materials</span>
        </div>
        <div style={checkboxContainerStyles}>
          <StyledCheckbox
            checked={showIntermediates}
            onChange={() => onShowIntermediatesChange(!showIntermediates)}
            label=""
          />
          <span style={labelStyles}>Intermediate Products</span>
        </div>
        <div style={checkboxContainerStyles}>
          <StyledCheckbox
            checked={showMachines}
            onChange={() => onShowMachinesChange(!showMachines)}
            label=""
          />
          <span style={labelStyles}>Machines</span>
        </div>
      </div>
    </div>
  );
};

export default SortingControls; 