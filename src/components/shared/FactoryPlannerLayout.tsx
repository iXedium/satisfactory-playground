import React, { ReactNode } from 'react';
// Removed theme import as background is no longer set here

interface FactoryPlannerLayoutProps {
  commandBar: ReactNode;
  content: ReactNode;
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
  commandBarHeight, // Destructure prop
  containerStyle,
  commandBarContainerStyle,
  contentContainerStyle
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      // minHeight: '100vh', // Body handles height/scroll now
      width: '100%',
      position: 'relative',
      ...containerStyle
    }}>
      {/* Command Bar Container - Fixed Position */}
      <div style={{
        position: 'fixed', // Change from sticky
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 100, // Increase z-index as per suggestion
        // backgroundColor: theme.colors.background, // Removed, handled by CommandBar
        ...commandBarContainerStyle
      }}>
        {commandBar}
      </div>
      
      {/* Content Container - Dynamic Margin Top */}
      <div style={{
        // flex: 1, // Removed
        // overflow: 'auto', // Removed, body handles scroll
        padding: '8px', // Keep padding for content spacing
        marginTop: `${commandBarHeight}px`, // Use dynamic height
        ...contentContainerStyle
      }}>
        {content}
      </div>
    </div>
  );
};

export default FactoryPlannerLayout; 