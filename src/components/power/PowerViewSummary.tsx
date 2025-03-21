/**
 * PowerViewSummary Component
 * 
 * Displays summary information for power consumption across all machines
 */

import React, { useMemo } from "react";
import { Machine } from "../../types/core";
import Card from "../common/Card";
import { theme } from "../../styles/theme";

export interface PowerViewSummaryProps {
  /**
   * List of machines to summarize
   */
  machines: Machine[];
  
  /**
   * Filters for machine types
   */
  filters: {
    showManufacturerMk1: boolean;
    showManufacturerMk2: boolean;
    showManufacturerMk3: boolean;
    showExtractors: boolean;
    showGenerators: boolean;
  };
}

/**
 * Summary component for the power view showing total power consumption and other statistics
 */
const PowerViewSummary: React.FC<PowerViewSummaryProps> = ({
  machines,
  filters,
}) => {
  // Calculate power statistics based on current filters
  const powerStats = useMemo(() => {
    // Filter machines based on current filters
    const filteredMachines = machines.filter(machine => {
      if (machine.type === 'manufacturer-mk1' && !filters.showManufacturerMk1) return false;
      if (machine.type === 'manufacturer-mk2' && !filters.showManufacturerMk2) return false;
      if (machine.type === 'manufacturer-mk3' && !filters.showManufacturerMk3) return false;
      if (machine.type === 'extractor' && !filters.showExtractors) return false;
      if (machine.type === 'generator' && !filters.showGenerators) return false;
      return true;
    });
    
    // Calculate totals
    return {
      totalMachines: filteredMachines.length,
      totalPowerConsumption: filteredMachines.reduce((sum, machine) => 
        sum + (machine.powerConsumption || 0), 0),
      totalPowerProduction: filteredMachines.reduce((sum, machine) => 
        machine.type === 'generator' ? sum + (machine.powerProduction || 0) : sum, 0),
      powerBalance: filteredMachines.reduce((sum, machine) => 
        machine.type === 'generator' 
          ? sum + (machine.powerProduction || 0) 
          : sum - (machine.powerConsumption || 0), 0),
      byMachineType: {
        manufacturerMk1: filteredMachines.filter(m => m.type === 'manufacturer-mk1').length,
        manufacturerMk2: filteredMachines.filter(m => m.type === 'manufacturer-mk2').length,
        manufacturerMk3: filteredMachines.filter(m => m.type === 'manufacturer-mk3').length,
        extractors: filteredMachines.filter(m => m.type === 'extractor').length,
        generators: filteredMachines.filter(m => m.type === 'generator').length,
      }
    };
  }, [machines, filters]);
  
  // Format power values with units
  const formatPower = (power: number): string => {
    if (power >= 1000) {
      return `${(power / 1000).toFixed(1)} GW`;
    }
    return `${power.toFixed(1)} MW`;
  };
  
  return (
    <Card 
      title="Power Summary"
      style={{ marginBottom: "16px" }}
    >
      <div className="power-view-summary">
        <div className="power-view-summary__grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}>
          {/* Total machines */}
          <div className="power-view-summary__stat">
            <div style={{ fontSize: "14px", color: theme.colors.textSecondary }}>Total Machines</div>
            <div style={{ fontSize: "20px", fontWeight: "bold" }}>{powerStats.totalMachines}</div>
          </div>
          
          {/* Power consumption */}
          <div className="power-view-summary__stat">
            <div style={{ fontSize: "14px", color: theme.colors.textSecondary }}>Power Consumption</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: theme.colors.error }}>
              {formatPower(powerStats.totalPowerConsumption)}
            </div>
          </div>
          
          {/* Power production */}
          <div className="power-view-summary__stat">
            <div style={{ fontSize: "14px", color: theme.colors.textSecondary }}>Power Production</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: theme.colors.success }}>
              {formatPower(powerStats.totalPowerProduction)}
            </div>
          </div>
          
          {/* Power balance */}
          <div className="power-view-summary__stat">
            <div style={{ fontSize: "14px", color: theme.colors.textSecondary }}>Power Balance</div>
            <div style={{ 
              fontSize: "20px", 
              fontWeight: "bold", 
              color: powerStats.powerBalance >= 0 ? theme.colors.success : theme.colors.error 
            }}>
              {formatPower(powerStats.powerBalance)}
            </div>
          </div>
        </div>
        
        {/* Machine type breakdown */}
        <div style={{ marginTop: "16px", padding: "12px", backgroundColor: `${theme.colors.border}20`, borderRadius: theme.border.radius }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Machine Breakdown</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {filters.showManufacturerMk1 && (
              <div className="power-view-summary__type">
                <span style={{ 
                  width: "8px", 
                  height: "8px", 
                  backgroundColor: theme.colors.mk1,
                  borderRadius: "50%",
                  display: "inline-block",
                  marginRight: "6px",
                }}></span>
                Mk1: {powerStats.byMachineType.manufacturerMk1}
              </div>
            )}
            
            {filters.showManufacturerMk2 && (
              <div className="power-view-summary__type">
                <span style={{ 
                  width: "8px", 
                  height: "8px", 
                  backgroundColor: theme.colors.mk2,
                  borderRadius: "50%",
                  display: "inline-block",
                  marginRight: "6px",
                }}></span>
                Mk2: {powerStats.byMachineType.manufacturerMk2}
              </div>
            )}
            
            {filters.showManufacturerMk3 && (
              <div className="power-view-summary__type">
                <span style={{ 
                  width: "8px", 
                  height: "8px", 
                  backgroundColor: theme.colors.mk3,
                  borderRadius: "50%",
                  display: "inline-block",
                  marginRight: "6px",
                }}></span>
                Mk3: {powerStats.byMachineType.manufacturerMk3}
              </div>
            )}
            
            {filters.showExtractors && (
              <div className="power-view-summary__type">
                <span style={{ 
                  width: "8px", 
                  height: "8px", 
                  backgroundColor: theme.colors.extractor,
                  borderRadius: "50%",
                  display: "inline-block",
                  marginRight: "6px",
                }}></span>
                Extractors: {powerStats.byMachineType.extractors}
              </div>
            )}
            
            {filters.showGenerators && (
              <div className="power-view-summary__type">
                <span style={{ 
                  width: "8px", 
                  height: "8px", 
                  backgroundColor: theme.colors.generator,
                  borderRadius: "50%",
                  display: "inline-block",
                  marginRight: "6px",
                }}></span>
                Generators: {powerStats.byMachineType.generators}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default React.memo(PowerViewSummary); 