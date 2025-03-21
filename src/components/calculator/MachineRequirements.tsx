/**
 * MachineRequirements Component
 * 
 * Displays machine requirements for production.
 */

import React from "react";
import { theme } from "../../styles/theme";

export interface MachineRequirementsProps {
  /**
   * Array of machine requirements
   */
  requirements: {
    machineId: string;
    machineName: string;
    count: number;
    efficiency: number;
    powerConsumption: number;
  }[];
  
  /**
   * Whether data is loading
   */
  isLoading: boolean;
}

/**
 * MachineRequirements component for displaying machine requirements
 */
const MachineRequirements: React.FC<MachineRequirementsProps> = ({
  requirements,
  isLoading,
}) => {
  // Helper function to get efficiency color
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency > 100) return theme.colors.efficiency.over;
    if (efficiency < 100) return theme.colors.efficiency.under;
    return theme.colors.efficiency.perfect;
  };
  
  if (isLoading) {
    return (
      <div style={{ 
        padding: "16px", 
        textAlign: "center",
        color: theme.colors.textSecondary
      }}>
        Loading machine requirements...
      </div>
    );
  }
  
  if (!requirements.length) {
    return (
      <div style={{ 
        padding: "16px", 
        textAlign: "center",
        color: theme.colors.textSecondary
      }}>
        No machine requirements to display.
      </div>
    );
  }
  
  return (
    <div style={{ padding: "16px" }}>
      {/* Header */}
      <div style={{ 
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: "8px",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "bold",
        color: theme.colors.textSecondary
      }}>
        <div>Machine</div>
        <div style={{ textAlign: "center" }}>Count</div>
        <div style={{ textAlign: "center" }}>Efficiency</div>
        <div style={{ textAlign: "right" }}>Power</div>
      </div>
      
      {/* Machine rows */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        gap: "8px" 
      }}>
        {requirements.map(machine => (
          <div 
            key={machine.machineId}
            style={{ 
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: "8px",
              padding: "8px",
              alignItems: "center",
              backgroundColor: theme.colors.backgroundAlt,
              borderRadius: theme.border.radius,
            }}
          >
            {/* Machine name */}
            <div>{machine.machineName}</div>
            
            {/* Machine count */}
            <div style={{ 
              textAlign: "center",
              fontWeight: "bold"
            }}>
              {machine.count}
            </div>
            
            {/* Efficiency */}
            <div style={{ 
              textAlign: "center",
              fontWeight: "bold",
              color: getEfficiencyColor(machine.efficiency)
            }}>
              {machine.efficiency.toFixed(0)}%
            </div>
            
            {/* Power consumption */}
            <div style={{ 
              textAlign: "right",
              fontWeight: "bold"
            }}>
              {machine.powerConsumption.toFixed(1)} MW
            </div>
          </div>
        ))}
      </div>
      
      {/* Optimization hint */}
      <div style={{ 
        marginTop: "16px",
        fontSize: "12px",
        color: theme.colors.textSecondary 
      }}>
        Tip: Machine counts are rounded up to the nearest whole number.
        Efficiency below 100% means machines are not operating at full capacity.
      </div>
    </div>
  );
};

export default React.memo(MachineRequirements); 