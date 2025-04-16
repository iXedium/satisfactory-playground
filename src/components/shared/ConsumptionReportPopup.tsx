import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import { ConsumerInfo } from '../../utils/consumptionUtils'; // Import the type
import Icon from '../Icon';

interface ConsumptionReportPopupProps {
  consumers: ConsumerInfo[];
  sourceItemName: string; // Add source item name for title
}

const ConsumptionReportPopup: React.FC<ConsumptionReportPopupProps> = ({ consumers, sourceItemName }) => {

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

  const amountStyle: React.CSSProperties = {
    marginLeft: 'auto', 
    color: theme.colors.textSecondary, 
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
            {/* <Icon itemId={consumer.consumerParentId} size="xsmall" /> */}
            <span>{consumer.consumerParentName}</span>
            {/* Optionally show tree ID if multiple trees exist? */}
            {/* <span style={{ fontSize: '10px', color: theme.colors.textSecondary, marginLeft: '4px' }}>({consumer.consumingTreeId.substring(0, 6)})</span> */}
            <span style={amountStyle}>{consumer.consumedAmount.toFixed(2)}</span>
          </div>
        ))
      )}
    </div>
  );
};

export default ConsumptionReportPopup; 