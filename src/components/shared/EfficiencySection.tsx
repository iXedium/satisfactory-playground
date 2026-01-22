import React, { useState, useRef, MouseEvent, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import EfficiencyIndicator from './EfficiencyIndicator';
import RateDisplay from './RateDisplay';
import ExcessControls from './ExcessControls';
import { findNodeConsumers, ConsumerInfo } from '../../utils/consumptionUtils';
import ConsumptionReportPopup from './ConsumptionReportPopup';
import { findNodeById } from '../../utils/treeUtils';
import { logger } from '../../utils/logger';

interface EfficiencySectionProps {
  efficiency: number;
  amount: number;
  excess: number;
  isByproduct?: boolean;
  isImport?: boolean;
  parentNodeId?: string;           // Parent node ID (for import controls)
  hasMultipleImportSources?: boolean;  // True if multiple sources for same item
  nodeId: string;
  treeId: string;
  itemName: string;
  onExcessChange?: (value: number) => void;
  onMaxExcess?: () => void;
  onResetExcess?: () => void;
  // Import amount controls (reusing same pattern as excess)
  onImportAmountChange?: (value: number) => void;
  onMaxImport?: () => void;
  onResetImport?: () => void;
  containerStyle?: React.CSSProperties;
}

const EfficiencySection: React.FC<EfficiencySectionProps> = ({
  efficiency,
  amount,
  excess,
  isByproduct = false,
  isImport = false,
  parentNodeId,
  hasMultipleImportSources = false,
  nodeId,
  treeId,
  itemName,
  onExcessChange,
  onMaxExcess,
  onResetExcess,
  onImportAmountChange,
  onMaxImport,
  onResetImport,
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
  const [isPersistent, setIsPersistent] = useState(false); // Whether popup is pinned/persistent
  const [consumptionData, setConsumptionData] = useState<ConsumerInfo[]>([]);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [totalDemand, setTotalDemand] = useState<number>(0);
  const hoverTimeoutRef = useRef<number | null>(null);
  const rateDisplayRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  
  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Close popup when clicking outside (only when persistent)
  useEffect(() => {
    if (!isPersistent) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is inside the popup
      if (popupRef.current && popupRef.current.contains(target)) {
        return; // Don't close, let the popup handle the click
      }
      // Check if click is on the rate display (re-clicking should also close)
      if (rateDisplayRef.current && rateDisplayRef.current.contains(target)) {
        return; // Let the click handler toggle it off
      }
      // Click is outside, close the popup
      setIsPersistent(false);
      setIsHoveringRate(false);
      setConsumptionData([]);
      setPopupPosition(null);
      setTotalDemand(0);
    };

    document.addEventListener('mousedown', handleClickOutside as unknown as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as unknown as EventListener);
    };
  }, [isPersistent]);

  const handleRateMouseEnter = async (event: MouseEvent<HTMLDivElement>) => {
    clearHoverTimeout();

    if (!node) {
      logger.warn(`[EfficiencySection] Node not found for ID: ${nodeId} in tree: ${treeId}`);
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

  // Handle click to make popup persistent
  const handleRateClick = async (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    
    if (isPersistent) {
      // Already persistent, clicking again closes it
      setIsPersistent(false);
      setIsHoveringRate(false);
      setConsumptionData([]);
      setPopupPosition(null);
      setTotalDemand(0);
      return;
    }

    // Make popup persistent - need to fetch data if not already shown
    if (!isHoveringRate) {
      // Fetch the data first
      await handleRateMouseEnter(event);
    }
    setIsPersistent(true);
  };

  // Handle when an item in the popup is clicked
  const handlePopupItemClick = useCallback(() => {
    // Close the popup after scrolling to the item
    setIsPersistent(false);
    setIsHoveringRate(false);
    setConsumptionData([]);
    setPopupPosition(null);
    setTotalDemand(0);
  }, []);

  const handleRateMouseLeave = () => {
    // Don't close if popup is persistent
    if (isPersistent) return;
    
    setIsHoveringRate(false);
    setConsumptionData([]); // Reset data immediately
    setPopupPosition(null);
    setTotalDemand(0); 
  };
  
  // Remove useEffect for timeout cleanup as it's no longer used

  const rateDisplayCursorClass = (isByproduct || isImport) ? 'cursor-default' : 'cursor-pointer';

  // Show import controls for multi-source imports (reuse ExcessControls component)
  const showImportControls = isImport && hasMultipleImportSources && parentNodeId && onImportAmountChange && onMaxImport && onResetImport;

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

          {/* Import Controls for multi-source imports - reusing ExcessControls */}
          {showImportControls && (
            <ExcessControls
              className="efficiency-import-controls"
              excess={amount}
              onExcessChange={onImportAmountChange}
              onMaxExcess={onMaxImport}
              onResetExcess={onResetImport}
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

            {/* Rate - click to pin the consumption popup */}
            <div 
              className={`rate-display-wrapper ${rateDisplayCursorClass}`}
              ref={rateDisplayRef} 
              onMouseEnter={handleRateMouseEnter}
              onMouseLeave={handleRateMouseLeave}
              onClick={handleRateClick}
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
      
      {(isHoveringRate || isPersistent) && popupPosition && consumptionData && ReactDOM.createPortal(
        <div 
          ref={popupRef}
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
            isPersistent={isPersistent}
            onItemClick={handlePopupItemClick}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default EfficiencySection; 