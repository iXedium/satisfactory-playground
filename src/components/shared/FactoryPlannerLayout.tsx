import React, { ReactNode } from 'react';
// Removed theme import as background is no longer set here

interface FactoryPlannerLayoutProps {
  commandBar: ReactNode;
  tabBar?: ReactNode;
  content: ReactNode;
  sidebar?: ReactNode;
  commandBarHeight: number;
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
  tabBar,
  content,
  sidebar,
  commandBarHeight,
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
      height: '100vh', // Ensure layout takes full viewport height
      overflow: 'hidden', // Prevent body scroll
      ...containerStyle
    }}>
      {/* Command Bar Container - Fixed Position */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 100,
        ...commandBarContainerStyle
      }}>
        {commandBar}
      </div>

      {/* Below-CommandBar region: TabBar (optional) + Content + Sidebar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        marginTop: `${commandBarHeight}px`,
        overflow: 'hidden',
        ...contentContainerStyle,
      }}>
        {/* Tab Bar - Below Command Bar */}
        {tabBar && (
          <div style={{
            flexShrink: 0,
            width: '100%',
            zIndex: 99,
          }}>
            {tabBar}
          </div>
        )}

        {/* Main Content Area (horizontal flex: content + sidebar) */}
        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
            {content}
          </div>

          {sidebar && (
            <div style={{ height: '100%' }}>
              {sidebar}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FactoryPlannerLayout; 