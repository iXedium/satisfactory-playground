import React, { useState, useRef, MouseEvent } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import EfficiencyIndicator from './EfficiencyIndicator';
import RateDisplay from './RateDisplay';
import ExcessControls from './ExcessControls';
import { findNodeConsumers, ConsumerInfo } from '../../utils/consumptionUtils';
import ConsumptionReportPopup from './ConsumptionReportPopup';
import { findNodeById } from '../../utils/treeUtils';

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
  
  // Find the specific node using treeId and nodeId
  const node = useSelector((state: RootState) => {
    const tree = state.dependencies.dependencyTrees[treeId];
    if (!tree) return null;
    return findNodeById(tree, nodeId);
  });

  const [isHoveringRate, setIsHoveringRate] = useState(false);
  const [consumptionData, setConsumptionData] = useState<ConsumerInfo[]>([]);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [totalDemand, setTotalDemand] = useState<number>(0);
  const hoverTimeoutRef = useRef<number | null>(null);
  const rateDisplayRef = useRef<HTMLDivElement>(null);
  
  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleRateMouseEnter = async (event: MouseEvent<HTMLDivElement>) => {
    clearHoverTimeout();

    if (!node) {
      console.warn(`[EfficiencySection] Node not found for ID: ${nodeId} in tree: ${treeId}`);
      return; // Don't proceed if node not found
    }
    
    // Determine the ID to fetch consumers for
    let idToFetch: string | null = null;
    if (node.isRoot) {
      idToFetch = node.uniqueId;
    } else if (node.importReference?.targetTreeId) {
      idToFetch = node.importReference.targetTreeId;
    } 
    // If it's neither root nor import, idToFetch remains null

    if (!idToFetch) {
      setConsumptionData([]); // Show empty consumption
      setTotalDemand(0);
      return; 
    }

    const targetElement = event.currentTarget;
    if (!targetElement) return;
    const rect = targetElement.getBoundingClientRect();

    const consumers = await findNodeConsumers(idToFetch, allTrees); // Use idToFetch
    const demand = consumers.reduce((sum, c) => sum + c.consumedAmount, 0);
    setConsumptionData(consumers);
    setTotalDemand(demand);

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
    // Remove timeout for immediate hide
    // hoverTimeoutRef.current = window.setTimeout(() => { 
      setIsHoveringRate(false);
      setConsumptionData([]); // Reset data immediately
      setPopupPosition(null);
      setTotalDemand(0);
    // }, 300); 
  };
  
  // Remove useEffect for timeout cleanup as it's no longer used

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
          <ConsumptionReportPopup 
            consumers={consumptionData} 
            sourceItemName={node?.id || itemName}
            totalDemand={totalDemand}
            sourceNodeExcess={node?.excess || excess}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default EfficiencySection; 