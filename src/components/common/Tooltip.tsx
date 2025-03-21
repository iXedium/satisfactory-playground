import React, { useState, useRef, useEffect } from 'react';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps {
  /**
   * Tooltip content
   */
  content: React.ReactNode;
  
  /**
   * Tooltip position
   */
  position?: TooltipPosition;
  
  /**
   * Delay before showing tooltip (ms)
   */
  delay?: number;
  
  /**
   * Whether tooltip is disabled
   */
  disabled?: boolean;
  
  /**
   * Max width of tooltip
   */
  maxWidth?: number;
  
  /**
   * Additional class name for tooltip
   */
  className?: string;
  
  /**
   * Element to wrap with tooltip
   */
  children: React.ReactElement;
}

/**
 * Tooltip component for displaying additional information
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 300,
  disabled = false,
  maxWidth = 250,
  className = '',
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Position the tooltip based on the position prop
  const getTooltipPosition = () => {
    if (!targetRef.current || !tooltipRef.current) return {};
    
    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    const positions = {
      top: {
        top: targetRect.top - tooltipRect.height - 8,
        left: targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2),
      },
      right: {
        top: targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2),
        left: targetRect.right + 8,
      },
      bottom: {
        top: targetRect.bottom + 8,
        left: targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2),
      },
      left: {
        top: targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2),
        left: targetRect.left - tooltipRect.width - 8,
      },
    };
    
    return positions[position];
  };
  
  // Show tooltip after delay
  const showTooltip = () => {
    if (disabled || !content) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };
  
  // Hide tooltip immediately
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsVisible(false);
  };
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Apply position after tooltip is visible
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const position = getTooltipPosition();
      Object.assign(tooltipRef.current.style, position);
    }
  }, [isVisible]);
  
  // Base tooltip styles
  const tooltipStyles = `
    absolute z-50 px-2 py-1 text-sm font-medium text-white
    bg-gray-900 rounded shadow-lg pointer-events-none
    opacity-0 transition-opacity duration-200
    ${isVisible ? 'opacity-100' : 'opacity-0'}
    ${className}
  `;
  
  // Arrow classes based on position
  const arrowClasses = {
    top: 'arrow-down',
    right: 'arrow-left',
    bottom: 'arrow-up',
    left: 'arrow-right',
  };
  
  return (
    <>
      <div 
        ref={targetRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={tooltipStyles}
          style={{ maxWidth }}
        >
          {content}
          <span className={`absolute ${arrowClasses[position]}`} />
        </div>
      )}
    </>
  );
};

export default Tooltip; 