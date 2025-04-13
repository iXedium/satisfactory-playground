import React from 'react';
import { theme } from '../../../styles/theme';
import StyledSelect from '../../../components/shared/StyledSelect';
import StyledCheckbox from '../../../components/shared/StyledCheckbox';

type SortKey = "name" | "amount" | "depth";
type SortDirection = "asc" | "desc";

interface AccumulatedViewControlsProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  sortBy: SortKey;
  onSortByChange: (key: SortKey) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
  showByproducts: boolean;
  onShowByproductsChange: (show: boolean) => void;
  showRawMaterials: boolean;
  onShowRawMaterialsChange: (show: boolean) => void;
  showIntermediates: boolean;
  onShowIntermediatesChange: (show: boolean) => void;
}

const sortByKeyOptions: { id: SortKey; name: string }[] = [
  { id: 'name', name: 'Name' },
  { id: 'amount', name: 'Amount' },
  { id: 'depth', name: 'Depth' },
];

const sortDirectionOptions: { id: SortDirection; name: string }[] = [
  { id: 'asc', name: 'Asc' },
  { id: 'desc', name: 'Desc' },
];

const AccumulatedViewControls: React.FC<AccumulatedViewControlsProps> = ({
  searchTerm,
  onSearchTermChange,
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
}) => {

  // Styles - kept local for now
  const controlsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    padding: '8px 4px',
    marginBottom: '8px',
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.dark, // Match background
  };

  const searchInputStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: '4px 8px',
    fontSize: '13px',
    flexGrow: 1, // Allow search to take more space
    minWidth: '150px',
  };

  const selectStyle: React.CSSProperties = {
    minWidth: '80px',
  };

  const filterGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginLeft: 'auto', // Push filters to the right
  };

  const checkboxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={controlsContainerStyle}>
      {/* Search Input */}
      <input
        type="text"
        placeholder="Filter by name..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        style={searchInputStyle}
      />

      {/* Sort Controls */}
      <StyledSelect
        options={sortByKeyOptions}
        value={sortBy}
        onChange={(val) => onSortByChange(val as SortKey)}
        variant="compact"
        style={selectStyle}
      />
      <StyledSelect
        options={sortDirectionOptions}
        value={sortDirection}
        onChange={(val) => onSortDirectionChange(val as SortDirection)}
        variant="compact"
        style={selectStyle}
      />

      {/* Filter Checkboxes */}
      <div style={filterGroupStyle}>
        <div style={checkboxStyle}>
          <StyledCheckbox 
            checked={showByproducts} 
            onChange={() => onShowByproductsChange(!showByproducts)}
            label=""
          />
          <span>Byproducts</span>
        </div>
        <div style={checkboxStyle}>
          <StyledCheckbox 
            checked={showRawMaterials} 
            onChange={() => onShowRawMaterialsChange(!showRawMaterials)}
            label=""
          />
          <span>Raw</span>
        </div>
        <div style={checkboxStyle}>
          <StyledCheckbox 
            checked={showIntermediates} 
            onChange={() => onShowIntermediatesChange(!showIntermediates)}
            label=""
          />
          <span>Intermediates</span>
        </div>
      </div>
    </div>
  );
};

export default AccumulatedViewControls; 