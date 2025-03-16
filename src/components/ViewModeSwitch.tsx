import React from "react";
import { Switch, styled } from "@mui/material";
import { theme } from "../styles/theme";

interface ViewModeSwitchProps {
  // Support both old and new interfaces
  mode?: "list" | "tree";
  onToggle?: (mode: "list" | "tree") => void;
  viewMode?: "tree" | "accumulated";
  onChange?: (mode: "tree" | "accumulated") => void;
}

const OrangeSwitch = styled(Switch)({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: theme.colors.primary,
    '&:hover': {
      backgroundColor: theme.colors.hover,
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: theme.colors.primary,
  },
  '& .MuiSwitch-track': {
    backgroundColor: theme.colors.iconBg,
  },
});

const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({ 
  mode, 
  onToggle,
  viewMode,
  onChange,
  ...props
}) => {
  // Handle both interfaces
  const isTreeMode = mode !== undefined ? mode === "tree" : viewMode === "tree";
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    
    // Call the appropriate handler based on which props were provided
    if (onToggle) {
      onToggle(isChecked ? "tree" : "list");
    }
    
    if (onChange) {
      onChange(isChecked ? "tree" : "accumulated");
    }
  };
  
  return (
    <OrangeSwitch
      checked={isTreeMode}
      onChange={handleChange}
      size="small"
      {...props}
    />
  );
};

export default ViewModeSwitch;
