import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import EfficiencyIndicator from './EfficiencyIndicator';
import RateDisplay from './RateDisplay';
import ExcessControls from './ExcessControls';

interface EfficiencySectionProps {
  efficiency: number;
  amount: number;
  isByproduct?: boolean;
  isImport?: boolean;
  excess?: number;
  onExcessChange?: (value: number) => void;
  onMaxExcess?: () => void;
  onResetExcess?: () => void;
  getEfficiencyColor?: () => string;
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}

const EfficiencySection: React.FC<EfficiencySectionProps> = ({
  efficiency,
  amount,
  isByproduct = false,
  isImport = false,
  excess = 0,
  onExcessChange,
  onMaxExcess,
  onResetExcess,
  getEfficiencyColor = () => theme.colors.efficiency.perfect,
  containerStyle,
  contentStyle,
}) => {
  // Section container styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.border.radius,
    border: `1px solid ${theme.colors.dropdown.border}`,
    padding: `${sizes.spacing.medium} ${sizes.spacing.small}`,
    display: "flex",
    alignItems: "center",
    height: "100%",
    borderLeft: `4px solid ${!isByproduct && !isImport 
      ? getEfficiencyColor() 
      : isByproduct 
        ? theme.colors.nodeByproduct 
        : theme.colors.nodeImport}`,
    flex: 1,
    minWidth: "140px",
    maxWidth: "180px",
    position: "relative",
    zIndex: sizes.zIndex.base,
    ...containerStyle
  };

  return (
    <div
      style={sectionStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          gap: sizes.spacing.large,
          position: "relative",
          zIndex: sizes.zIndex.base,
          justifyContent: (isByproduct || isImport) ? "center" : "flex-start",
          ...contentStyle
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* First row: Efficiency and Rate */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Efficiency */}
          <EfficiencyIndicator 
            efficiency={efficiency} 
            isByproduct={isByproduct} 
            isImport={isImport} 
          />

          {/* Rate */}
          <RateDisplay 
            amount={amount}
            excess={excess}
            isByproduct={isByproduct}
            isImport={isImport}
          />
        </div>

        {/* Second row: Excess controls */}
        {onExcessChange && !isByproduct && !isImport && onMaxExcess && onResetExcess && (
          <ExcessControls
            excess={excess}
            onExcessChange={onExcessChange}
            onMaxExcess={onMaxExcess}
            onResetExcess={onResetExcess}
          />
        )}
      </div>
    </div>
  );
};

export default EfficiencySection; 