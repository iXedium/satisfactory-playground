import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

interface RateDisplayProps {
  amount: number;
  excess: number;
  isByproduct?: boolean;
  isImport?: boolean;
  containerStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

const RateDisplay: React.FC<RateDisplayProps> = ({
  amount,
  excess,
  isByproduct = false,
  isImport = false,
  containerStyle,
  textStyle,
}) => {
  const totalAmount = amount + excess;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontWeight: 'bold',
        color: isByproduct ? theme.colors.nodeByproduct : isImport ? theme.colors.nodeImport : theme.colors.text,
        marginLeft: (isByproduct || isImport) ? 'auto' : sizes.spacing.small,
        ...containerStyle,
      }}
    >
      <span
        style={{
          fontSize: sizes.fontSize.large,
          ...textStyle,
        }}
      >
        {totalAmount.toFixed(2)}
      </span>
      {excess > 0 && !isByproduct && !isImport && (
         <span
           style={{
             fontSize: sizes.fontSize.small,
             color: theme.colors.textSecondary,
             marginTop: '-2px',
           }}
         >
           ({amount.toFixed(2)})
         </span>
      )}
    </div>
  );
};

export default RateDisplay; 