import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';

interface RateDisplayProps {
  amount: number;
  excess: number;
  isByproduct?: boolean;
  isImport?: boolean;
  isExternal?: boolean;
  isCyclicReference?: boolean;
  cycleResolution?: {
    grossRequirement: number;
    netRequirement: number;
    recirculated: number;
  };
  containerStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

const RateDisplay: React.FC<RateDisplayProps> = ({
  amount,
  excess,
  isByproduct = false,
  isImport = false,
  isExternal = false,
  isCyclicReference = false,
  cycleResolution,
  containerStyle,
  textStyle,
}) => {
  const totalAmount = amount + excess;

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(2);
    return fixed === '-0.00' ? '0.00' : fixed;
  };

  let secondaryText = '';
  if (isCyclicReference && cycleResolution) {
    secondaryText = `♻️ ${formatNumber(cycleResolution.recirculated)}/min recirculated`;
  } else if (excess > 1e-9 && !isByproduct && !isImport && !isExternal) {
    secondaryText = `(${formatNumber(excess)})`;
  } else if (isExternal) {
    secondaryText = `(external)`;
  } else if (isByproduct) {
    secondaryText = `(byproduct)`;
  } else if (isImport) {
    secondaryText = `(local)`;
  } 

  // Determine text color — cyclic nodes get teal-green
  const getColor = () => {
    if (isCyclicReference) return theme.colors.nodeCyclicRecycle;
    if (isExternal) return theme.colors.nodeExternalImport;
    if (isByproduct) return theme.colors.nodeByproduct;
    if (isImport) return theme.colors.nodeImport;
    return theme.colors.text;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontWeight: 'bold',
        color: getColor(),
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
             color: isCyclicReference ? theme.colors.nodeCyclicRecycle : theme.colors.textSecondary,
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