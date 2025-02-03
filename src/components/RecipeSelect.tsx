import React, { useState, useRef, useEffect } from "react";
import { Recipe } from "../data/dexieDB";
import { theme } from '../styles/theme';
import DropdownPortal from './DropdownPortal';
import { recipeSelectStyles } from "../styles/recipeSelectStyles";

interface RecipeSelectProps {
  recipes: Recipe[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const RecipeSelect: React.FC<RecipeSelectProps> = ({ 
  recipes, 
  value, 
  onChange, 
  placeholder = "Select a Recipe",
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const selectedRecipe = recipes.find(recipe => recipe.id === value);

  return (
    <div style={{ ...recipeSelectStyles.selectContainer, ...style }} ref={buttonRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={recipeSelectStyles.customSelect}
      >
        {selectedRecipe ? selectedRecipe.name : placeholder}
      </div>

      <DropdownPortal
        anchorEl={buttonRef.current}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={recipeSelectStyles.dropdown}
        >
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={(e) => {
                e.stopPropagation();
                onChange(recipe.id);
                setIsOpen(false);
              }}
              style={{
                ...recipeSelectStyles.dropdownItem,
                ...(recipe.id === value ? recipeSelectStyles.dropdownItemSelected : {}),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.dropdown.hoverBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 
                  recipe.id === value ? 
                    theme.colors.dropdown.hoverBackground : 
                    'transparent';
              }}
            >
              {recipe.name}
            </div>
          ))}
        </div>
      </DropdownPortal>
    </div>
  );
};

export default RecipeSelect;
