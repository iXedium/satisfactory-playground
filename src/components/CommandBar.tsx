import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme";
import StyledSelect from "./shared/StyledSelect";
import ViewModeSwitch from "./ViewModeSwitch";
import StyledInput from "./shared/StyledInput";
import Icon from "./Icon";
import { Item, Recipe } from "../data/dexieDB";
import { getRecipesForItem } from "../data/dbQueries";
import StyledCheckbox from "./shared/StyledCheckbox";

interface CommandBarProps {
  viewMode: "tree" | "accumulated";
  onViewModeChange: (mode: "tree" | "accumulated") => void;
  items: Item[];
  selectedItem: string;
  onItemChange: (itemId: string) => void;
  selectedRecipe: string;
  onRecipeChange: (recipeId: string) => void;
  itemCount: number;
  onItemCountChange: (count: number) => void;
  onCalculate: () => void;
  onAddItemSectionToggle?: (isCollapsed: boolean) => void;
}

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
}) => {
  const [isItemSectionCollapsed, setIsItemSectionCollapsed] = useState(false);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);

  // Placeholder functions for future implementation
  const handleExpandCollapseAll = () => {};
  const handleDepthChange = () => {};
  const handleAccumulateExtensions = () => {};
  const handleToggleMachines = () => {};
  const handleSearch = () => {};
  const handleToggleCompact = () => {};
  
  // State for checkboxes
  const [accumulateExtensions, setAccumulateExtensions] = useState(false);
  const [showMachines, setShowMachines] = useState(true);
  const [compactView, setCompactView] = useState(false);
  
  // Checkbox handlers
  const toggleAccumulateExtensions = () => {
    setAccumulateExtensions(!accumulateExtensions);
    // Logic will be added later
    handleAccumulateExtensions();
  };
  
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

  // Fetch recipes when item changes
  useEffect(() => {
    if (selectedItem) {
      getRecipesForItem(selectedItem)
        .then((recipes) => {
          setFilteredRecipes(recipes);
          
          // Find the recipe with the same name as the item, or fall back to the first recipe
          if (recipes.length > 0) {
            const matchingRecipe = recipes.find(recipe => recipe.id === selectedItem);
            if (matchingRecipe) {
              onRecipeChange(matchingRecipe.id);
            } else {
              onRecipeChange(recipes[0].id);
            }
          }
        })
        .catch(error => {
          console.error(`Error fetching recipes for ${selectedItem}:`, error);
          setFilteredRecipes([]);
        });
    } else {
      setFilteredRecipes([]);
    }
  }, [selectedItem, onRecipeChange]);

  // Depth options for dropdown
  const depthOptions = [
    { id: "all", name: "All Depths" },
    { id: "1", name: "Depth 1" },
    { id: "2", name: "Depth 2" },
    { id: "3", name: "Depth 3" },
    { id: "4", name: "Depth 4" },
    { id: "5", name: "Depth 5" },
  ];

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

  // Notify parent when section is toggled
  const toggleItemSection = () => {
    const newState = !isItemSectionCollapsed;
    setIsItemSectionCollapsed(newState);
    if (onAddItemSectionToggle) {
      onAddItemSectionToggle(newState);
    }
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
            onClick={handleExpandCollapseAll}
            title="Expand or collapse all extensions"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonDefault}
          >
            Expand All
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
            checked={accumulateExtensions} 
            onChange={toggleAccumulateExtensions}
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