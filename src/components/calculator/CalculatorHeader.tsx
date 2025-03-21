/**
 * CalculatorHeader Component
 * 
 * Header component for the production calculator with title and actions.
 */

import React from "react";
import { Button } from "../../components/common";
import { theme } from "../../styles/theme";

export interface CalculatorHeaderProps {
  /**
   * Callback for saving the current calculation
   */
  onSave?: () => void;
  
  /**
   * Callback for loading a saved calculation
   */
  onLoad?: () => void;
  
  /**
   * Callback for clearing the calculator
   */
  onClear?: () => void;
}

/**
 * CalculatorHeader component for the calculator title and actions
 */
const CalculatorHeader: React.FC<CalculatorHeaderProps> = ({
  onSave,
  onLoad,
  onClear,
}) => {
  return (
    <div style={{ 
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "24px" 
    }}>
      <div>
        <h2 style={{ 
          fontSize: "20px",
          fontWeight: "bold",
          color: theme.colors.textPrimary,
          margin: 0
        }}>
          Production Calculator
        </h2>
        <p style={{ 
          fontSize: "14px",
          color: theme.colors.textSecondary,
          margin: "4px 0 0 0"
        }}>
          Calculate resource and machine requirements for production
        </p>
      </div>
      
      <div style={{ 
        display: "flex",
        gap: "8px" 
      }}>
        {onSave && (
          <Button
            variant="secondary"
            size="small"
            onClick={onSave}
          >
            Save
          </Button>
        )}
        
        {onLoad && (
          <Button
            variant="secondary"
            size="small"
            onClick={onLoad}
          >
            Load
          </Button>
        )}
        
        {onClear && (
          <Button
            variant="secondary"
            size="small"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default React.memo(CalculatorHeader); 