import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Recipe } from "../data/dexieDB";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const [portalContainer] = useState(() => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    return div;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      document.body.removeChild(portalContainer);
    };
  }, [portalContainer]);

  const selectedRecipe = recipes.find(recipe => recipe.id === value);

  return (
    <div 
      ref={containerRef} 
      style={{ ...recipeSelectStyles.selectContainer, ...(style || {}) }}
      onClick={(e) => e.stopPropagation()}
    >
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

      {isOpen && ReactDOM.createPortal(
        <div 
          style={{
            ...recipeSelectStyles.dropdown,
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
          onClick={e => e.stopPropagation()}
        >
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              style={recipeSelectStyles.dropdownItem}
              onMouseDown={(e) => {  // Change from onClick to onMouseDown
                e.preventDefault();
                e.stopPropagation();
                console.log('Recipe selected:', recipe.id);
                onChange(recipe.id);
                setIsOpen(false);
              }}
            >
              <span>{recipe.name}</span>
            </div>
          ))}
        </div>,
        portalContainer  // Use dedicated portal container
      )}
    </div>
  );
};

export default RecipeSelect;
