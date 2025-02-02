import React from "react";
import Switch from "@mui/material/Switch";
import { viewModeSwitchStyles } from "../styles/viewModeSwitchStyles";

interface ViewModeSwitchProps {
  mode: "list" | "tree";
  onToggle: (mode: "list" | "tree") => void;
}

const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({ mode, onToggle }) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(event.target.checked ? "tree" : "list");
  };

  return (
    <div style={viewModeSwitchStyles.container}>
      <span style={viewModeSwitchStyles.label}>List View</span>
      <Switch
        checked={mode === "tree"}
        onChange={handleChange}
        color="primary"
        sx={{ mx: 1 }}
      />
      <span style={viewModeSwitchStyles.label}>Tree View</span>
    </div>
  );
};

export default ViewModeSwitch;
