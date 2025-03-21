/**
 * AccumulatedViewSummary Component
 * 
 * Displays summary information for the accumulated view.
 */

import React, { useMemo } from "react";
import { Card } from "../common";
import { theme } from "../../styles/theme";
import { Recipe, Item } from "../../types/core";

export interface GroupedItem {
  itemId: string;
  amount: number;
  recipes: Recipe[];
  selectedRecipeId?: string;
  isByproduct: boolean;
  nodeIds: string[];
  name?: string;
  depth: number;
  normalizedMachineCount: number;
  isImport: boolean;
}

export interface AccumulatedViewSummaryProps {
  /**
   * Grouped items in the accumulated view
   */
  groupedItems: GroupedItem[];
  
  /**
   * Filters applied to the view
   */
  filters: {
    showByproducts: boolean;
    showRawMaterials: boolean;
    showIntermediates: boolean;
    showMachines: boolean;
  };
  
  /**
   * Map of items by ID
   */
  itemsMap: Record<string, Item>;
}

/**
 * Component for displaying summary information for the accumulated view
 */
const AccumulatedViewSummary: React.FC<AccumulatedViewSummaryProps> = ({
  groupedItems,
  filters,
  itemsMap,
}) => {
  // Calculate summary statistics
  const summary = useMemo(() => {
    // Initialize counters
    let totalItems = 0;
    let totalByproducts = 0;
    let totalRawMaterials = 0;
    let totalIntermediates = 0;
    let totalMachines = 0;
    
    // Count items by type
    groupedItems.forEach(item => {
      // Skip items that don't pass filters
      if (item.isByproduct && !filters.showByproducts) return;
      
      // Determine if it's a raw material (no recipe)
      const isRawMaterial = !item.recipes || item.recipes.length === 0;
      if (isRawMaterial && !filters.showRawMaterials) return;
      
      // Determine if it's an intermediate product
      const isIntermediate = !item.isByproduct && !isRawMaterial;
      if (isIntermediate && !filters.showIntermediates) return;
      
      // Count by type
      totalItems++;
      if (item.isByproduct) totalByproducts++;
      else if (isRawMaterial) totalRawMaterials++;
      else if (isIntermediate) totalIntermediates++;
      
      // Count machines
      if (filters.showMachines) {
        totalMachines += item.normalizedMachineCount;
      }
    });
    
    return {
      totalItems,
      totalByproducts,
      totalRawMaterials,
      totalIntermediates,
      totalMachines: Math.ceil(totalMachines),
    };
  }, [groupedItems, filters]);
  
  // Style for summary item
  const summaryItemStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    flex: 1,
    minWidth: "120px",
    textAlign: "center",
  };
  
  // Style for summary value
  const valueStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "4px",
  };
  
  // Style for summary label
  const labelStyle: React.CSSProperties = {
    fontSize: "14px",
    color: theme.colors.textSecondary,
  };
  
  return (
    <Card
      className="accumulated-view-summary"
      variant="outlined"
      style={{
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-around",
          gap: "8px",
        }}
      >
        {/* Total items */}
        <div style={summaryItemStyle}>
          <div style={valueStyle}>{summary.totalItems}</div>
          <div style={labelStyle}>Total Items</div>
        </div>
        
        {/* Raw materials */}
        {filters.showRawMaterials && (
          <div style={summaryItemStyle}>
            <div style={{ ...valueStyle, color: theme.colors.nodeRaw }}>{summary.totalRawMaterials}</div>
            <div style={labelStyle}>Raw Materials</div>
          </div>
        )}
        
        {/* Intermediates */}
        {filters.showIntermediates && (
          <div style={summaryItemStyle}>
            <div style={{ ...valueStyle, color: theme.colors.nodeDefault }}>{summary.totalIntermediates}</div>
            <div style={labelStyle}>Intermediates</div>
          </div>
        )}
        
        {/* Byproducts */}
        {filters.showByproducts && (
          <div style={summaryItemStyle}>
            <div style={{ ...valueStyle, color: theme.colors.nodeByproduct }}>{summary.totalByproducts}</div>
            <div style={labelStyle}>Byproducts</div>
          </div>
        )}
        
        {/* Machines */}
        {filters.showMachines && (
          <div style={summaryItemStyle}>
            <div style={{ ...valueStyle, color: theme.colors.machine }}>{summary.totalMachines}</div>
            <div style={labelStyle}>Total Machines</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default React.memo(AccumulatedViewSummary); 