/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { ForwardRefRenderFunction, useState, useRef, useEffect, forwardRef } from "react";
import { Item, Recipe } from "../types";
import StyledSelect from "./shared/StyledSelect";
import { theme } from "../styles/theme";
import StyledCheckbox from "./shared/StyledCheckbox";
import Icon from "./Icon";
import ChainCreatorControls from "./shared/ChainCreatorControls";
import SettingsMenu from "./shared/SettingsMenu";
import ViewTreeControls from "./shared/ViewTreeControls";
import PlannerActions from "./shared/PlannerActions";
// Import the exported types
import { 
  TreeSortKey, 
  SortDirection 
} from "../features/factory-planner/hooks/useFactoryPlanner";
// Import ViewDensity type
import { ViewDensity } from "../features/factory-planner/hooks/usePlannerDisplayOptions";

// Remove local type definitions
// type TreeSortKey = 'default' | 'amount' | 'name'; 
// type SortDirection = 'asc' | 'desc';

interface CommandBarProps {
  items: Item[];
  selectedItem: string;
  onItemSelect: (itemId: string) => void;
  selectedRecipe: string;
  onRecipeSelect: (recipeId: string) => void;
  onCalculate: () => void;
  onExpandCollapseAll: (expand: boolean) => void;
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
  isAddItemCollapsed: boolean;
  onAddItemCollapsedChange: (collapsed: boolean) => void;
  onClearSavedData: () => void;
  recentItems?: string[];
  updateRecentItems?: (itemId: string) => void;
  removeRecentItem: (itemId: string) => void;
  autoImport: boolean;
  onAutoImportChange: (value: boolean) => void;
  // --- Use imported types for Sort Props ---
  treeSortKey: TreeSortKey;
  onTreeSortKeyChange: (key: TreeSortKey) => void;
  treeSortDirection: SortDirection;
  onTreeSortDirectionChange: (direction: SortDirection) => void;
  // -----------------------------------------
  
  // --- Add Summary Sidebar Props ---
  isSummaryVisible: boolean;
  onToggleSummary: () => void;
  // ---------------------------------
  
  // Add density props
  viewDensity: ViewDensity;
  setViewDensity: (density: ViewDensity) => void;
}

/**
 * The refactored command bar component
 */
const CommandBar: ForwardRefRenderFunction<HTMLDivElement, CommandBarProps> = (
  {
    items,
    selectedItem,
    onItemSelect,
    selectedRecipe,
    onRecipeSelect,
    onCalculate,
    onExpandCollapseAll,
    showMachines,
    onShowMachinesChange,
    showMachineMultiplier,
    onShowMachineMultiplierChange,
    isAddItemCollapsed,
    onAddItemCollapsedChange,
    onClearSavedData,
    recentItems = [],
    updateRecentItems,
    removeRecentItem,
    autoImport,
    onAutoImportChange,
    // --- Destructure Sort Props ---
    treeSortKey,
    onTreeSortKeyChange,
    treeSortDirection,
    onTreeSortDirectionChange,
    // -----------------------------
    // --- Destructure Summary Props ---
    isSummaryVisible,
    onToggleSummary,
    // ------------------------------
    // Destructure density props
    viewDensity,
    setViewDensity,
  },
  ref
) => {
  const toggleItemSection = () => {
    onAddItemCollapsedChange(!isAddItemCollapsed);
  };

  // Styles
  const commandBarStyle: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    padding: "8px 12px",
    borderBottom: `1px solid ${theme.colors.dropdown.border}`,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    borderRadius: theme.border.radius,
    width: "100%",
    boxSizing: "border-box",
    position: "relative",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
  };

  // Placeholder search handler to pass down
  const handleSearchChange = (term: string) => {
    //  // Implement actual search logic
  };

  return (
    <div ref={ref} style={commandBarStyle}>
      {/* Main Toolbar Row */}
      <div style={rowStyle}>
        <ViewTreeControls 
           onExpandCollapseAll={onExpandCollapseAll}
           treeSortKey={treeSortKey}
           onTreeSortKeyChange={onTreeSortKeyChange}
           treeSortDirection={treeSortDirection}
           onTreeSortDirectionChange={onTreeSortDirectionChange}
           // Pass density props down
           viewDensity={viewDensity}
           setViewDensity={setViewDensity}
        />
        
        {/* --- Render PlannerActions --- */}
        <PlannerActions 
          onSearchChange={handleSearchChange} // Pass placeholder or real handler
          onClearSavedData={onClearSavedData}
          // Pass settings props down
          showMachines={showMachines}
          onShowMachinesChange={onShowMachinesChange}
          showMachineMultiplier={showMachineMultiplier}
          onShowMachineMultiplierChange={onShowMachineMultiplierChange}
          autoImport={autoImport}
          onAutoImportChange={onAutoImportChange}
          // Pass summary props down
          isSummaryVisible={isSummaryVisible}
          onToggleSummary={onToggleSummary}
        />
      </div>

      {/* Chain Creator Controls - Conditionally Rendered */}
      {!isAddItemCollapsed && (
      <ChainCreatorControls 
        items={items}
        selectedItem={selectedItem}
        onItemSelect={onItemSelect}
        selectedRecipe={selectedRecipe}
        onRecipeSelect={onRecipeSelect}
        onCalculate={onCalculate}
        recentItems={recentItems}
        isCollapsed={isAddItemCollapsed}
        onRemoveRecentItem={removeRecentItem}
      />
      )}

      {/* Toggle button for collapsing/expanding item section */}
      <div 
        style={{
          position: 'absolute',
          bottom: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'pointer',
          backgroundColor: theme.colors.dark,
          borderRadius: '0 0 4px 4px',
          padding: '1px 8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          zIndex: 1001,
          border: `1px solid ${theme.colors.dropdown.border}`,
          borderTop: 'none',
          fontSize: '10px',
        }}
        onClick={toggleItemSection}
      >
        <span style={{ color: theme.colors.text }}>
          {isAddItemCollapsed ? '▼' : '▲'}
        </span>
      </div>
    </div>
  );
};

export default forwardRef(CommandBar); 