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

function cloneTabState(newTabId: string, state: SavedPlannerState) {
  try {
    if (state.dependencies) {
      localStorage.setItem(getNamespacedKey('savedDependencies', newTabId), JSON.stringify(state.dependencies));
    }
    if (state.recipeSelections) {
      localStorage.setItem(getNamespacedKey('savedRecipeSelections', newTabId), JSON.stringify(state.recipeSelections));
    }
    if (state.nodeState) {
      if (state.nodeState.excessMap) {
        localStorage.setItem(getNamespacedKey('savedExcessMap', newTabId), JSON.stringify(state.nodeState.excessMap));
      }
      if (state.nodeState.machineCountMap) {
        localStorage.setItem(getNamespacedKey('savedMachineCountMap', newTabId), JSON.stringify(state.nodeState.machineCountMap));
      }
      if (state.nodeState.machineMultiplierMap) {
        localStorage.setItem(getNamespacedKey('savedMachineMultiplierMap', newTabId), JSON.stringify(state.nodeState.machineMultiplierMap));
      }
      if (state.nodeState.expandedNodes) {
        localStorage.setItem(getNamespacedKey('plannerExpandedNodes', newTabId), JSON.stringify(state.nodeState.expandedNodes));
      }
      if (state.nodeState.nodeExtensionOverrides) {
        localStorage.setItem(getNamespacedKey('plannerNodeExtensionOverrides', newTabId), JSON.stringify(state.nodeState.nodeExtensionOverrides));
      }
    }
    if (state.displayOptions) {
      if (state.displayOptions.viewDensity) {
        localStorage.setItem(getNamespacedKey('savedViewDensity', newTabId), state.displayOptions.viewDensity);
      }
      if (state.displayOptions.showExtensions !== undefined) {
        localStorage.setItem(getNamespacedKey('savedShowExtensions', newTabId), JSON.stringify(state.displayOptions.showExtensions));
      }
      if (state.displayOptions.accumulateExtensions !== undefined) {
        localStorage.setItem(getNamespacedKey('savedAccumulateExtensions', newTabId), JSON.stringify(state.displayOptions.accumulateExtensions));
      }
      if (state.displayOptions.showMachines !== undefined) {
        localStorage.setItem(getNamespacedKey('savedShowMachines', newTabId), JSON.stringify(state.displayOptions.showMachines));
      }
      if (state.displayOptions.showMachineMultiplier !== undefined) {
        localStorage.setItem(getNamespacedKey('savedShowMachineMultiplier', newTabId), JSON.stringify(state.displayOptions.showMachineMultiplier));
      }
      if (state.displayOptions.autoImport !== undefined) {
        localStorage.setItem(getNamespacedKey('plannerAutoImport', newTabId), JSON.stringify(state.displayOptions.autoImport));
      }
    }
    if (state.sortOptions) {
      if (state.sortOptions.key) {
        localStorage.setItem(getNamespacedKey('plannerTreeSortKey', newTabId), state.sortOptions.key);
      }
      if (state.sortOptions.direction) {
        localStorage.setItem(getNamespacedKey('plannerTreeSortDirection', newTabId), state.sortOptions.direction);
      }
    }
    if (state.manualTreeOrder) {
      localStorage.setItem(`plannerManualTreeOrder_${newTabId}`, JSON.stringify(state.manualTreeOrder));
    }
    localStorage.removeItem(`activeSetupName_${newTabId}`);
  } catch (e) {
    console.error('Failed to clone tab state into localStorage:', e);
  }
}

function getDuplicateTabName(originalName: string, existingNames: string[]): string {
  const copyMatch = originalName.match(/^(.*?)(?: \(Copy(?: (\d+))?\))?$/);
  const baseName = copyMatch ? copyMatch[1] : originalName;

  const firstTry = `${baseName} (Copy)`;
  if (!existingNames.some(n => n.toLowerCase() === firstTry.toLowerCase())) {
    return firstTry;
  }

  let counter = 2;
  while (existingNames.some(n => n.toLowerCase() === `${baseName} (Copy ${counter})`.toLowerCase())) {
    counter++;
  }
  return `${baseName} (Copy ${counter})`;
}

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

  const handleCloseOtherTabs = useCallback((keepTabId: string) => {
    dispatch(closeOtherTabs(keepTabId));
  }, [dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TabBar
        dirtyMap={dirtyMap}
        linkedMap={linkedMap}
        saveNames={saveNames}
        onUnlinkTab={handleUnlinkTab}
        onDuplicateTab={handleDuplicateTab}
        onCloseOtherTabs={handleCloseOtherTabs}
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
