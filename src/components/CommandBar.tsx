import React, { useState, useEffect, forwardRef, useRef } from "react";
import ReactDOM from "react-dom";
import { theme } from "../styles/theme";
import StyledSelect from "./shared/StyledSelect";
import ViewModeSwitch from "./ViewModeSwitch";
import Icon from "./Icon";
import { Item } from "../data/dexieDB";
import { getRecipesForItem } from "../data/dbQueries";
import StyledCheckbox from "./shared/StyledCheckbox";
import { Recipe } from "../data/dexieDB";
import { SettingsModal } from "./settings";

export interface CommandBarProps {
  items: Item[];
  selectedItem: string;
  onItemSelect: (item: string) => void;
  selectedRecipe: string;
  onRecipeSelect: (recipe: string) => void;
  onCalculate: () => void;
  viewMode: "accumulated" | "tree";
  onViewModeChange: (mode: "accumulated" | "tree") => void;
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
  onClearSavedData?: () => void;
}

const depthOptions = [
  { id: "all", name: "All" },
  { id: "1", name: "1" },
  { id: "2", name: "2" },
  { id: "3", name: "3" },
  { id: "4", name: "4" },
  { id: "5", name: "5" },
];

const CommandBar = forwardRef<HTMLDivElement, CommandBarProps>(({
  viewMode,
  onViewModeChange,
  items,
  selectedItem,
  onItemSelect,
  selectedRecipe,
  onRecipeSelect,
  onCalculate,
  onExpandCollapseAll,
  onShowExtensionsChange,
  onAccumulateExtensionsChange,
  accumulateExtensions,
  onShowMachinesChange,
  showMachines,
  showMachineMultiplier,
  onShowMachineMultiplierChange,
  onAddItemCollapsedChange,
  showExtensions,
  onClearSavedData
}, ref) => {
  const [isItemSectionCollapsed, setIsItemSectionCollapsed] = useState(false);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // State for checkboxes
  const [compactView, setCompactView] = useState(false);
  
  // Placeholder functions for future implementation
  const handleDepthChange = () => {};
  const handleSearch = () => {};
  const handleToggleCompact = () => {};
  
  // Checkbox handlers
  const toggleShowMachines = () => {
    if (onShowMachinesChange) {
      onShowMachinesChange(!showMachines);
    }
  };
  
  const toggleCompactView = () => {
    setCompactView(!compactView);
    // Logic will be added later
    handleToggleCompact();
  };
  
  const toggleShowExtensions = () => {
    if (onShowExtensionsChange) {
      onShowExtensionsChange(!showExtensions);
    }
  };
  
  const toggleAccumulateExtensions = () => {
    if (onAccumulateExtensionsChange) {
      onAccumulateExtensionsChange(!accumulateExtensions);
    }
  };

  const toggleShowMachineMultiplier = () => {
    if (onShowMachineMultiplierChange) {
      onShowMachineMultiplierChange(!showMachineMultiplier);
    }
  };

  // Open settings modal
  const openSettingsModal = () => {
    setIsSettingsModalOpen(true);
  };
  
  // Close settings modal
  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };
  
  // Load recipes when selected item changes
  useEffect(() => {
    if (selectedItem) {
      getRecipesForItem(selectedItem)
        .then(recipes => {
          setFilteredRecipes(recipes);
          // Always select a default recipe when the item changes
          if (recipes.length > 0) {
            // Try to find a recipe with the same name as the item
            const selectedItemObj = items.find(i => i.id === selectedItem);
            const matchingRecipe = recipes.find(r => r.name === selectedItemObj?.name);
            
            if (matchingRecipe) {
              onRecipeSelect(matchingRecipe.id);
            } else {
              // Fall back to first recipe if no matching name found
              onRecipeSelect(recipes[0].id);
            }
          }
        })
        .catch(console.error);
    } else {
      setFilteredRecipes([]);
    }
  }, [selectedItem, onRecipeSelect, items]);
  
  // Handle item section collapse
  const toggleItemSection = () => {
    const newState = !isItemSectionCollapsed;
    setIsItemSectionCollapsed(newState);
    onAddItemCollapsedChange(newState);
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

  const buttonStyle: React.CSSProperties = {
    padding: "4px 8px",
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    color: theme.colors.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
  };

  const searchStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: "4px 8px",
    fontSize: "13px",
    width: "180px",
  };

  const settingsModalStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: theme.colors.dark,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.borderRadius,
    padding: "20px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    zIndex: 9999,
    minWidth: "200px",
    marginTop: "4px",
  };

  const settingsButtonContainerStyle: React.CSSProperties = {
    position: "relative",
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const compactCheckboxStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
  };

  return (
    <div ref={ref} style={commandBarStyle}>
      {/* Main Toolbar Row */}
      <div style={rowStyle}>
        {/* View Mode Toggle */}
        <div style={sectionStyle}>
          <ViewModeSwitch
            viewMode={viewMode}
            onChange={onViewModeChange}
            data-view-mode-switch
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
          
          <StyledSelect
            options={depthOptions}
            value="all"
            onChange={handleDepthChange}
            variant="compact"
            style={{ width: "60px" }}
          />
        </div>

        {/* Search & Actions */}
        <div style={lastSectionStyle}>
          <input
            type="text"
            placeholder="Search..."
            style={searchStyle}
            onChange={handleSearch}
          />

          {/* Settings Button */}
          <button 
            style={iconButtonStyle}
            onClick={openSettingsModal}
            title="Settings"
          >
            <span>⚙️</span>
          </button>
        </div>
      </div>

      {/* Item Selection Section - Collapsible */}
      <div style={{
        display: isItemSectionCollapsed ? 'none' : 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        padding: '4px 0',
        borderTop: `1px solid ${theme.colors.dropdown.border}`,
        marginTop: '2px',
      }}>
        {/* Item Selector */}
        <StyledSelect
          value={selectedItem}
          onChange={onItemSelect}
          options={items}
          placeholder="Select an Item"
          style={{ 
            minWidth: '150px', 
            maxWidth: '250px', 
            flex: '1 1 auto'
          }}
          renderOption={(option, isInDropdown) => (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '4px 8px',
              backgroundColor: isInDropdown && option.id === selectedItem ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
              borderRadius: theme.border.radius,
            }}>
              <Icon itemId={option.id} size="small" showWrapper={false} style={{ backgroundColor: theme.colors.dark }} />
              {option.name}
            </div>
          )}
        />
        
        {/* Recipe Selector */}
        <StyledSelect
          value={selectedRecipe}
          onChange={onRecipeSelect}
          options={filteredRecipes}
          placeholder={selectedItem ? "Select a Recipe" : "Select an item first"}
          style={{ 
            minWidth: '150px', 
            maxWidth: '250px', 
            flex: '1 1 auto',
            opacity: selectedItem ? 1 : 0.7
          }}
          disabled={!selectedItem || filteredRecipes.length === 0}
          renderOption={(option, isInDropdown) => (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '4px 8px',
                backgroundColor: isInDropdown && option.id === selectedRecipe ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
                borderRadius: theme.border.radius,
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{option.name}</span>
            </div>
          )}
        />
        
        {/* Add Button */}
        <button 
          onClick={onCalculate}
          style={{
            ...buttonStyle,
            backgroundColor: theme.colors.primary,
            color: '#fff',
            opacity: (selectedItem && selectedRecipe) ? 1 : 0.7,
          }}
          disabled={!selectedItem || !selectedRecipe}
          onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonHover)}
          onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.primary)}
        >
          Add
        </button>
      </div>

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
          {isItemSectionCollapsed ? '▼' : '▲'}
        </span>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        onSave={closeSettingsModal}
        onReset={onClearSavedData}
      />
    </div>
  );
});

export default CommandBar; 