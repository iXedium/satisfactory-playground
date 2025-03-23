import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

interface RateDisplayProps {
  amount: number;
  isByproduct?: boolean;
  isImport?: boolean;
  containerStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

const RateDisplay: React.FC<RateDisplayProps> = ({
  amount,
  isByproduct = false,
  isImport = false,
  containerStyle,
  textStyle,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontWeight: "bold",
        color: isByproduct ? theme.colors.nodeByproduct : isImport ? theme.colors.nodeImport : theme.colors.text,
        marginLeft: (isByproduct || isImport) ? "auto" : sizes.spacing.small,
        fontSize: sizes.fontSize.large,
        ...containerStyle
      }}
    >
      <span style={{...textStyle}}>{amount.toFixed(2)}</span>
    </div>
  );
};

export default RateDisplay; 