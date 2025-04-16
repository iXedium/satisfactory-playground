import React from "react";
import { theme } from "../../styles/theme";

interface StyledCheckboxProps {
  checked?: boolean;
  onChange?: (newValue: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const StyledCheckbox: React.FC<StyledCheckboxProps> = ({ 
  checked = false, 
  onChange,
  label,
  disabled = false
}) => {
  const checkboxStyle: React.CSSProperties = {
    position: "relative",
    width: "25px",
    height: "25px",
    backgroundColor: theme.colors.darker,
    borderRadius: "4px",
    border: `1px solid ${theme.colors.dropdown.border}`,
    display: "inline-block",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  const checkmarkStyle: React.CSSProperties = {
    position: "absolute",
    top: "3px",
    left: "3px",
    width: "19px",
    height: "19px",
    backgroundColor: theme.colors.primary,
    borderRadius: "2px",
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: theme.colors.text,
    fontSize: "14px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChange && !disabled) {
      onChange(!checked);
    }
  };

  if (label) {
    return (
      <label style={checkboxLabelStyle} onClick={handleClick}>
        <div style={checkboxStyle}>
          {checked && <span style={checkmarkStyle}></span>}
        </div>
        {label}
      </label>
    );
  }

  return (
    <div 
      style={checkboxStyle}
      onClick={handleClick}
    >
      {checked && <span style={checkmarkStyle}></span>}
    </div>
  );
};

export default StyledCheckbox; 