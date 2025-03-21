/**
 * AccumulatedViewFilters Component
 * 
 * Filter controls for the accumulated view to show/hide different types of items.
 */

import React from "react";
import { theme } from "../../styles/theme";

export interface AccumulatedViewFiltersProps {
  /**
   * Whether to show byproducts
   */
  showByproducts: boolean;
  
  /**
   * Callback when byproducts filter changes
   */
  onShowByproductsChange: (show: boolean) => void;
  
  /**
   * Whether to show raw materials
   */
  showRawMaterials: boolean;
  
  /**
   * Callback when raw materials filter changes
   */
  onShowRawMaterialsChange: (show: boolean) => void;
  
  /**
   * Whether to show intermediate products
   */
  showIntermediates: boolean;
  
  /**
   * Callback when intermediates filter changes
   */
  onShowIntermediatesChange: (show: boolean) => void;
  
  /**
   * Whether to show machines
   */
  showMachines: boolean;
  
  /**
   * Callback when machines filter changes
   */
  onShowMachinesChange: (show: boolean) => void;
  
  /**
   * Whether to show extensions
   */
  showExtensions: boolean;
  
  /**
   * Callback when extensions filter changes
   */
  onShowExtensionsChange: (show: boolean) => void;
  
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
 * Filter component for the accumulated view
 */
const AccumulatedViewFilters: React.FC<AccumulatedViewFiltersProps> = ({
  showByproducts,
  onShowByproductsChange,
  showRawMaterials,
  onShowRawMaterialsChange,
  showIntermediates,
  onShowIntermediatesChange,
  showMachines,
  onShowMachinesChange,
  showExtensions,
  onShowExtensionsChange,
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
      className="accumulated-view-filters"
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
        className="accumulated-view-filters__label"
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
      
      {/* Byproducts filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showByproducts ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showByproducts, onShowByproductsChange)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.nodeByproduct,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Byproducts
      </div>
      
      {/* Raw materials filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showRawMaterials ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showRawMaterials, onShowRawMaterialsChange)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.nodeRaw,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Raw Materials
      </div>
      
      {/* Intermediates filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showIntermediates ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showIntermediates, onShowIntermediatesChange)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.nodeDefault,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Intermediates
      </div>
      
      {/* Machines filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showMachines ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showMachines, onShowMachinesChange)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.machine,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Machines
      </div>
      
      {/* Extensions filter */}
      <div
        style={{
          ...filterItemStyle,
          ...(showExtensions ? activeFilterStyle : {}),
        }}
        onClick={createToggleHandler(showExtensions, onShowExtensionsChange)}
      >
        <span style={{ 
          width: "10px", 
          height: "10px", 
          backgroundColor: theme.colors.extension,
          borderRadius: "50%",
          display: "inline-block",
          marginRight: "6px",
        }}></span>
        Extensions
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

export default React.memo(AccumulatedViewFilters); 