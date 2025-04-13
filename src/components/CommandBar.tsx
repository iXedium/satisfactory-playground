import React, { ForwardRefRenderFunction, useState, useRef, useEffect, forwardRef } from "react";
import { Item, Recipe } from "../types";
import ViewModeSwitch from './ViewModeSwitch'; 
import StyledSelect from "./shared/StyledSelect";
import { theme } from "../styles/theme";
import StyledCheckbox from "./shared/StyledCheckbox";
import Icon from "./Icon";
import ChainCreatorControls from "./shared/ChainCreatorControls";
import SettingsMenu from "./shared/SettingsMenu";
import ViewTreeControls from "./shared/ViewTreeControls";
import PlannerActions from "./shared/PlannerActions";

type ViewMode = "accumulated" | "tree";

interface CommandBarProps {
  items: Item[];
  selectedItem: string;
  onItemSelect: (itemId: string) => void;
  selectedRecipe: string;
  onRecipeSelect: (recipeId: string) => void;
  onCalculate: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExpandCollapseAll: (expand: boolean) => void;
  showExtensions: boolean;
  onShowExtensionsChange: (show: boolean) => void;
  accumulateExtensions: boolean;
  onAccumulateExtensionsChange: (accumulate: boolean) => void;
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
  isAddItemCollapsed: boolean;
  onAddItemCollapsedChange: (collapsed: boolean) => void;
  onClearSavedData: () => void;
  recentItems?: string[];
  updateRecentItems?: (itemId: string) => void;
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
    viewMode,
    onViewModeChange,
    onExpandCollapseAll,
    showExtensions,
    onShowExtensionsChange,
    accumulateExtensions,
    onAccumulateExtensionsChange,
    showMachines,
    onShowMachinesChange,
    showMachineMultiplier,
    onShowMachineMultiplierChange,
    isAddItemCollapsed,
    onAddItemCollapsedChange,
    onClearSavedData,
    recentItems = [],
    updateRecentItems
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
    console.log("Search term:", term); // Implement actual search logic
  };

  return (
    <div ref={ref} style={commandBarStyle}>
      {/* Main Toolbar Row */}
      <div style={rowStyle}>
        <ViewTreeControls 
           viewMode={viewMode}
           onViewModeChange={onViewModeChange}
           onExpandCollapseAll={onExpandCollapseAll}
        />
        
        {/* --- Render PlannerActions --- */}
        <PlannerActions 
          onSearchChange={handleSearchChange} // Pass placeholder or real handler
          onClearSavedData={onClearSavedData}
          // Pass settings props down
          showExtensions={showExtensions}
          onShowExtensionsChange={onShowExtensionsChange}
          accumulateExtensions={accumulateExtensions}
          onAccumulateExtensionsChange={onAccumulateExtensionsChange}
          showMachines={showMachines}
          onShowMachinesChange={onShowMachinesChange}
          showMachineMultiplier={showMachineMultiplier}
          onShowMachineMultiplierChange={onShowMachineMultiplierChange}
        />
      </div>

      {/* Chain Creator Controls */}
      <ChainCreatorControls 
        items={items}
        selectedItem={selectedItem}
        onItemSelect={onItemSelect}
        selectedRecipe={selectedRecipe}
        onRecipeSelect={onRecipeSelect}
        onCalculate={onCalculate}
        recentItems={recentItems}
        updateRecentItems={updateRecentItems}
        isCollapsed={isAddItemCollapsed}
        onToggleCollapse={toggleItemSection}
      />

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