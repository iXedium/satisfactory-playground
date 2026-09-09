import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store';
import { renameTab, duplicateTab, closeOtherTabs, generateTabId } from '../../../../store/workspaceSlice';
import { getNamespacedKey } from '../../../../utils';
import { SavedPlannerState } from '../../hooks/usePlannerSaveLoad';
import { saveService } from '../../../../services/saveService';
import TabBar from './TabBar';
import FactoryPlannerShell, { FactoryPlannerShellRef } from './FactoryPlannerShell';
import TabStoreProvider from './TabStoreProvider';
import { cloneTabState, getDuplicateTabName, purgeOrphanedTabState, cleanupSingleTabState } from './workspaceHelpers';
import { useWorkspaceSaveLoad } from './useWorkspaceSaveLoad';
export { cloneTabState };


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

    // Prune dirtyMap so unmounted/closed tabs can never keep dirtyMap alive
    const validIds = new Set(tabs.map(t => t.tabId));
    setDirtyMap(prev => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [id, val] of Object.entries(prev)) {
        if (validIds.has(id)) {
          next[id] = val;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
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

  const handleRevertTab = useCallback((tabId: string) => {
    shellRefs.current.get(tabId)?.revertSetup();
  }, []);

  const handleDuplicateTab = useCallback((sourceTabId: string) => {
    const sourceTab = tabs.find(t => t.tabId === sourceTabId);
    if (!sourceTab) return;

    const sourceState = shellRefs.current.get(sourceTabId)?.getFullState();
    const newTabId = generateTabId();
    const newName = getDuplicateTabName(sourceTab.name, tabs.map(t => t.name));

    if (sourceState) {
      cloneTabState(newTabId, sourceState);
    }

    dispatch(duplicateTab({
      sourceTabId,
      newTabId,
      name: newName,
    }));
  }, [tabs, dispatch]);

  // Automatically purge dead tab storage keys on startup and tab changes
  useEffect(() => {
    purgeOrphanedTabState(tabs.map(t => t.tabId));
  }, [tabs]);

  const handleCloseOtherTabs = useCallback((keepTabId: string) => {
    for (const t of tabs) {
      if (t.tabId !== keepTabId) {
        cleanupSingleTabState(t.tabId);
      }
    }
    dispatch(closeOtherTabs(keepTabId));
  }, [tabs, dispatch]);

  const {
    activeWorkspaceName,
    getWorkspaceNames,
    saveWorkspace,
    loadWorkspace,
    deleteWorkspace,
    newWorkspace,
  } = useWorkspaceSaveLoad(tabs, activeTabId, shellRefs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TabBar
        dirtyMap={dirtyMap}
        linkedMap={linkedMap}
        saveNames={saveNames}
        onUnlinkTab={handleUnlinkTab}
        onRevertTab={handleRevertTab}
        onDuplicateTab={handleDuplicateTab}
        onCloseOtherTabs={handleCloseOtherTabs}
        activeWorkspaceName={activeWorkspaceName}
        onSaveWorkspace={saveWorkspace}
        onLoadWorkspace={loadWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        onNewWorkspace={newWorkspace}
        getWorkspaceNames={getWorkspaceNames}
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
