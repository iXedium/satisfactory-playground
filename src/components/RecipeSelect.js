import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { theme } from '../styles/theme';
import DropdownPortal from './DropdownPortal';
import { recipeSelectStyles } from "../styles/recipeSelectStyles";
const RecipeSelect = ({ recipes, value, onChange, placeholder = "Select a Recipe", style }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const selectedRecipe = recipes.find(recipe => recipe.id === value);
    return (_jsxs("div", { style: { ...recipeSelectStyles.selectContainer, ...style }, ref: buttonRef, children: [_jsx("div", { onClick: (e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }, style: recipeSelectStyles.customSelect, children: selectedRecipe ? selectedRecipe.name : placeholder }), _jsx(DropdownPortal, { anchorEl: buttonRef.current, open: isOpen, onClose: () => setIsOpen(false), children: _jsx("div", { onClick: (e) => e.stopPropagation(), style: recipeSelectStyles.dropdown, children: recipes.map((recipe) => (_jsx("div", { onClick: (e) => {
                            e.stopPropagation();
                            onChange(recipe.id);
                            setIsOpen(false);
                        }, style: {
                            ...recipeSelectStyles.dropdownItem,
                            ...(recipe.id === value ? recipeSelectStyles.dropdownItemSelected : {}),
                        }, onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.dropdown.hoverBackground;
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor =
                                recipe.id === value ?
                                    theme.colors.dropdown.hoverBackground :
                                    'transparent';
                        }, children: recipe.name }, recipe.id))) }) })] }));
};
export default RecipeSelect;
