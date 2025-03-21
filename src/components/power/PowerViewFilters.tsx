/**
 * PowerViewFilters Component
 * 
 * Filter controls for the power view to show/hide different types of machines.
 */

import React from "react";
import { theme } from "../../styles/theme";

export interface PowerViewFiltersProps {
  /**
   * Whether to show manufacturer 1 machines
   */
  showManufacturerMk1: boolean;
  
  /**
   * Callback when manufacturer 1 filter changes
   */
  onShowManufacturerMk1Change: (show: boolean) => void;
  
  /**
   * Whether to show manufacturer 2 machines
   */
  showManufacturerMk2: boolean;
  
  /**
   * Callback when manufacturer 2 filter changes
   */
  onShowManufacturerMk2Change: (show: boolean) => void;
  
  /**
   * Whether to show manufacturer 3 machines
   */
  showManufacturerMk3: boolean;
  
  /**
   * Callback when manufacturer 3 filter changes
   */
  onShowManufacturerMk3Change: (show: boolean) => void;
  
  /**
   * Whether to show extractors
   */
  showExtractors: boolean;
  
  /**
   * Callback when extractors filter changes
   */
  onShowExtractorsChange: (show: boolean) => void;
  
  /**
   * Whether to show generators
   */
  showGenerators: boolean;
  
  /**
   * Callback when generators filter changes
   */
  onShowGeneratorsChange: (show: boolean) => void;
  
  /**
   * Whether to use compact view
   */
  compactView: boolean;
  
  /**
   * Callback when compact view changes
   */
  onCompactViewChange: (compact: boolean) => void;
}

/**
 * Filter component for the power view
 */
const PowerViewFilters: React.FC<PowerViewFiltersProps> = ({
  showManufacturerMk1,
  onShowManufacturerMk1Change,
  showManufacturerMk2,
  onShowManufacturerMk2Change,
  showManufacturerMk3,
  onShowManufacturerMk3Change,
  showExtractors,
  onShowExtractorsChange,
  showGenerators,
  onShowGeneratorsChange,
  compactView,
  onCompactViewChange,
}) => {
  // Create filter toggle handlers
  const createToggleHandler = (
    currentValue: boolean,
    onChange: (value: boolean) => void
  ) => {
    return () => onChange(!currentValue);
  };
  
  // Style for filter item
  const filterItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px",
    cursor: "pointer",
    borderRadius: theme.border.radius,
    transition: "background-color 0.15s ease",
  };
  
  // Style for active filter
  const activeFilterStyle: React.CSSProperties = {
    backgroundColor: `${theme.colors.primary}20`,
    fontWeight: "bold",
  };
  
  return (
    <div 
      className="power-view-filters"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "16px",
        padding: "12px",
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.border.radius,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div 
        className="power-view-filters__label"
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginRight: "8px",
          display: "flex",
          alignItems: "center",
        }}
      >
        Filters:
      </div>
      
      {/* Manufacturer Mk1 filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showManufacturerMk1 ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showManufacturerMk1, onShowManufacturerMk1Change)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.mk1,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Mk1 Machines
      </div>
      
      {/* Manufacturer Mk2 filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showManufacturerMk2 ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showManufacturerMk2, onShowManufacturerMk2Change)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.mk2,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Mk2 Machines
      </div>
      
      {/* Manufacturer Mk3 filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showManufacturerMk3 ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showManufacturerMk3, onShowManufacturerMk3Change)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.mk3,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Mk3 Machines
      </div>
      
      {/* Extractors filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showExtractors ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showExtractors, onShowExtractorsChange)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.extractor,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Extractors
      </div>
      
      {/* Generators filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showGenerators ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showGenerators, onShowGeneratorsChange)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.generator,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Generators
      </div>
      
      {/* View mode toggle */}
      <div
        style={{
          ...filterItemStyle,
          ...(compactView ? activeFilterStyle : {}),
          marginLeft: "auto",
        }}
        onClick={createToggleHandler(compactView, onCompactViewChange)}
      >
        {compactView ? "Compact View" : "Detailed View"}
      </div>
    </div>
  );
};

export default React.memo(PowerViewFilters); 