/**
 * Settings Component
 * 
 * Main component for application settings that acts as a composition root
 * for all settings-related functionality.
 */

import React, { useState } from "react";
import { Card, TabGroup } from "../../components/common";
import { theme } from "../../styles/theme";
import useSettings from "../../hooks/useSettings";

import SettingsHeader from "./SettingsHeader";
import GeneralSettings from "./GeneralSettings";
import DisplaySettings from "./DisplaySettings";
import RecipeSettings from "./RecipeSettings";
import AdvancedSettings from "./AdvancedSettings";

export interface SettingsProps {
  /**
   * Callback when settings are saved
   */
  onSave?: () => void;
  
  /**
   * Callback when settings are reset to defaults
   */
  onReset?: () => void;
  
  /**
   * Whether the settings are displayed in a modal
   */
  isModal?: boolean;
}

/**
 * Settings component for managing application preferences
 */
const Settings: React.FC<SettingsProps> = ({
  onSave,
  onReset,
  isModal = false,
}) => {
  // Get settings from hook
  const settings = useSettings();
  
  // State for active tab
  const [activeTab, setActiveTab] = useState("general");
  
  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };
  
  // Create tabs
  const tabs = [
    {
      id: "general",
      label: "General",
      content: <GeneralSettings />
    },
    {
      id: "display",
      label: "Display",
      content: <DisplaySettings />
    },
    {
      id: "recipes",
      label: "Recipes",
      content: <RecipeSettings />
    },
    {
      id: "advanced",
      label: "Advanced",
      content: <AdvancedSettings onReset={onReset} />
    },
  ];
  
  return (
    <div style={{ 
      maxWidth: isModal ? "auto" : "900px",
      margin: isModal ? "0" : "0 auto",
      padding: isModal ? "0" : "16px"
    }}>
      <Card>
        <SettingsHeader onSave={onSave} />
        
        <div style={{ 
          padding: "16px",
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          <TabGroup 
            tabs={tabs}
            activeTabId={activeTab}
            onChange={handleTabChange}
            variant="boxed"
          />
        </div>
        
        <div style={{ 
          padding: "24px" 
        }}>
          {/* Render active tab content */}
          {tabs.find(tab => tab.id === activeTab)?.content}
        </div>
      </Card>
    </div>
  );
};

export default React.memo(Settings); 