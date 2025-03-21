/**
 * PowerViewItem Component
 * 
 * Displays power information for a single machine.
 */

import React from "react";
import { Machine } from "../../types/core";
import { theme } from "../../styles/theme";
import Card from "../common/Card";

export interface PowerViewItemProps {
  /**
   * Machine data to display
   */
  machine: Machine;
  
  /**
   * Whether to use compact view
   */
  compactView: boolean;
}

/**
 * Component for displaying individual machine power information
 */
const PowerViewItem: React.FC<PowerViewItemProps> = ({
  machine,
  compactView,
}) => {
  // Get appropriate color based on machine type
  const getMachineColor = (type: string): string => {
    switch (type) {
      case 'manufacturer-mk1': return theme.colors.mk1;
      case 'manufacturer-mk2': return theme.colors.mk2;
      case 'manufacturer-mk3': return theme.colors.mk3;
      case 'extractor': return theme.colors.extractor;
      case 'generator': return theme.colors.generator;
      default: return theme.colors.textPrimary;
    }
  };
  
  // Format power values with units
  const formatPower = (power: number): string => {
    if (power >= 1000) {
      return `${(power / 1000).toFixed(1)} GW`;
    }
    return `${power.toFixed(1)} MW`;
  };
  
  // Get machine type label
  const getMachineTypeLabel = (type: string): string => {
    switch (type) {
      case 'manufacturer-mk1': return 'Manufacturer Mk1';
      case 'manufacturer-mk2': return 'Manufacturer Mk2';
      case 'manufacturer-mk3': return 'Manufacturer Mk3';
      case 'extractor': return 'Extractor';
      case 'generator': return 'Generator';
      default: return type;
    }
  };
  
  // Calculate efficiency percentage
  const efficiency = machine.efficiency ? machine.efficiency * 100 : 100;
  
  if (compactView) {
    // Compact view layout
    return (
      <div 
        className="power-view-item power-view-item--compact"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          borderLeft: `4px solid ${getMachineColor(machine.type)}`,
          backgroundColor: theme.colors.cardBackground,
          borderRadius: theme.border.radius,
          marginBottom: "8px",
          boxShadow: theme.boxShadow.small,
        }}
      >
        <div 
          className="power-view-item__name"
          style={{
            fontWeight: "bold",
            flex: "1 1 auto",
          }}
        >
          {machine.name}
        </div>
        
        <div 
          className="power-view-item__type"
          style={{
            color: theme.colors.textSecondary,
            fontSize: "12px",
            marginRight: "16px",
          }}
        >
          {getMachineTypeLabel(machine.type)}
        </div>
        
        {machine.type === 'generator' ? (
          <div 
            className="power-view-item__power-production"
            style={{
              color: theme.colors.success,
              fontWeight: "bold",
              marginRight: "16px",
            }}
          >
            +{formatPower(machine.powerProduction || 0)}
          </div>
        ) : (
          <div 
            className="power-view-item__power-consumption"
            style={{
              color: theme.colors.error,
              fontWeight: "bold",
              marginRight: "16px",
            }}
          >
            -{formatPower(machine.powerConsumption || 0)}
          </div>
        )}
        
        <div 
          className="power-view-item__efficiency"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "6px",
              backgroundColor: `${theme.colors.border}50`,
              borderRadius: "3px",
            }}
          >
            <div
              style={{
                width: `${efficiency}%`,
                height: "100%",
                backgroundColor: efficiency >= 95 
                  ? theme.colors.success 
                  : efficiency >= 70 
                    ? theme.colors.warning 
                    : theme.colors.error,
                borderRadius: "3px",
              }}
            />
          </div>
          <span style={{ fontSize: "12px" }}>{efficiency.toFixed(0)}%</span>
        </div>
      </div>
    );
  }
  
  // Detailed view layout
  return (
    <Card 
      className="power-view-item"
      style={{ 
        marginBottom: "16px", 
        borderTop: `4px solid ${getMachineColor(machine.type)}`
      }}
    >
      <div 
        className="power-view-item__header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "18px" }}>{machine.name}</h3>
          <div style={{ color: theme.colors.textSecondary, fontSize: "14px" }}>
            {getMachineTypeLabel(machine.type)}
          </div>
        </div>
        
        <div 
          className="power-view-item__efficiency-display"
          style={{
            textAlign: "center",
            padding: "4px 12px",
            borderRadius: theme.border.radius,
            backgroundColor: efficiency >= 95 
              ? `${theme.colors.success}20` 
              : efficiency >= 70 
                ? `${theme.colors.warning}20` 
                : `${theme.colors.error}20`,
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: "bold" }}>
            {efficiency.toFixed(0)}%
          </div>
          <div style={{ fontSize: "12px" }}>Efficiency</div>
        </div>
      </div>
      
      <div
        className="power-view-item__stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        {/* Clock speed */}
        <div className="power-view-item__stat">
          <div style={{ fontSize: "12px", color: theme.colors.textSecondary }}>
            Clock Speed
          </div>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>
            {machine.clockSpeed ? `${(machine.clockSpeed * 100).toFixed(0)}%` : "100%"}
          </div>
        </div>
        
        {/* Overclock */}
        <div className="power-view-item__stat">
          <div style={{ fontSize: "12px", color: theme.colors.textSecondary }}>
            Overclock
          </div>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>
            {machine.overclock ? `${(machine.overclock * 100).toFixed(0)}%` : "0%"}
          </div>
        </div>
        
        {/* Power consumption or production */}
        {machine.type === 'generator' ? (
          <div className="power-view-item__stat">
            <div style={{ fontSize: "12px", color: theme.colors.textSecondary }}>
              Power Production
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: theme.colors.success }}>
              {formatPower(machine.powerProduction || 0)}
            </div>
          </div>
        ) : (
          <div className="power-view-item__stat">
            <div style={{ fontSize: "12px", color: theme.colors.textSecondary }}>
              Power Consumption
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: theme.colors.error }}>
              {formatPower(machine.powerConsumption || 0)}
            </div>
          </div>
        )}
      </div>
      
      {/* Progress bar for machine efficiency */}
      <div className="power-view-item__efficiency-bar" style={{ marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "12px" }}>Efficiency</span>
          <span style={{ fontSize: "12px", fontWeight: "bold" }}>{efficiency.toFixed(0)}%</span>
        </div>
        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: `${theme.colors.border}50`,
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              width: `${efficiency}%`,
              height: "100%",
              backgroundColor: efficiency >= 95 
                ? theme.colors.success 
                : efficiency >= 70 
                  ? theme.colors.warning 
                  : theme.colors.error,
              borderRadius: "4px",
            }}
          />
        </div>
      </div>
    </Card>
  );
};

export default React.memo(PowerViewItem); 