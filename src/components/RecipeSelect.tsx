import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Recipe } from "../data/dexieDB";
import { recipeSelectStyles } from "../styles/recipeSelectStyles";
import { theme } from '../styles/theme';
import DropdownPortal from './DropdownPortal';

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
    <div style={{ position: 'relative', ...style }} ref={buttonRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();  // Stop event from reaching tree
          setIsOpen(!isOpen);
        }}
        style={{
          padding: theme.spacing.padding,
          border: `1px solid ${theme.colors.dropdown.border}`,
          borderRadius: theme.border.radius,
          cursor: 'pointer',
          backgroundColor: theme.colors.dropdown.background,
          color: theme.colors.dropdown.text,
        }}
      >
        {selectedRecipe ? selectedRecipe.name : placeholder}
      </div>

      <DropdownPortal
        anchorEl={buttonRef.current}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div 
          onClick={(e) => e.stopPropagation()}  // Stop event from reaching tree
          style={{
          backgroundColor: theme.colors.dropdown.background,
          border: `1px solid ${theme.colors.dropdown.border}`,
          borderRadius: theme.border.radius,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={(e) => {
                e.stopPropagation();  // Stop event from reaching tree
                onChange(recipe.id);
                setIsOpen(false);
              }}
              style={{
                padding: theme.spacing.padding,
                cursor: 'pointer',
                backgroundColor: recipe.id === value ? theme.colors.dropdown.hoverBackground : 'transparent',
                color: theme.colors.dropdown.text,
                '&:hover': {
                  backgroundColor: theme.colors.dropdown.hoverBackground,
                },
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
