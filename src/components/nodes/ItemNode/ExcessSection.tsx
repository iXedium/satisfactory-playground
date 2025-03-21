/**
 * ExcessSection Component
 * 
 * Displays excess production controls for an item node.
 */

import React, { useState, useEffect } from "react";
import { Input, Button } from "../../../components/common";
import { theme } from "../../../styles/theme";
import useMachineCalculation from "../../../hooks/useMachineCalculation";

export interface ExcessSectionProps {
  excess: number;
  onExcessChange?: (excess: number) => void;
  amount: number;
  itemId: string;
  recipeId: string;
  machineCount: number;
  machineMultiplier: number;
}

/**
 * ExcessSection component for controlling excess production
 */
const ExcessSection: React.FC<ExcessSectionProps> = ({
  excess,
  onExcessChange,
  amount,
  itemId,
  recipeId,
  machineCount,
  machineMultiplier,
}) => {
  // Local state for handling precise excess value and focus state
  const [isExcessFocused, setIsExcessFocused] = useState(false);
  const [preciseExcess, setPreciseExcess] = useState(excess);
  
  // Use hook to get machine calculation data
  const { 
    calculateMaxExcess,
    nominalRate
  } = useMachineCalculation({
    itemId,
    amount,
    recipeId,
    excess,
    machineCount,
    machineMultiplier
  });
  
  // Update local state when props change
  useEffect(() => {
    setPreciseExcess(excess);
  }, [excess]);
  
  // Format the excess value based on focus state
  const formattedExcess = isExcessFocused 
    ? preciseExcess 
    : Number(preciseExcess.toFixed(2));
  
  // For display in the input control
  const displayExcess = isExcessFocused
    ? preciseExcess.toString()
    : formattedExcess.toFixed(2);
  
  // Handle excess change
  const handleExcessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Handle empty input or invalid numbers
    if (inputValue === "" || isNaN(parseFloat(inputValue))) {
      setPreciseExcess(0);
      if (onExcessChange) {
        onExcessChange(0);
      }
    } else {
      // Store the full precision number
      const numValue = parseFloat(inputValue);
      setPreciseExcess(numValue);
      if (onExcessChange) {
        onExcessChange(numValue);
      }
    }
  };
  
  // Handle focus on excess input
  const handleExcessFocus = () => {
    setIsExcessFocused(true);
  };
  
  // Handle blur on excess input
  const handleExcessBlur = () => {
    setIsExcessFocused(false);
  };
  
  // Reset excess to zero
  const handleResetExcess = () => {
    setPreciseExcess(0);
    if (onExcessChange) {
      onExcessChange(0);
    }
  };
  
  // Set excess to maximum possible value for 100% efficiency
  const handleMaxExcess = () => {
    if (calculateMaxExcess) {
      const maxExcess = calculateMaxExcess();
      setPreciseExcess(maxExcess);
      if (onExcessChange) {
        onExcessChange(maxExcess);
      }
    }
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        {/* Excess input */}
        <div style={{ flex: 1 }}>
          <Input
            type="number"
            value={displayExcess}
            onChange={handleExcessChange}
            onFocus={handleExcessFocus}
            onBlur={handleExcessBlur}
            label="Excess Production"
            size="small"
            fullWidth
          />
        </div>
        
        {/* Action buttons */}
        <div style={{ display: "flex", gap: "4px" }}>
          <Button
            variant="secondary"
            size="small"
            onClick={handleResetExcess}
            title="Reset excess to zero"
          >
            Reset
          </Button>
          
          <Button
            variant="secondary"
            size="small"
            onClick={handleMaxExcess}
            title="Set maximum excess for 100% efficiency"
          >
            Max
          </Button>
        </div>
      </div>
      
      {/* Help text */}
      <div style={{ fontSize: "12px", color: theme.colors.textSecondary }}>
        Total production: {(amount + formattedExcess).toFixed(2)} items/min
      </div>
    </div>
  );
};

export default React.memo(ExcessSection); 