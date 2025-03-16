import React from "react";
import { theme } from "../../styles/theme";

interface CustomCheckboxProps {
  checked?: boolean;
  onChange?: () => void;
  label?: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ 
  checked = false, 
  onChange,
  label
}) => {
  const customCheckboxStyle: React.CSSProperties = {
    position: "relative",
    width: "16px",
    height: "16px",
    backgroundColor: theme.colors.darker,
    borderRadius: "3px",
    border: `1px solid ${theme.colors.dropdown.border}`,
    display: "inline-block",
    cursor: "pointer",
  };

  const customCheckboxCheckedStyle: React.CSSProperties = {
    ...customCheckboxStyle,
    backgroundColor: theme.colors.darker,
    border: `1px solid ${theme.colors.dropdown.border}`,
  };

  const checkmarkStyle: React.CSSProperties = {
    position: "absolute",
    top: "3px",
    left: "3px",
    width: "8px",
    height: "8px",
    backgroundColor: theme.colors.primary,
    borderRadius: "2px",
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: theme.colors.text,
    fontSize: "14px",
    cursor: "pointer",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChange) {
      onChange();
    }
  };

  if (label) {
    return (
      <label style={checkboxLabelStyle}>
        <div 
          style={checked ? customCheckboxCheckedStyle : customCheckboxStyle}
          onClick={handleClick}
        >
          {checked && <span style={checkmarkStyle}></span>}
        </div>
        {label}
      </label>
    );
  }

  return (
    <div 
      style={checked ? customCheckboxCheckedStyle : customCheckboxStyle}
      onClick={handleClick}
    >
      {checked && <span style={checkmarkStyle}></span>}
    </div>
  );
};

export default CustomCheckbox; 