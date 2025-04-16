import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import EfficiencyIndicator from './EfficiencyIndicator';
import RateDisplay from './RateDisplay';
import ExcessControls from './ExcessControls';
import { findNodeConsumers, ConsumerInfo } from '../../utils/consumptionUtils';
import ConsumptionReportPopup from './ConsumptionReportPopup';

interface EfficiencySectionProps {
  efficiency: number;
  amount: number;
  excess: number;
  isByproduct?: boolean;
  isImport?: boolean;
  nodeId: string;
  treeId: string;
  itemName: string;
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
  excess,
  isByproduct = false,
  isImport = false,
  nodeId,
  treeId,
  itemName,
  onExcessChange,
  onMaxExcess,
  onResetExcess,
  getEfficiencyColor = () => theme.colors.efficiency.perfect,
  containerStyle,
  contentStyle,
}) => {
  const allTrees = useSelector((state: RootState) => state.dependencies.dependencyTrees);
  const [isHoveringRate, setIsHoveringRate] = useState(false);
  const [consumptionData, setConsumptionData] = useState<ConsumerInfo[]>([]);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const rateDisplayRef = useRef<HTMLDivElement>(null);
  
  const handleRateMouseEnter = async (event: MouseEvent<HTMLDivElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (isByproduct || isImport) return; 
    
    const targetElement = event.currentTarget;
    if (!targetElement) return;
    const rect = targetElement.getBoundingClientRect();

    const consumers = await findNodeConsumers(nodeId, treeId, allTrees);
    setConsumptionData(consumers);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedPopupWidth = 250;
    const estimatedPopupHeight = 100;
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX + 5;

    if (left + estimatedPopupWidth > viewportWidth) {
      left = rect.right + window.scrollX - estimatedPopupWidth - 5;
    }
    if (top + estimatedPopupHeight > viewportHeight) {
      top = rect.top + window.scrollY - estimatedPopupHeight - 5;
    }
    if (left < 0) left = 5;
    if (top < 0) top = 5;

    setPopupPosition({ top, left });
    setIsHoveringRate(true);
  };

  const handleRateMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHoveringRate(false);
      setConsumptionData([]);
      setPopupPosition(null);
    }, 150);
  };
  
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
    <>
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
            <div 
              ref={rateDisplayRef} 
              onMouseEnter={handleRateMouseEnter}
              onMouseLeave={handleRateMouseLeave}
              style={{ cursor: (isByproduct || isImport) ? 'default' : 'help' }}
            >
              <RateDisplay 
                amount={amount}
                excess={excess}
                isByproduct={isByproduct}
                isImport={isImport}
              />
            </div>
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
      
      {isHoveringRate && popupPosition && consumptionData && ReactDOM.createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${popupPosition.top}px`, 
            left: `${popupPosition.left}px`, 
            zIndex: 10000
          }} 
        >
          <ConsumptionReportPopup consumers={consumptionData} sourceItemName={itemName} />
        </div>,
        document.body
      )}
    </>
  );
};

export default EfficiencySection; 