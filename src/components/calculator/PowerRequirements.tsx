/**
 * PowerRequirements Component
 * 
 * Displays power consumption requirements.
 */

import React from "react";
import { theme } from "../../styles/theme";

export interface PowerRequirementsProps {
  /**
   * Total power consumption in MW
   */
  totalPower: number;
  
  /**
   * Array of machine requirements for detailed breakdown
   */
  requirements: {
    machineId: string;
    machineName: string;
    count: number;
    powerConsumption: number;
  }[];
  
  /**
   * Whether data is loading
   */
  isLoading: boolean;
}

/**
 * PowerRequirements component for displaying power consumption
 */
const PowerRequirements: React.FC<PowerRequirementsProps> = ({
  totalPower,
  requirements,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div style={{ 
        padding: "16px", 
        textAlign: "center",
        color: theme.colors.textSecondary
      }}>
        Loading power requirements...
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
        No power requirements to display.
      </div>
    );
  }
  
  return (
    <div style={{ padding: "16px" }}>
      {/* Total power consumption */}
      <div style={{ 
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        marginBottom: "16px",
        backgroundColor: theme.colors.backgroundAlt,
        borderRadius: theme.border.radius,
        borderLeft: `4px solid ${theme.colors.primary}`
      }}>
        <div style={{ fontWeight: "bold" }}>
          Total Power Consumption
        </div>
        <div style={{ 
          fontSize: "24px",
          fontWeight: "bold",
          color: theme.colors.primary
        }}>
          {totalPower.toFixed(1)} MW
        </div>
      </div>
      
      {/* Power breakdown */}
      <div>
        <h3 style={{ 
          fontSize: "16px", 
          marginBottom: "8px",
          color: theme.colors.textPrimary
        }}>
          Power Breakdown
        </h3>
        
        {/* Machine power consumption rows */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "8px" 
        }}>
          {requirements.map(machine => (
            <div 
              key={machine.machineId}
              style={{ 
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                backgroundColor: theme.colors.backgroundAlt,
                borderRadius: theme.border.radius,
              }}
            >
              <div>
                <span style={{ fontWeight: "bold" }}>{machine.machineName}</span>
                <span style={{ 
                  marginLeft: "8px",
                  color: theme.colors.textSecondary,
                  fontSize: "14px"
                }}>
                  ({machine.count} machines)
                </span>
              </div>
              <div style={{ fontWeight: "bold" }}>
                {machine.powerConsumption.toFixed(1)} MW
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Power generation tip */}
      <div style={{ 
        marginTop: "16px",
        fontSize: "12px",
        color: theme.colors.textSecondary 
      }}>
        Tip: Make sure you have enough power generation capacity before building this factory.
      </div>
    </div>
  );
};

export default React.memo(PowerRequirements); 