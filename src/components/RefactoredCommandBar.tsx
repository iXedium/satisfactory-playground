import React, { forwardRef, ForwardRefRenderFunction, useState, useRef } from "react";
import { Item } from "../data/dexieDB";
import SearchSection from "./shared/SearchSection";
import ViewOptionsPanel from "./shared/ViewOptionsPanel";
import SettingsPanel from "./shared/SettingsPanel";
import ViewModeToggle from "./shared/ViewModeToggle";
import { theme } from "../styles/theme";

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
}

/**
 * The refactored command bar component that uses smaller shared components
 */
const RefactoredCommandBar: ForwardRefRenderFunction<HTMLDivElement, CommandBarProps> = (
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
    onClearSavedData
  },
  ref
) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [compactView, setCompactView] = useState(false);
  const [selectedDepth, setSelectedDepth] = useState("0");

  // Styles matching the original CommandBar
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

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 8px",
    borderRight: `1px solid ${theme.colors.dropdown.border}`,
  };

  const lastSectionStyle: React.CSSProperties = {
    ...sectionStyle,
    borderRight: "none",
  };

  const iconButtonStyle: React.CSSProperties = {
    padding: "4px",
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    color: theme.colors.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    fontSize: "14px",
  };

  return (
    <div ref={ref} style={commandBarStyle}>
      {/* Main Toolbar Row */}
      <div style={rowStyle}>
        {/* View Mode Toggle */}
        <div style={sectionStyle}>
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </div>
        
        {/* Tree Controls */}
        <div style={sectionStyle}>
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
          
          <ViewOptionsPanel
            compactView={compactView}
            onCompactViewChange={setCompactView}
            selectedDepth={selectedDepth}
            onDepthChange={setSelectedDepth}
            containerStyle={{ marginLeft: '8px' }}
          />
        </div>
        
        {/* Settings and Actions */}
        <div style={lastSectionStyle}>
          <button 
            ref={settingsButtonRef}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={iconButtonStyle}
            title="Settings"
          >
            <span>⚙️</span>
          </button>
          
          {onClearSavedData && (
            <button
              style={iconButtonStyle}
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
                  onClearSavedData();
                }
              }}
              title="Clear Saved Data"
            >
              <span>🗑️</span>
            </button>
          )}
          
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            buttonRef={settingsButtonRef as React.RefObject<HTMLButtonElement>}
            showExtensions={showExtensions}
            onShowExtensionsChange={onShowExtensionsChange}
            accumulateExtensions={accumulateExtensions}
            onAccumulateExtensionsChange={onAccumulateExtensionsChange}
            showMachines={showMachines}
            onShowMachinesChange={onShowMachinesChange}
            showMachineMultiplier={showMachineMultiplier}
            onShowMachineMultiplierChange={onShowMachineMultiplierChange}
            compactView={compactView}
            onCompactViewChange={setCompactView}
          />
        </div>
      </div>
      
      {/* Item Selection Section */}
      <div style={{ 
        display: isAddItemCollapsed ? 'none' : 'block',
        borderTop: `1px solid ${theme.colors.dropdown.border}`,
        marginTop: '2px',
        paddingTop: '4px'
      }}>
        <SearchSection
          items={items}
          selectedItem={selectedItem}
          onItemSelect={onItemSelect}
          selectedRecipe={selectedRecipe}
          onRecipeSelect={onRecipeSelect}
          onCalculate={onCalculate}
          isCollapsed={isAddItemCollapsed}
          containerStyle={{}}
        />
      </div>
    </div>
  );
};

export default forwardRef(RefactoredCommandBar); 