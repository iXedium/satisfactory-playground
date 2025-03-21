/**
 * DisplaySettings Component
 * 
 * Component for managing display-related settings.
 */

import React from "react";
import { theme } from "../../styles/theme";
import useSettings from "../../hooks/useSettings";

export interface DisplaySettingsProps {}

/**
 * Component for display settings
 */
const DisplaySettings: React.FC<DisplaySettingsProps> = () => {
  // Get settings from the hook
  const { 
    showByproducts,
    showExcess,
    showMachines,
    showMachineMultiplier,
    showExtensions,
    accumulateExtensions,
    compactView,
    toggleBooleanSetting
  } = useSettings();
  
  // Toggle settings
  const handleToggleSetting = (key: keyof typeof settings) => {
    // @ts-ignore: The hook only accepts specific keys, but we've verified these are correct
    toggleBooleanSetting(key);
  };
  
  // Settings organized by category
  const settings = {
    // View settings
    showByproducts,
    showExcess,
    compactView,
    
    // Machine settings
    showMachines,
    showMachineMultiplier,
    
    // Extension settings
    showExtensions,
    accumulateExtensions
  };
  
  // Section style
  const sectionStyle: React.CSSProperties = {
    marginBottom: "24px"
  };
  
  // Toggle style
  const toggleRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "8px 0",
    cursor: "pointer"
  };
  
  // Checkbox style
  const checkboxStyle: React.CSSProperties = {
    width: "18px",
    height: "18px",
    border: `2px solid ${theme.colors.border}`,
    borderRadius: "4px",
    marginRight: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundAlt
  };
  
  // Checked checkbox style
  const checkedStyle: React.CSSProperties = {
    ...checkboxStyle,
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  };
  
  // Render a toggle setting
  const renderToggle = (
    key: keyof typeof settings, 
    label: string, 
    description: string
  ) => {
    const isChecked = settings[key];
    
    return (
      <div 
        style={toggleRowStyle}
        onClick={() => handleToggleSetting(key)}
      >
        <div style={isChecked ? checkedStyle : checkboxStyle}>
          {isChecked && (
            <span style={{ color: "white", fontSize: "12px" }}>✓</span>
          )}
        </div>
        <div>
          <div style={{ fontWeight: "500" }}>{label}</div>
          <div style={{ 
            fontSize: "12px",
            color: theme.colors.textSecondary
          }}>
            {description}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {/* View Settings */}
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          View Options
        </h3>
        
        {renderToggle(
          "showByproducts", 
          "Show Byproducts", 
          "Display byproducts in the tree and accumulated views"
        )}
        
        {renderToggle(
          "showExcess", 
          "Show Excess", 
          "Display excess production in the tree view"
        )}
        
        {renderToggle(
          "compactView", 
          "Compact View", 
          "Use a more compact view with less spacing"
        )}
      </div>
      
      {/* Machine Settings */}
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          Machine Options
        </h3>
        
        {renderToggle(
          "showMachines", 
          "Show Machines", 
          "Display machine counts in the tree view"
        )}
        
        {renderToggle(
          "showMachineMultiplier", 
          "Show Machine Multiplier", 
          "Display machine multiplier controls"
        )}
      </div>
      
      {/* Extension Settings */}
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          Extension Options
        </h3>
        
        {renderToggle(
          "showExtensions", 
          "Show Extensions", 
          "Display extension nodes in the tree view"
        )}
        
        {renderToggle(
          "accumulateExtensions", 
          "Accumulate Extensions", 
          "Include extensions in accumulated view calculations"
        )}
      </div>
    </div>
  );
};

export default React.memo(DisplaySettings); 