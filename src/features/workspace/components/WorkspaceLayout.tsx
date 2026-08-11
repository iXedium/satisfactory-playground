import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { TabDispatchProvider } from '../context/TabDispatchContext';
import TabBar from './TabBar';
import FactoryPlanner from '../../factory-planner/components/FactoryPlanner';

const WorkspaceLayout: React.FC = () => {
  const activeTabId = useSelector((s: RootState) => s.workspace.activeTabId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0 }}>
        <TabBar />
      </div>
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {activeTabId ? (
          <TabDispatchProvider tabId={activeTabId}>
            <FactoryPlanner />
          </TabDispatchProvider>
        ) : (
          <div style={{ padding: '2rem', color: '#888' }}>No tabs open</div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceLayout;
