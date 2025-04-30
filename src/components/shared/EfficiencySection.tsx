import React, { useState, useRef, MouseEvent } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
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
  containerStyle?: React.CSSProperties;
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
  containerStyle,
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

  const rateDisplayCursorClass = (isByproduct || isImport) ? 'cursor-default' : '';

  return (
    <>
      <div
        className="efficiency-section"
        style={containerStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="efficiency-section-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CONTROLS FIRST (for Grid) */}
          {onExcessChange && !isByproduct && !isImport && onMaxExcess && onResetExcess && (
            <ExcessControls
              className="efficiency-excess-controls"
              excess={excess}
              onExcessChange={onExcessChange}
              onMaxExcess={onMaxExcess}
              onResetExcess={onResetExcess}
            />
          )}

          {/* RATE GROUP SECOND (for Grid) */}
          <div
            className="efficiency-rate-group"
          >
            {/* Efficiency */}
            <EfficiencyIndicator 
              efficiency={efficiency} 
              isByproduct={isByproduct} 
              isImport={isImport} 
            />

            {/* Rate */}
            <div 
              className={`rate-display-wrapper ${rateDisplayCursorClass}`}
              ref={rateDisplayRef} 
              onMouseEnter={handleRateMouseEnter}
              onMouseLeave={handleRateMouseLeave}
            >
              <RateDisplay 
                amount={amount}
                excess={excess}
                isByproduct={isByproduct}
                isImport={isImport}
              />
            </div>
          </div>
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