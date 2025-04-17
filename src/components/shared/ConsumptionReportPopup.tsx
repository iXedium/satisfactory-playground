import React, { useMemo } from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import { ConsumerInfo } from '../../utils/consumptionUtils'; // Import the type
import Icon from '../Icon';

interface ConsumptionReportPopupProps {
  consumers: ConsumerInfo[];
  sourceItemName: string; // Add source item name for title
  totalDemand: number; // Add total demand for percentage calculation
  sourceNodeExcess: number; // Add source node's excess
}

const ConsumptionReportPopup: React.FC<ConsumptionReportPopupProps> = ({ consumers, sourceItemName, totalDemand, sourceNodeExcess }) => {

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker, 
    border: `1px solid ${theme.colors.border}`, 
    borderRadius: theme.border.radius,
    padding: sizes.spacing.medium, 
    display: 'flex',
    flexDirection: 'column',
    gap: sizes.spacing.small, 
    color: theme.colors.text,
    fontSize: sizes.fontSize.small,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)', 
    minWidth: '220px', // Slightly wider for more info
    maxWidth: '350px',
    zIndex: sizes.zIndex.tooltip, 
    pointerEvents: 'none', // Allow mouse events to pass through
  };
  
  const titleStyle: React.CSSProperties = {
    margin: `0 0 ${sizes.spacing.small} 0`, 
    paddingBottom: sizes.spacing.small, 
    textAlign: 'center', 
    borderBottom: `1px solid ${theme.colors.border}`,
    fontWeight: 'bold',
    fontSize: sizes.fontSize.standard, 
    color: theme.colors.textLight, 
  };

  const itemLineStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: sizes.spacing.small,
    padding: `${sizes.spacing.xsmall} 0`, // Add vertical padding
  };

  const nameStyle: React.CSSProperties = {
    marginRight: 'auto', // Push name to left, amount/percentage group to right
    flexShrink: 0, 
  };

  const amountStyle: React.CSSProperties = {
    color: theme.colors.textSecondary, 
    textAlign: 'right',
    minWidth: '50px', // Adjust width for amount only
  };

  const percentageStyle: React.CSSProperties = {
    color: theme.colors.textSecondary,
    fontSize: sizes.fontSize.small, 
    minWidth: '35px', // Adjust width for percentage only
    textAlign: 'right',
    marginRight: sizes.spacing.small, // Add small space between percentage and amount
  };
  
  // New style for the amount/percentage group
  const valueGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline', // Align text baseline
    marginLeft: 'auto', // Push this group to the right
  };

  // Helper to calculate percentage relative to the net amount (totalDemand)
  const calculatePercentage = (part: number): string => {
      // Handle zero or near-zero totalDemand
      if (Math.abs(totalDemand) < 1e-9) { 
          // If the part is also zero, it's 0%. If part is non-zero and total is zero,
          // percentage is infinite, which isn't meaningful. Show '--%' or similar.
          return Math.abs(part) < 1e-9 ? '(0%)' : '(--%)'; 
      }
      
      // Calculate percentage relative to totalDemand, keep the sign
      const percentage = (part / totalDemand) * 100;
      
      // Handle potential NaN/Infinity (should be less likely now but keep safeguard)
      if (!isFinite(percentage)) return '(--%)'; 
      
      return `(${percentage.toFixed(0)}%)`; // Rounded percentage
  };

  return (
    <div style={sectionStyle}>
      <h4 style={titleStyle}>
        Consumed By ({sourceItemName}):
      </h4>
      
      {consumers.length === 0 ? (
        <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
          Not consumed by other nodes.
        </div>
      ) : (
        consumers.map((consumer, index) => (
          <div key={`${consumer.consumingTreeId}-${consumer.consumerNodeId}-${index}`} style={itemLineStyle}>
            {/* Optionally add icon of the consuming parent */}
            <Icon itemId={consumer.consumerParentId} size="xsmall" />
            <span style={nameStyle}>{consumer.consumerParentName}</span>
            {/* Group percentage and amount */}
            <div style={valueGroupStyle}>
              {/* Pass only the part to calculatePercentage */}
              <span style={percentageStyle}>{calculatePercentage(consumer.consumedAmount)}</span>
              <span style={amountStyle}>{consumer.consumedAmount.toFixed(2)}</span>
            </div>
          </div>
        ))
      )}
      
      {/* Display Excess Demand if applicable */}
      {sourceNodeExcess > 0.01 && ( // Use a small threshold to avoid displaying tiny rounding errors
        <div key="excess-demand" style={{...itemLineStyle, marginTop: sizes.spacing.small, borderTop: `1px dashed ${theme.colors.border}` , paddingTop: sizes.spacing.small}}>
            <Icon itemId={sourceItemName} size="tiny" showWrapper={false}  /> {/* Icon of the source item */}
            <span style={nameStyle}>Excess:</span>
            {/* Group percentage and amount */}
            <div style={valueGroupStyle}>
              {/* Pass only the part to calculatePercentage */}
              <span style={percentageStyle}>{calculatePercentage(sourceNodeExcess)}</span>
              <span style={amountStyle}>{sourceNodeExcess.toFixed(2)}</span>
            </div>
        </div>
      )}
    </div>
  );
};

export default ConsumptionReportPopup; 