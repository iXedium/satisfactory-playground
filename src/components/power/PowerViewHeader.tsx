/**
 * PowerViewHeader Component
 * 
 * Header for the power view with search and sorting controls.
 */

import React from "react";
import { Input, Select } from "../common";
import { theme } from "../../styles/theme";

export interface PowerViewHeaderProps {
  /**
   * Current search term
   */
  searchTerm: string;
  
  /**
   * Callback when search term changes
   */
  onSearchChange: (term: string) => void;
  
  /**
   * Current sort field
   */
  sortBy: "name" | "powerConsumption" | "efficiency";
  
  /**
   * Callback when sort field changes
   */
  onSortByChange: (field: "name" | "powerConsumption" | "efficiency") => void;
  
  /**
   * Current sort direction
   */
  sortDirection: "asc" | "desc";
  
  /**
   * Callback when sort direction changes
   */
  onSortDirectionChange: (direction: "asc" | "desc") => void;
}

/**
 * Header component for the power view
 */
const PowerViewHeader: React.FC<PowerViewHeaderProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
}) => {
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };
  
  // Handle sort field change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortByChange(e.target.value as "name" | "powerConsumption" | "efficiency");
  };
  
  // Handle sort direction change
  const handleDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortDirectionChange(e.target.value as "asc" | "desc");
  };
  
  // Sort options
  const sortOptions = [
    { value: "name", label: "Machine Name" },
    { value: "powerConsumption", label: "Power Consumption" },
    { value: "efficiency", label: "Efficiency" },
  ];
  
  // Direction options
  const directionOptions = [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
  ];
  
  return (
    <div 
      className="power-view-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "16px",
        padding: "12px",
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.border.radius,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* Search input */}
      <div 
        className="power-view-header__search"
        style={{
          width: "100%",
        }}
      >
        <Input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search machines..."
          fullWidth
          leftIcon="search"
        />
      </div>
      
      {/* Sort controls */}
      <div 
        className="power-view-header__sort"
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "120px" }}>
          <Select
            label="Sort By"
            options={sortOptions}
            value={sortBy}
            onChange={handleSortChange}
            size="small"
          />
        </div>
        
        <div style={{ flex: 1, minWidth: "120px" }}>
          <Select
            label="Direction"
            options={directionOptions}
            value={sortDirection}
            onChange={handleDirectionChange}
            size="small"
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(PowerViewHeader); 