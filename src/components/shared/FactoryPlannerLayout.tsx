import React, { ReactNode } from 'react';
// Removed theme import as background is no longer set here

interface FactoryPlannerLayoutProps {
  commandBar: ReactNode;
  content: ReactNode;
  sidebar?: ReactNode; // Add optional sidebar prop
  commandBarHeight: number; // Add prop for height
  containerStyle?: React.CSSProperties;
  commandBarContainerStyle?: React.CSSProperties;
  contentContainerStyle?: React.CSSProperties;
}

/**
 * Layout component for the Factory Planner application
 * Handles the overall layout structure with command bar and content areas
 */
const FactoryPlannerLayout: React.FC<FactoryPlannerLayoutProps> = ({
  commandBar,
  content,
  sidebar, // Destructure sidebar prop
  commandBarHeight, // Destructure prop
  containerStyle,
  commandBarContainerStyle,
  contentContainerStyle
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      ...containerStyle
    }}>
      {/* Command Bar Container - Absolute within layout */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100, 
        ...commandBarContainerStyle
      }}>
        {commandBar}
      </div>
      
      {/* Main Content Area (Flex Container below Command Bar) */}
      <div style={{
        display: 'flex',
        flex: 1, // Grow to fill remaining vertical space
        marginTop: `${commandBarHeight}px`, 
        overflow: 'hidden', // Prevent this container from scrolling, children handle it
        ...contentContainerStyle // Apply outer styles here
      }}>
        {/* Content (Tree View) */}
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}> {/* Allow shrinking, ensure height */}
            {content} {/* PlannerContent goes here, handles its own scroll */} 
        </div>
        
        {/* Sidebar (Conditionally Rendered) */}
        {sidebar && (
            <div style={{ height: '100%' }}> {/* Ensure sidebar takes full height */} 
                {sidebar} {/* SummarySidebar goes here, handles its own scroll */} 
            </div>
        )}
      </div>
    </div>
  );
};

export default FactoryPlannerLayout; 