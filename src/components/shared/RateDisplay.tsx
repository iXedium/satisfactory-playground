import React from 'react';
import { theme } from '../../styles/theme';

interface RateDisplayProps {
  amount: number;
  isByproduct?: boolean;
  isImport?: boolean;
}

const RateDisplay: React.FC<RateDisplayProps> = ({
  amount,
  isByproduct = false,
  isImport = false,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontWeight: "bold",
        color: isByproduct ? theme.colors.nodeByproduct : isImport ? theme.colors.nodeImport : theme.colors.text,
        marginLeft: (isByproduct || isImport) ? "auto" : "4px",
        fontSize: "16px",
      }}
    >
      <span>{amount.toFixed(2)}</span>
    </div>
  );
};

export default RateDisplay; 