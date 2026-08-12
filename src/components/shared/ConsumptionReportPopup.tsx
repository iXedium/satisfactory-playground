import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import { ConsumerInfo } from '../../utils/consumptionUtils'; // Import the type
import Icon from '../Icon';
import { setHighlightedNode } from '../../features/factory-planner/store/dependencySlice';
import { PlannerAppDispatch } from '../../store/plannerStore';
import { logger } from '../../utils/logger';
import { useTreeNavigation } from '../../contexts/TreeNavigationContext';

// Separate component for each consumer item to handle hover state
interface ConsumerItemProps {
  consumer: ConsumerInfo;
  itemLineStyle: React.CSSProperties;
  itemLineHoverStyle: React.CSSProperties;
  isPersistent: boolean;
  nameStyle: React.CSSProperties;
  valueGroupStyle: React.CSSProperties;
  percentageStyle: React.CSSProperties;
  amountStyle: React.CSSProperties;
  calculatePercentage: (part: number) => string;
  onClick: (consumer: ConsumerInfo) => void;
}

const ConsumerItem: React.FC<ConsumerItemProps> = ({
  consumer,
  itemLineStyle,
  itemLineHoverStyle,
  isPersistent,
  nameStyle,
  valueGroupStyle,
  percentageStyle,
  amountStyle,
  calculatePercentage,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      style={{
        ...itemLineStyle,
        ...(isPersistent && isHovered ? itemLineHoverStyle : {}),
      }}
      onClick={() => onClick(consumer)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Icon itemId={consumer.consumerParentId} size="xsmall" />
      <span style={nameStyle}>{consumer.consumerParentName}</span>
      <div style={valueGroupStyle}>
        <span style={percentageStyle}>{calculatePercentage(consumer.consumedAmount)}</span>
        <span style={amountStyle}>{consumer.consumedAmount.toFixed(2)}</span>
      </div>
    </div>
  );
};

interface ConsumptionReportPopupProps {
  consumers: ConsumerInfo[];
  sourceItemName: string; // Add source item name for title
  totalDemand: number; // Add total demand for percentage calculation
  sourceNodeExcess: number; // Add source node's excess
  isPersistent?: boolean; // Whether popup is in persistent mode (clicked)
  onItemClick?: (consumingTreeId: string, consumerNodeId: string) => void; // Callback when item clicked
}

const ConsumptionReportPopup: React.FC<ConsumptionReportPopupProps> = ({ 
  consumers, 
  sourceItemName, 
  totalDemand, 
  sourceNodeExcess,
  isPersistent = false,
  onItemClick,
}) => {
  const dispatch = useDispatch<PlannerAppDispatch>();
  const { requestNavigateToNode } = useTreeNavigation();

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
    pointerEvents: isPersistent ? 'auto' : 'none', // Allow mouse events when persistent
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
    padding: `${sizes.spacing.xsmall} ${sizes.spacing.small}`, // Add horizontal padding
    cursor: isPersistent ? 'pointer' : 'default',
    borderRadius: theme.border.radius,
    transition: 'background-color 0.15s ease',
  };

  const itemLineHoverStyle: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
  };

  const handleItemClick = (consumer: ConsumerInfo) => {
    logger.debug('[ConsumptionReportPopup] handleItemClick called', { 
      isPersistent, 
      consumerNodeId: consumer.consumerNodeId,
      consumingTreeId: consumer.consumingTreeId 
    });
    
    if (!isPersistent) {
      logger.debug('[ConsumptionReportPopup] Not persistent, ignoring click');
      return;
    }
    
    // Request navigation to the consumer node
    // This will expand all parent nodes and then scroll to the target
    logger.debug('[ConsumptionReportPopup] Requesting navigation to node');
    requestNavigateToNode(consumer.consumerNodeId, consumer.consumingTreeId);
    
    // Call the callback to close the popup
    logger.debug('[ConsumptionReportPopup] Calling onItemClick callback');
    onItemClick?.(consumer.consumingTreeId, consumer.consumerNodeId);
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
          <ConsumerItem
            key={`${consumer.consumingTreeId}-${consumer.consumerNodeId}-${index}`}
            consumer={consumer}
            itemLineStyle={itemLineStyle}
            itemLineHoverStyle={itemLineHoverStyle}
            isPersistent={isPersistent}
            nameStyle={nameStyle}
            valueGroupStyle={valueGroupStyle}
            percentageStyle={percentageStyle}
            amountStyle={amountStyle}
            calculatePercentage={calculatePercentage}
            onClick={handleItemClick}
          />
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