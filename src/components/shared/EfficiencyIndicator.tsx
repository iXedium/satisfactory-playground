import React, { useState } from 'react';
import { theme } from '../../styles/theme';

interface EfficiencyIndicatorProps {
  efficiency: number;
  isByproduct?: boolean;
  isImport?: boolean;
}

const EfficiencyIndicator: React.FC<EfficiencyIndicatorProps> = ({
  efficiency,
  isByproduct = false,
  isImport = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getEfficiencyColor = () => {
    if (efficiency > 100) return theme.colors.efficiency.over;
    if (efficiency < 100) return theme.colors.efficiency.under;
    return theme.colors.efficiency.perfect;
  };

  const copyEfficiencyValue = () => {
    const decimalValue = efficiency / 100;
    navigator.clipboard.writeText(decimalValue.toString());
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2000);
  };

  if (isImport) {
    return (
      <span style={{ 
        color: theme.colors.nodeImport,
        fontWeight: "bold",
        fontSize: "14px"
      }}>
        Imported
      </span>
    );
  }

  if (isByproduct) {
    return (
      <span style={{ 
        color: theme.colors.nodeByproduct,
        fontWeight: "bold",
        fontSize: "14px"
      }}>
        Byproduct
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: 2,
      }}
    >
      <span
        style={{
          color: getEfficiencyColor(),
          cursor: "pointer",
          fontWeight: "bold",
          position: "relative",
          marginLeft: "0px",
          zIndex: 2,
          fontSize: "16px",
        }}
        onClick={(e) => {
          e.stopPropagation();
          copyEfficiencyValue();
        }}
        title="Click to copy decimal value"
      >
        {efficiency.toFixed(2)}%
        {showTooltip && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              right: "0",
              backgroundColor: theme.colors.dark,
              padding: "4px 8px",
              borderRadius: theme.border.radius,
              fontSize: "12px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              zIndex: 10,
            }}
          >
            Copied!
          </div>
        )}
      </span>
    </div>
  );
};

export default EfficiencyIndicator; 