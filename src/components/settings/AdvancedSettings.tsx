/**
 * AdvancedSettings Component
 * 
 * Component for managing advanced application settings and data.
 */

import React, { useState } from "react";
import { Button } from "../../components/common";
import { theme } from "../../styles/theme";
import useSettings from "../../hooks/useSettings";
import { resetSettings } from "../../features/settingsSlice";
import { useDispatch } from "react-redux";

export interface AdvancedSettingsProps {
  /**
   * Callback when settings are reset
   */
  onReset?: () => void;
}

/**
 * Component for advanced application settings
 */
const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ onReset }) => {
  const dispatch = useDispatch();
  const { isFeatureEnabled } = useSettings();
  
  // State for confirmation dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Handle reset settings
  const handleResetSettings = () => {
    dispatch(resetSettings());
    if (onReset) {
      onReset();
    }
    setShowResetConfirm(false);
  };
  
  // Handle clear all data
  const handleClearAllData = () => {
    try {
      // Clear all local storage
      localStorage.clear();
      // Reload the page to reset the application state
      window.location.reload();
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };
  
  // Section style
  const sectionStyle: React.CSSProperties = {
    marginBottom: "24px"
  };
  
  // Danger zone style
  const dangerZoneStyle: React.CSSProperties = {
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.border.radius,
    padding: "16px",
    marginTop: "32px"
  };
  
  // Confirmation dialog style
  const confirmDialogStyle: React.CSSProperties = {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.border.radius,
    padding: "16px",
    marginTop: "16px"
  };
  
  return (
    <div>
      {/* Features section */}
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          Features
        </h3>
        
        <p style={{ 
          marginBottom: "16px",
          color: theme.colors.textSecondary,
          fontSize: "14px"
        }}>
          These features are currently enabled in your application:
        </p>
        
        <ul style={{ 
          listStyleType: "none", 
          padding: 0,
          margin: 0
        }}>
          {["core", "calculator", "power", "accumulated"].map(feature => (
            <li key={feature} style={{ 
              padding: "8px 12px",
              backgroundColor: isFeatureEnabled(feature) 
                ? `${theme.colors.success}20` 
                : theme.colors.backgroundAlt,
              marginBottom: "8px",
              borderRadius: theme.border.radius,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              {isFeatureEnabled(feature) ? (
                <span style={{ color: theme.colors.success }}>✓</span>
              ) : (
                <span style={{ color: theme.colors.textSecondary }}>○</span>
              )}
              <span style={{ 
                textTransform: "capitalize",
                fontWeight: isFeatureEnabled(feature) ? "bold" : "normal"
              }}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Export/Import section */}
      <div style={sectionStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.textPrimary
        }}>
          Export/Import Data
        </h3>
        
        <p style={{ 
          marginBottom: "16px",
          color: theme.colors.textSecondary,
          fontSize: "14px"
        }}>
          Export your data to a file for backup or import data from a file.
        </p>
        
        <div style={{ 
          display: "flex",
          gap: "12px"
        }}>
          <Button
            variant="secondary"
            onClick={() => {
              // This will be implemented as part of the Import/Export refactoring
              alert("Export functionality will be implemented in the Import/Export refactoring phase.");
            }}
          >
            Export Data
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => {
              // This will be implemented as part of the Import/Export refactoring
              alert("Import functionality will be implemented in the Import/Export refactoring phase.");
            }}
          >
            Import Data
          </Button>
        </div>
      </div>
      
      {/* Danger Zone */}
      <div style={dangerZoneStyle}>
        <h3 style={{ 
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: theme.colors.error
        }}>
          Danger Zone
        </h3>
        
        <p style={{ 
          marginBottom: "16px",
          color: theme.colors.textSecondary,
          fontSize: "14px"
        }}>
          These actions cannot be undone. Please be certain before proceeding.
        </p>
        
        <div style={{ 
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {/* Reset settings */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
            >
              Reset All Settings
            </Button>
            
            <div style={{ 
              fontSize: "12px",
              color: theme.colors.textSecondary,
              marginTop: "4px"
            }}>
              Resets all settings to their default values. This will not affect your saved projects.
            </div>
            
            {showResetConfirm && (
              <div style={confirmDialogStyle}>
                <p style={{ 
                  marginBottom: "12px",
                  fontWeight: "bold"
                }}>
                  Are you sure you want to reset all settings?
                </p>
                <div style={{ 
                  display: "flex",
                  gap: "8px"
                }}>
                  <Button
                    variant="primary"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetSettings}
                  >
                    Reset Settings
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Clear all data */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(true)}
              style={{ color: theme.colors.error, borderColor: theme.colors.error }}
            >
              Clear All Data
            </Button>
            
            <div style={{ 
              fontSize: "12px",
              color: theme.colors.textSecondary,
              marginTop: "4px"
            }}>
              Erases all saved data including settings, trees, and recipe selections. This will reload the application.
            </div>
            
            {showClearConfirm && (
              <div style={confirmDialogStyle}>
                <p style={{ 
                  marginBottom: "12px",
                  fontWeight: "bold",
                  color: theme.colors.error
                }}>
                  Are you absolutely sure you want to delete all data?
                </p>
                <p style={{ 
                  marginBottom: "12px",
                  fontSize: "14px",
                  color: theme.colors.textSecondary
                }}>
                  This action cannot be undone. All your settings and saved projects will be permanently deleted.
                </p>
                <div style={{ 
                  display: "flex",
                  gap: "8px"
                }}>
                  <Button
                    variant="primary"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearAllData}
                    style={{ color: theme.colors.error, borderColor: theme.colors.error }}
                  >
                    Delete All Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AdvancedSettings); 