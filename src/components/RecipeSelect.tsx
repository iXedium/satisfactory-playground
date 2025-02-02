import React, { useState, useRef, useEffect } from "react";
import { Recipe } from "../data/dexieDB";
import { iconStyles } from "../styles/iconStyles";

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
    <div ref={containerRef} style={iconStyles.selectContainer}>
      <div
        style={iconStyles.customSelect}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value && selectedRecipe ? selectedRecipe.name : placeholder}
      </div>

      {isOpen && (
        <div style={iconStyles.dropdown}>
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              style={{
                ...iconStyles.dropdownItem,
                backgroundColor: recipe.id === value ? "rgba(0, 0, 0, 0.05)" : undefined
              }}
              onClick={() => {
                onChange(recipe.id);
                setIsOpen(false);
              }}
            >
              {recipe.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeSelect;
