import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme";
import StyledSelect from "./shared/StyledSelect";
import ViewModeSwitch from "./ViewModeSwitch";
import StyledInput from "./shared/StyledInput";
import Icon from "./Icon";
import { Item } from "../data/dexieDB";
import { getRecipesForItem } from "../data/dbQueries";
import StyledCheckbox from "./shared/StyledCheckbox";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { commandBarStyles } from "../styles/commandBarStyles";
import { Recipe } from "../data/dexieDB";

interface CommandBarProps {
  viewMode: "accumulated" | "tree";
  onViewModeChange: (mode: "accumulated" | "tree") => void;
  items: Item[];
  selectedItem: string;
  onItemChange: (itemId: string) => void;
  selectedRecipe: string;
  onRecipeChange: (recipeId: string) => void;
  itemCount: number;
  onItemCountChange: (count: number) => void;
  onCalculate: () => void;
  onAddItemSectionToggle: (isCollapsed: boolean) => void;
  onExpandCollapseAll?: (expand: boolean) => void;
  onShowExtensionsChange?: (show: boolean) => void;
  onAccumulateExtensionsChange?: (accumulate: boolean) => void;
  accumulateExtensions?: boolean;
}

const depthOptions = [
  { id: "all", name: "All" },
  { id: "1", name: "1" },
  { id: "2", name: "2" },
  { id: "3", name: "3" },
  { id: "4", name: "4" },
  { id: "5", name: "5" },
];

const CommandBar: React.FC<CommandBarProps> = ({
  viewMode,
  onViewModeChange,
  items,
  selectedItem,
  onItemChange,
  selectedRecipe,
  onRecipeChange,
  itemCount,
  onItemCountChange,
  onCalculate,
  onAddItemSectionToggle,
  onExpandCollapseAll,
  onShowExtensionsChange,
  onAccumulateExtensionsChange,
  accumulateExtensions = false,
}) => {
  const [isItemSectionCollapsed, setIsItemSectionCollapsed] = useState(false);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  
  // State for checkboxes
  const [showMachines, setShowMachines] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [showExtensions, setShowExtensions] = useState(true);
  const [expandAll, setExpandAll] = useState(true);
  
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const hasTree = !!dependencies.dependencyTree;
  
  // Placeholder functions for future implementation
  const handleDepthChange = () => {};
  const handleToggleMachines = () => {};
  const handleSearch = () => {};
  const handleToggleCompact = () => {};
  
  // Checkbox handlers
  const toggleShowMachines = () => {
    setShowMachines(!showMachines);
    // Logic will be added later
    handleToggleMachines();
  };
  
  const toggleCompactView = () => {
    setCompactView(!compactView);
    // Logic will be added later
    handleToggleCompact();
  };
  
  const toggleShowExtensions = () => {
    const newValue = !showExtensions;
    setShowExtensions(newValue);
    if (onShowExtensionsChange) {
      onShowExtensionsChange(newValue);
    }
  };
  
  const toggleExpandAll = () => {
    const newValue = !expandAll;
    setExpandAll(newValue);
    if (onExpandCollapseAll) {
      onExpandCollapseAll(newValue);
    }
  };

  const handleAccumulateExtensionsChange = () => {
    if (onAccumulateExtensionsChange) {
      onAccumulateExtensionsChange(!accumulateExtensions);
    }
  };

  // Load recipes when selected item changes
  useEffect(() => {
    if (selectedItem) {
      getRecipesForItem(selectedItem)
        .then(recipes => {
          setFilteredRecipes(recipes);
          // Auto-select first recipe if none selected
          if (recipes.length > 0 && !selectedRecipe) {
            onRecipeChange(recipes[0].id);
          }
        })
        .catch(console.error);
    } else {
      setFilteredRecipes([]);
    }
  }, [selectedItem, selectedRecipe, onRecipeChange]);
  
  // Handle item section collapse
  const toggleItemSection = () => {
    const newState = !isItemSectionCollapsed;
    setIsItemSectionCollapsed(newState);
    onAddItemSectionToggle(newState);
  };

  // Styles
  const commandBarStyle: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    padding: "12px 16px",
    borderBottom: `1px solid ${theme.colors.dropdown.border}`,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    borderRadius: theme.border.radius,
    width: "100%",
    boxSizing: "border-box",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "center",
  };

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 12px",
    borderRight: `1px solid ${theme.colors.dropdown.border}`,
  };

  const lastSectionStyle: React.CSSProperties = {
    ...sectionStyle,
    borderRight: "none",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    backgroundColor: theme.colors.buttonDefault,
    color: theme.colors.text,
    border: "none",
    borderRadius: theme.border.radius,
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background-color 0.2s",
  };

  const searchStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: "6px 10px",
    fontSize: "14px",
    width: "200px",
  };

  return (
    <div style={commandBarStyle}>
      {/* Row 1 - Main controls */}
      <div style={rowStyle}>
        {/* View Mode Section */}
        <div style={sectionStyle}>
          <span style={{ color: theme.colors.text, fontSize: "14px" }}>View:</span>
          <ViewModeSwitch
            viewMode={viewMode}
            onChange={onViewModeChange}
            data-view-mode-switch
          />
        </div>

        {/* Tree Controls Section */}
        <div style={sectionStyle}>
          <button 
            style={buttonStyle}
            onClick={toggleExpandAll}
            title={expandAll ? "Collapse all nodes" : "Expand all nodes"}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonDefault}
          >
            {expandAll ? "Collapse All" : "Expand All"}
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: theme.colors.text, fontSize: "14px" }}>Depth:</span>
            <StyledSelect
              options={depthOptions}
              value="all"
              onChange={handleDepthChange}
              variant="compact"
              style={{ width: "120px" }}
              renderOption={(option, isInDropdown) => (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '4px 8px',
                    backgroundColor: isInDropdown && option.id === "all" ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
                    borderRadius: theme.border.radius,
                  }}
                >
                  <span>{option.name}</span>
                </div>
              )}
            />
          </div>
        </div>

        {/* Display Options Section */}
        <div style={sectionStyle}>
          <StyledCheckbox 
            checked={showExtensions} 
            onChange={toggleShowExtensions}
            label="Show Extensions"
          />
          
          <StyledCheckbox 
            checked={accumulateExtensions} 
            onChange={handleAccumulateExtensionsChange}
            label="Accumulate Extensions"
          />
          
          <StyledCheckbox 
            checked={showMachines} 
            onChange={toggleShowMachines}
            label="Show Machines"
          />
          
          <StyledCheckbox 
            checked={compactView} 
            onChange={toggleCompactView}
            label="Compact View"
          />
        </div>

        {/* Search and Additional Controls Section */}
        <div style={lastSectionStyle}>
          <input
            type="text"
            placeholder="Search items..."
            style={searchStyle}
            onChange={handleSearch}
          />
          
          <button 
            style={buttonStyle} 
            disabled
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonHover)}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonDefault)}
          >
            Save
          </button>
          <button 
            style={buttonStyle} 
            disabled
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonHover)}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonDefault)}
          >
            Load
          </button>
          <button 
            style={buttonStyle} 
            disabled
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonHover)}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = theme.colors.buttonDefault)}
          >
            Compare
          </button>
        </div>
      </div>

      {/* Item Selection Section - Collapsible */}
      <div style={{
        display: isItemSectionCollapsed ? 'none' : 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        padding: '8px 0',
        borderTop: `1px solid ${theme.colors.dropdown.border}`,
        marginTop: '4px',
      }}>
        {/* Item Selector */}
        <StyledSelect
          value={selectedItem}
          onChange={onItemChange}
          options={items}
          placeholder="Select an Item"
          style={{ 
            minWidth: '180px', 
            maxWidth: '300px', 
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
          onChange={onRecipeChange}
          options={filteredRecipes}
          placeholder={selectedItem ? "Select a Recipe" : "Select an item first"}
          style={{ 
            minWidth: '180px', 
            maxWidth: '300px', 
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
        
        {/* Item Count */}
        <StyledInput
          type="number"
          min="1"
          value={itemCount}
          onChange={(e) => onItemCountChange(Number(e.target.value))}
          placeholder="Count"
          style={{ 
            width: '120px',
            minWidth: '80px',
            flex: '0 1 auto'
          }}
        />
        
        {/* Add Button */}
        <button
          onClick={onCalculate}
          disabled={!selectedItem || !selectedRecipe}
          style={{
            height: '44px',
            padding: '0 24px',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: theme.border.radius,
            background: (!selectedItem || !selectedRecipe) ? theme.colors.darker : theme.colors.buttonDefault,
            color: (!selectedItem || !selectedRecipe) ? theme.colors.textSecondary : theme.colors.text,
            border: 'none',
            cursor: (!selectedItem || !selectedRecipe) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            whiteSpace: 'nowrap',
            marginRight: '16px'
          }}
          onMouseEnter={(e) => {
            if (selectedItem && selectedRecipe) {
              e.currentTarget.style.backgroundColor = theme.colors.buttonHover;
            }
          }}
          onMouseLeave={(e) => {
            if (selectedItem && selectedRecipe) {
              e.currentTarget.style.backgroundColor = theme.colors.buttonDefault;
            }
          }}
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
          padding: '2px 12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          zIndex: 1001,
          border: `1px solid ${theme.colors.dropdown.border}`,
          borderTop: 'none',
        }}
        onClick={toggleItemSection}
      >
        <span style={{ color: theme.colors.text, fontSize: '12px' }}>
          {isItemSectionCollapsed ? '▼ Show Add Item' : '▲ Hide Add Item'}
        </span>
      </div>
    </div>
  );
};

export default CommandBar; 