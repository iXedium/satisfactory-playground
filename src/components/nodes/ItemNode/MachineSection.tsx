/**
 * MachineSection Component
 * 
 * Displays machine calculations, efficiency, and controls for an item node.
 */

import React, { useState, useEffect, useRef } from "react";
import { Input, Button } from "../../../components/common";
import { theme } from "../../../styles/theme";
import useMachineCalculation from "../../../hooks/useMachineCalculation";

export interface MachineSectionProps {
  itemId: string;
  amount: number;
  excess: number;
  recipeId: string;
  machineCount: number;
  onMachineCountChange?: (count: number) => void;
  machineMultiplier: number;
  onMachineMultiplierChange?: (multiplier: number) => void;
  showMachineMultiplier?: boolean;
}

/**
 * MachineSection component displays machine calculations and controls
 */
const MachineSection: React.FC<MachineSectionProps> = ({
  itemId,
  amount,
  excess,
  recipeId,
  machineCount,
  onMachineCountChange,
  machineMultiplier,
  onMachineMultiplierChange,
  showMachineMultiplier = false,
}) => {
  // Machine calculation hook for getting machine data and calculations
  const { 
    machineData, 
    isLoading, 
    error, 
    efficiency, 
    nominalRate,
    calculateOptimalCount
  } = useMachineCalculation({
    itemId,
    amount,
    recipeId,
    excess,
    machineCount,
    machineMultiplier
  });

  const [showEfficiencyTooltip, setShowEfficiencyTooltip] = useState(false);
  
  // Get efficiency color based on current efficiency
  const getEfficiencyColor = () => {
    if (!efficiency) return theme.colors.textSecondary;
    if (efficiency > 100) return theme.colors.efficiency.over;
    if (efficiency < 100) return theme.colors.efficiency.under;
    return theme.colors.efficiency.perfect;
  };
  
  // Copy efficiency value to clipboard
  const copyEfficiencyValue = () => {
    if (efficiency) {
      const decimalValue = efficiency / 100;
      navigator.clipboard.writeText(decimalValue.toString());
      setShowEfficiencyTooltip(true);
      setTimeout(() => setShowEfficiencyTooltip(false), 2000);
    }
  };
  
  // Optimize machine count to achieve 100% efficiency
  const handleOptimizeMachines = () => {
    if (calculateOptimalCount) {
      const optimalCount = calculateOptimalCount();
      if (onMachineCountChange) {
        onMachineCountChange(optimalCount);
      }
    }
  };
  
  // Handle machine count change
  const handleMachineCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Math.max(1, value === "" ? 1 : Math.floor(Number(value)));
    if (onMachineCountChange) {
      onMachineCountChange(numValue);
    }
  };
  
  // Handle machine multiplier change
  const handleMachineMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = Math.max(1, value === "" ? 1 : Math.floor(Number(value)));
    if (onMachineMultiplierChange) {
      onMachineMultiplierChange(numValue);
    }
  };
  
  if (isLoading) {
    return <div>Loading machine data...</div>;
  }
  
  if (error) {
    return <div>Error loading machine data</div>;
  }
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Machine info header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: "bold" }}>
          Machines: {machineData?.name || "Unknown"}
        </div>
        
        {/* Efficiency display */}
        <div 
          onClick={copyEfficiencyValue}
          style={{ 
            cursor: "pointer", 
            color: getEfficiencyColor(),
            position: "relative",
            fontWeight: "bold"
          }}
          title="Click to copy decimal value"
        >
          {efficiency?.toFixed(2)}% Efficiency
          
          {/* Tooltip when efficiency is copied */}
          {showEfficiencyTooltip && (
            <div 
              style={{
                position: "absolute",
                top: "-30px",
                right: "0",
                background: theme.colors.tooltip,
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                whiteSpace: "nowrap",
                color: theme.colors.textInverted,
              }}
            >
              Copied!
            </div>
          )}
        </div>
      </div>
      
      {/* Machine controls */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {/* Machine count input */}
        <div style={{ flex: 1 }}>
          <Input
            type="number"
            value={machineCount.toString()}
            onChange={handleMachineCountChange}
            min={1}
            label="Machine Count"
            size="small"
            fullWidth
          />
        </div>
        
        {/* Machine multiplier input (optional) */}
        {showMachineMultiplier && (
          <div style={{ flex: 1 }}>
            <Input
              type="number"
              value={machineMultiplier.toString()}
              onChange={handleMachineMultiplierChange}
              min={1}
              label="Multiplier"
              size="small"
              fullWidth
            />
          </div>
        )}
        
        {/* Optimize button */}
        <div style={{ alignSelf: "flex-end" }}>
          <Button
            variant="secondary"
            size="small"
            onClick={handleOptimizeMachines}
          >
            Optimize
          </Button>
        </div>
      </div>
      
      {/* Production rate display */}
      {nominalRate > 0 && (
        <div style={{ fontSize: "12px", color: theme.colors.textSecondary }}>
          Production rate: {nominalRate.toFixed(2)} per machine
        </div>
      )}
    </div>
  );
};

export default React.memo(MachineSection); 