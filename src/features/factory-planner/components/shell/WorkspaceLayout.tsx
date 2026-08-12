import React, { useRef, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store';
import { removeTab } from '../../../../store/workspaceSlice';
import TabBar from './TabBar';
import FactoryPlannerShell, { FactoryPlannerShellRef } from './FactoryPlannerShell';
import TabStoreProvider from './TabStoreProvider';

const WorkspaceLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((state: RootState) => state.workspace.tabs);
  const activeTabId = useSelector((state: RootState) => state.workspace.activeTabId);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const shellRefs = useRef<Map<string, FactoryPlannerShellRef>>(new Map());

  const handleDirtyChange = useCallback((tabId: string) => (dirty: boolean) => {
    setDirtyMap(prev => ({ ...prev, [tabId]: dirty }));
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    dispatch(removeTab(tabId));
    shellRefs.current.delete(tabId);
    setDirtyMap(prev => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
  }, [dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TabBar dirtyMap={dirtyMap} />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tabs.map(tab => (
          <TabStoreProvider key={tab.tabId} tabId={tab.tabId}>
            <FactoryPlannerShell
              ref={(r) => {
                if (r) shellRefs.current.set(tab.tabId, r);
                else shellRefs.current.delete(tab.tabId);
              }}
              tabId={tab.tabId}
              isActive={tab.tabId === activeTabId}
              onDirtyChange={handleDirtyChange(tab.tabId)}
            />
          </TabStoreProvider>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceLayout;
