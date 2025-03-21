/**
 * SettingsHeader Component
 * 
 * Header component for the settings with title and action buttons.
 */

import React from "react";
import { Button } from "../../components/common";
import { theme } from "../../styles/theme";

export interface SettingsHeaderProps {
  /**
   * Callback when settings are saved
   */
  onSave?: () => void;
}

/**
 * Header component for the settings panel
 */
const SettingsHeader: React.FC<SettingsHeaderProps> = ({ onSave }) => {
  return (
    <div style={{ 
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 24px",
      borderBottom: `1px solid ${theme.colors.border}`
    }}>
      <div>
        <h2 style={{ 
          fontSize: "20px",
          fontWeight: "bold",
          color: theme.colors.textPrimary,
          margin: 0
        }}>
          Settings
        </h2>
        <p style={{ 
          fontSize: "14px",
          color: theme.colors.textSecondary,
          margin: "4px 0 0 0"
        }}>
          Customize application preferences
        </p>
      </div>
      
      {onSave && (
        <div>
          <Button
            variant="primary"
            onClick={onSave}
          >
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};

export default React.memo(SettingsHeader); 