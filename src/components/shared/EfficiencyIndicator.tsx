import React, { useState } from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

interface EfficiencyIndicatorProps {
  efficiency: number;
  isByproduct?: boolean;
  isImport?: boolean;
  containerStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

const EfficiencyIndicator: React.FC<EfficiencyIndicatorProps> = ({
  efficiency,
  isByproduct = false,
  isImport = false,
  containerStyle,
  textStyle,
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
        fontSize: sizes.fontSize.standard,
        ...textStyle
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
        fontSize: sizes.fontSize.standard,
        ...textStyle
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
        zIndex: sizes.zIndex.controls,
        ...containerStyle
      }}
    >
      <span
        style={{
          color: getEfficiencyColor(),
          cursor: "pointer",
          fontWeight: "bold",
          position: "relative",
          marginLeft: "0px",
          zIndex: sizes.zIndex.controls,
          fontSize: sizes.fontSize.large,
          ...textStyle
        }}
        onClick={(e) => {
          e.stopPropagation();
          copyEfficiencyValue();
        }}
        title={`Efficiency: ${(efficiency / 100).toFixed(4)}`}
      >
        {efficiency.toFixed(2)}%
        {showTooltip && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              right: "0",
              backgroundColor: theme.colors.dark,
              padding: `${sizes.spacing.small} ${sizes.spacing.medium}`,
              borderRadius: theme.border.radius,
              fontSize: sizes.fontSize.small,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              zIndex: sizes.zIndex.tooltip,
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