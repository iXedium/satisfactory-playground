/**
 * GeneralSettings Component
 * 
 * Component for managing general application settings.
 */

import React from "react";
import { Select, Input } from "../../components/common";
import { theme } from "../../styles/theme";
import useSettings from "../../hooks/useSettings";

export interface GeneralSettingsProps {}

/**
 * Component for general application settings
 */
const GeneralSettings: React.FC<GeneralSettingsProps> = () => {
  // Get settings from the hook
  const { 
    theme: currentTheme,
    updateThemeSetting,
    productionRate,
    updateProductionRateSetting
  } = useSettings();
  
  // Theme options
  const themeOptions = [
    { id: "light", name: "Light" },
    { id: "dark", name: "Dark" },
    { id: "system", name: "System Default" }
  ];
  
  // Handle theme change
  const handleThemeChange = (themeId: string) => {
    updateThemeSetting(themeId as 'light' | 'dark' | 'system');
  };
  
  // Handle production rate change
  const handleProductionRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      updateProductionRateSetting(value);
    }
  };
  
  // Section style
  const sectionStyle: React.CSSProperties = {
    marginBottom: "24px"
  };
  
  // Setting row style
  const settingRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px"
  };
  
  return (
    <div>
      {/* Theme Settings */}
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          Appearance
        </h3>
        
        <div style={settingRowStyle}>
          <div>
            <div style={{ fontWeight: "500" }}>Theme</div>
            <div style={{ 
              fontSize: "12px",
              color: theme.colors.textSecondary
            }}>
              Choose how the application looks
            </div>
          </div>
          
          <div style={{ width: "200px" }}>
            <Select
              value={currentTheme}
              onChange={handleThemeChange}
              options={themeOptions}
              fullWidth
            />
          </div>
        </div>
      </div>
      
      {/* Production Settings */}
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          Production Settings
        </h3>
        
        <div style={settingRowStyle}>
          <div>
            <div style={{ fontWeight: "500" }}>Default Production Rate</div>
            <div style={{ 
              fontSize: "12px",
              color: theme.colors.textSecondary
            }}>
              Default production rate for new items (items/min)
            </div>
          </div>
          
          <div style={{ width: "120px" }}>
            <Input
              type="number"
              value={productionRate.toString()}
              onChange={handleProductionRateChange}
              min={1}
              fullWidth
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GeneralSettings); 