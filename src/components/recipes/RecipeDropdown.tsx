/**
 * RecipeDropdown Component
 * 
 * Dropdown component for selecting recipes with search functionality.
 */

import React, { useRef, useState } from "react";
import { Recipe } from "../../types/core";
import RecipeOption from "./RecipeOption";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

export interface RecipeDropdownProps {
  /**
   * Array of recipes to display
   */
  recipes: Recipe[];
  
  /**
   * ID of the currently selected recipe
   */
  selectedRecipeId?: string;
  
  /**
   * Callback fired when a recipe is selected
   */
  onSelect: (recipeId: string) => void;
  
  /**
   * Current search term
   */
  searchTerm: string;
  
  /**
   * Callback fired when search term changes
   */
  onSearchChange: (term: string) => void;
  
  /**
   * Whether the dropdown is in a loading state
   */
  isLoading?: boolean;
  
  /**
   * Whether the dropdown is disabled
   */
  disabled?: boolean;
  
  /**
   * Placeholder text when no recipe is selected
   */
  placeholder?: string;
  
  /**
   * Size of the dropdown
   */
  size?: "small" | "medium" | "large";
}

/**
 * RecipeDropdown component for selecting a recipe from a dropdown list
 */
const RecipeDropdown: React.FC<RecipeDropdownProps> = ({
  recipes,
  selectedRecipeId,
  onSelect,
  searchTerm,
  onSearchChange,
  isLoading = false,
  disabled = false,
  placeholder = "Select a Recipe",
  size = "medium",
}) => {
  // Dropdown open state
  const [isOpen, setIsOpen] = useState(false);
  
  // Ref for handling click outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Find selected recipe
  const selectedRecipe = recipes.find(recipe => recipe.id === selectedRecipeId);
  
  // Close dropdown when clicking outside
  useOnClickOutside(dropdownRef, () => setIsOpen(false));
  
  // Toggle dropdown state
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(prevState => !prevState);
    }
  };
  
  // Handle recipe selection
  const handleRecipeSelect = (recipeId: string) => {
    onSelect(recipeId);
    setIsOpen(false);
  };
  
  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };
  
  // Determine sizing classes
  const getSizeClass = () => {
    switch (size) {
      case "small": return "recipe-dropdown--small";
      case "large": return "recipe-dropdown--large";
      default: return "recipe-dropdown--medium";
    }
  };
  
  return (
    <div 
      ref={dropdownRef}
      className={`recipe-dropdown ${getSizeClass()} ${disabled ? 'recipe-dropdown--disabled' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Dropdown trigger */}
      <div 
        className="recipe-dropdown__trigger"
        onClick={toggleDropdown}
        style={{
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span>
          {selectedRecipe ? selectedRecipe.name : placeholder}
        </span>
        <span>▼</span>
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="recipe-dropdown__menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginTop: '4px',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {/* Search input */}
          <div 
            className="recipe-dropdown__search"
            style={{
              padding: '8px',
              borderBottom: '1px solid #eee',
              position: 'sticky',
              top: 0,
              backgroundColor: '#fff',
            }}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchInputChange}
              placeholder="Search recipes..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>
          
          {/* Loading state */}
          {isLoading && (
            <div 
              className="recipe-dropdown__loading"
              style={{
                padding: '12px',
                textAlign: 'center',
                color: '#888',
              }}
            >
              Loading recipes...
            </div>
          )}
          
          {/* Recipe options */}
          {!isLoading && recipes.length === 0 && (
            <div 
              className="recipe-dropdown__empty"
              style={{
                padding: '12px',
                textAlign: 'center',
                color: '#888',
              }}
            >
              No recipes found
            </div>
          )}
          
          {!isLoading && recipes.length > 0 && (
            <div className="recipe-dropdown__options">
              {recipes.map(recipe => (
                <RecipeOption
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={recipe.id === selectedRecipeId}
                  onSelect={() => handleRecipeSelect(recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(RecipeDropdown); 