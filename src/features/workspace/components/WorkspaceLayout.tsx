import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { TabDispatchProvider } from '../context/TabDispatchContext';
import TabBar from './TabBar';
import FactoryPlanner from '../../factory-planner/components/FactoryPlanner';

const WorkspaceLayout: React.FC = () => {
  const activeTabId = useSelector((s: RootState) => s.workspace.activeTabId);

  return (
    <TabDispatchProvider tabId={activeTabId}>
      <FactoryPlanner tabBar={<TabBar />} />
    </TabDispatchProvider>
  );
};

export default WorkspaceLayout;
