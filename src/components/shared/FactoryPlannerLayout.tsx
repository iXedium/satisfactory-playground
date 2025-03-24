import React, { ReactNode } from 'react';
import { theme } from '../../styles/theme';

interface FactoryPlannerLayoutProps {
  commandBar: ReactNode;
  content: ReactNode;
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
  containerStyle,
  commandBarContainerStyle,
  contentContainerStyle
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      ...containerStyle
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: theme.colors.background,
        ...commandBarContainerStyle
      }}>
        {commandBar}
      </div>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px',
        ...contentContainerStyle
      }}>
        {content}
      </div>
    </div>
  );
};

export default FactoryPlannerLayout; 