/**
 * ProductionInput Component
 * 
 * Input field for specifying desired production rate.
 */

import React, { useState, useEffect } from "react";
import { Input, Button } from "../../components/common";
import { theme } from "../../styles/theme";

export interface ProductionInputProps {
  /**
   * Current production rate value
   */
  productionRate: number;
  
  /**
   * Callback when production rate changes
   */
  onProductionRateChange: (rate: number) => void;
  
  /**
   * Label for the unit (e.g., "items/min")
   */
  unitLabel: string;
  
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
}

/**
 * ProductionInput component for entering production rates
 */
const ProductionInput: React.FC<ProductionInputProps> = ({
  productionRate,
  onProductionRateChange,
  unitLabel,
  disabled = false,
}) => {
  // Local state for input value
  const [inputValue, setInputValue] = useState<string>(productionRate.toString());
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // Update local state when prop changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(productionRate.toString());
    }
  }, [productionRate, isFocused]);
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Convert to number and update if valid
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onProductionRateChange(numValue);
    } else if (value === "") {
      onProductionRateChange(0);
    }
  };
  
  // Handle focus events
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    
    // Ensure valid number on blur
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      setInputValue("0");
      onProductionRateChange(0);
    }
  };
  
  // Quick value buttons
  const quickValues = [15, 30, 60, 120, 240, 480];
  
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      gap: "8px" 
    }}>
      {/* Main input field */}
      <div style={{ 
        display: "flex", 
        alignItems: "flex-end",
        gap: "8px" 
      }}>
        <div style={{ flex: 1 }}>
          <Input
            type="number"
            label="Production Rate"
            value={inputValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            fullWidth
            min={0}
            step={1}
            placeholder="Enter production rate"
          />
        </div>
        <div style={{ marginBottom: "8px" }}>
          {unitLabel}
        </div>
      </div>
      
      {/* Quick value buttons */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap",
        gap: "8px" 
      }}>
        {quickValues.map(value => (
          <Button
            key={value}
            variant="secondary"
            size="small"
            onClick={() => {
              setInputValue(value.toString());
              onProductionRateChange(value);
            }}
            disabled={disabled}
          >
            {value}
          </Button>
        ))}
      </div>
      
      {/* Help text */}
      <div style={{ 
        fontSize: "12px",
        color: theme.colors.textSecondary 
      }}>
        Enter your desired production rate or select a preset value.
      </div>
    </div>
  );
};

export default React.memo(ProductionInput); 