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

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(2);
    return fixed === '-0.00' ? '0.00' : fixed;
  };

  let secondaryText = '';
  if (excess > 1e-9 && !isByproduct && !isImport) {
    secondaryText = `(${formatNumber(excess)})`;
  } else if (isByproduct) {
    secondaryText = `(byproduct)`;
  } else if (isImport) {
    secondaryText = `(import)`;
  } 
  // else if (amount > 1e-9 && !isByproduct && !isImport) {
  //   secondaryText = `(f: ${formatNumber(amount)})`;
  // }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontWeight: 'bold',
        color: isByproduct ? theme.colors.nodeByproduct : isImport ? theme.colors.nodeImport : theme.colors.text,
        marginLeft: sizes.spacing.small,
        ...containerStyle,
      }}
    >
      <span
        style={{
          fontSize: sizes.fontSize.large,
          ...textStyle,
        }}
      >
        {formatNumber(totalAmount)}
      </span>
      {secondaryText && (
         <span
           style={{
             fontSize: sizes.fontSize.small,
             color: theme.colors.textSecondary,
             marginTop: '-2px',
           }}
         >
           {secondaryText}
         </span>
      )}
    </div>
  );
};

export default RateDisplay; 