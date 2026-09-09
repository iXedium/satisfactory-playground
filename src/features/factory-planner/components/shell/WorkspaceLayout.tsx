import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store';
import { renameTab } from '../../../../store/workspaceSlice';
import { saveService } from '../../../../services/saveService';
import TabBar from './TabBar';
import FactoryPlannerShell, { FactoryPlannerShellRef } from './FactoryPlannerShell';
import TabStoreProvider from './TabStoreProvider';

const WorkspaceLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((state: RootState) => state.workspace.tabs);
  const activeTabId = useSelector((state: RootState) => state.workspace.activeTabId);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [linkedMap, setLinkedMap] = useState<Record<string, string | null>>({});
  const [saveNames, setSaveNames] = useState<string[]>([]);
  const shellRefs = useRef<Map<string, FactoryPlannerShellRef>>(new Map());

  useEffect(() => {
    const map: Record<string, string | null> = {};
    for (const tab of tabs) {
      const name = localStorage.getItem(`activeSetupName_${tab.tabId}`);
      map[tab.tabId] = name || null;
    }
    setLinkedMap(map);
  }, [tabs]);

  useEffect(() => {
    let cancelled = false;
    async function fetchNames() {
      const result = await saveService.getNames();
      if (!cancelled && result.ok && result.data) {
        setSaveNames(result.data.filter(name => !name.startsWith('workspace:')));
      }
    }
    fetchNames();
    return () => { cancelled = true; };
  }, []);

  const handleDirtyChange = useCallback((tabId: string) => (dirty: boolean) => {
    setDirtyMap(prev => ({ ...prev, [tabId]: dirty }));
  }, []);

  const handleLinkedSetupChange = useCallback((tabId: string) => (name: string | null) => {
    if (name !== null) dispatch(renameTab({ tabId, name }));
    setLinkedMap(prev => ({ ...prev, [tabId]: name }));
    setSaveNames(prev => {
      if (name && !prev.includes(name)) return [...prev, name].sort();
      return prev;
    });
  }, [dispatch]);

  const handleUnlinkTab = useCallback((tabId: string) => {
    setLinkedMap(prev => ({ ...prev, [tabId]: null }));
    shellRefs.current.get(tabId)?.unlinkSetup();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TabBar
        dirtyMap={dirtyMap}
        linkedMap={linkedMap}
        saveNames={saveNames}
        onUnlinkTab={handleUnlinkTab}
      />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tabs.map(tab => (
          <TabStoreProvider key={tab.tabId} tabId={tab.tabId}>
            <FactoryPlannerShell
              ref={(r) => {
                if (r) shellRefs.current.set(tab.tabId, r);
                else shellRefs.current.delete(tab.tabId);
              }}
              tabId={tab.tabId}
              tabName={tab.name}
              isActive={tab.tabId === activeTabId}
              onDirtyChange={handleDirtyChange(tab.tabId)}
              onLinkedSetupChange={handleLinkedSetupChange(tab.tabId)}
            />
          </TabStoreProvider>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceLayout;
