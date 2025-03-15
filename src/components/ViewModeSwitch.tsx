import React from "react";
import { Switch, styled } from "@mui/material";
import { theme } from "../styles/theme";

interface ViewModeSwitchProps {
  mode: "list" | "tree";
  onToggle: (mode: "list" | "tree") => void;
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

const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({ mode, onToggle }) => {
  return (
    <OrangeSwitch
      checked={mode === "tree"}
      onChange={(e) => onToggle(e.target.checked ? "tree" : "list")}
      size="small"
    />
  );
};

export default ViewModeSwitch;
