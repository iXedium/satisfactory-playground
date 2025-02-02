import React, { useState, useRef, useEffect } from "react";
import { Recipe } from "../data/dexieDB";
import { recipeSelectStyles } from "../styles/recipeSelectStyles";

interface RecipeSelectProps {
  recipes: Recipe[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RecipeSelect: React.FC<RecipeSelectProps> = ({ 
  recipes, 
  value, 
  onChange, 
  placeholder = "Select a Recipe" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedRecipe = recipes.find(recipe => recipe.id === value);

  return (
    <div ref={containerRef} style={recipeSelectStyles.selectContainer}>
      <div
        style={recipeSelectStyles.customSelect}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value && selectedRecipe ? (
          <span>{selectedRecipe.name}</span>
        ) : (
          placeholder
        )}
      </div>

      {isOpen && (
        <div style={recipeSelectStyles.dropdown}>
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              style={recipeSelectStyles.dropdownItem}
              onClick={() => {
                onChange(recipe.id);
                setIsOpen(false);
              }}
            >
              <span>{recipe.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeSelect;
