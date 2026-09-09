import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../../store';
import { setWorkspaceTabs, generateTabId } from '../../../../store/workspaceSlice';
import { saveService } from '../../../../services/saveService';
import { SavedPlannerState } from '../../hooks/usePlannerSaveLoad';
import { FactoryPlannerShellRef } from './FactoryPlannerShell';
import { cloneTabState, purgeOrphanedTabState, cleanupSingleTabState } from './workspaceHelpers';

const WORKSPACE_PREFIX = 'workspace:';
const ACTIVE_WORKSPACE_KEY = 'activeWorkspaceName';

export interface WorkspaceEntry {
  tabId: string;
  name: string;
  linkedSetupName?: string | null;
  plannerState: SavedPlannerState;
}

export interface SaveWorkspacePayload {
  version: 1;
  tabs: WorkspaceEntry[];
  activeTabIndex: number;
}

export function useWorkspaceSaveLoad(
  tabs: { tabId: string; name: string }[],
  activeTabId: string | null,
  shellRefs: React.MutableRefObject<Map<string, FactoryPlannerShellRef>>
) {
  const dispatch = useDispatch<AppDispatch>();
  const [activeWorkspaceName, setActiveWorkspaceName] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    } catch {
      return null;
    }
  });

  const getWorkspaceNames = useCallback(async (): Promise<string[]> => {
    const result = await saveService.getNames();
    if (result.ok && result.data) {
      return result.data
        .filter(name => name.startsWith(WORKSPACE_PREFIX))
        .map(name => name.slice(WORKSPACE_PREFIX.length))
        .sort((a, b) => a.localeCompare(b));
    }
    return [];
  }, []);

  const saveWorkspace = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name?.trim();
    if (!trimmed) return false;

    const entries: WorkspaceEntry[] = [];
    const activeIndex = tabs.findIndex(t => t.tabId === activeTabId);

    for (const tab of tabs) {
      const ref = shellRefs.current.get(tab.tabId);
      const plannerState = ref?.getFullState();
      const linkedSetupName = localStorage.getItem(`activeSetupName_${tab.tabId}`) || null;
      if (plannerState) {
        entries.push({
          tabId: tab.tabId,
          name: tab.name,
          linkedSetupName,
          plannerState,
        });
      }
    }

    const payload: SaveWorkspacePayload = {
      version: 1,
      tabs: entries,
      activeTabIndex: activeIndex >= 0 ? activeIndex : 0,
    };

    const result = await saveService.save(
      `${WORKSPACE_PREFIX}${trimmed}`,
      JSON.stringify(payload)
    );

    if (result.ok) {
      // Sync linked setups to SQLite and mark all open tabs as saved
      for (const entry of entries) {
        if (entry.linkedSetupName) {
          try {
            await saveService.save(entry.linkedSetupName, JSON.stringify(entry.plannerState));
          } catch (e) {
            console.warn(`Failed to sync linked setup "${entry.linkedSetupName}":`, e);
          }
        }
        const ref = shellRefs.current.get(entry.tabId);
        ref?.markSaved(entry.plannerState);
      }

      setActiveWorkspaceName(trimmed);
      try {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, trimmed);
      } catch {
        // ignore storage errors
      }
      return true;
    }

    return false;
  }, [tabs, activeTabId, shellRefs]);

  const loadWorkspace = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name?.trim();
    if (!trimmed) return false;

    const result = await saveService.get(`${WORKSPACE_PREFIX}${trimmed}`);
    if (!result.ok || !result.data) return false;

    try {
      const payload: SaveWorkspacePayload = JSON.parse(result.data);
      if (payload.version !== 1 || !Array.isArray(payload.tabs) || payload.tabs.length === 0) {
        return false;
      }

      // Refresh linked tabs with their linked setup's state from the database so they are in sync
      for (const t of payload.tabs) {
        if (t.linkedSetupName) {
          try {
            const linkedResult = await saveService.get(t.linkedSetupName);
            if (linkedResult.ok && linkedResult.data) {
              t.plannerState = JSON.parse(linkedResult.data);
            }
          } catch (e) {
            console.warn(`Failed to load linked setup "${t.linkedSetupName}":`, e);
          }
        }
      }

      // Clean up previous tabs' storage before loading new workspace
      for (const oldTab of tabs) {
        cleanupSingleTabState(oldTab.tabId);
      }
      purgeOrphanedTabState([]);

      // Generate fresh tab IDs to ensure clean component remounts and stores
      const loadedTabs = payload.tabs.map(t => {
        const freshTabId = generateTabId();
        if (t.plannerState) {
          cloneTabState(freshTabId, t.plannerState);
        }
        if (t.linkedSetupName) {
          localStorage.setItem(`activeSetupName_${freshTabId}`, t.linkedSetupName);
        } else {
          localStorage.removeItem(`activeSetupName_${freshTabId}`);
        }
        return {
          tabId: freshTabId,
          name: t.name,
        };
      });

      const targetActiveIndex = (payload.activeTabIndex >= 0 && payload.activeTabIndex < loadedTabs.length)
        ? payload.activeTabIndex
        : 0;

      dispatch(setWorkspaceTabs({
        tabs: loadedTabs,
        activeTabId: loadedTabs[targetActiveIndex]?.tabId ?? loadedTabs[0]?.tabId ?? null,
      }));

      setActiveWorkspaceName(trimmed);
      try {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, trimmed);
      } catch {
        // ignore storage errors
      }

      return true;
    } catch {
      return false;
    }
  }, [tabs, dispatch]);

  const deleteWorkspace = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name?.trim();
    if (!trimmed) return false;

    const result = await saveService.delete(`${WORKSPACE_PREFIX}${trimmed}`);
    if (result.ok) {
      if (activeWorkspaceName === trimmed) {
        setActiveWorkspaceName(null);
        try {
          localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        } catch {
          // ignore
        }
      }
      return true;
    }
    return false;
  }, [activeWorkspaceName]);

  const newWorkspace = useCallback((): void => {
    for (const tab of tabs) {
      cleanupSingleTabState(tab.tabId);
    }
    purgeOrphanedTabState([]);
    const freshTabId = generateTabId();
    dispatch(setWorkspaceTabs({
      tabs: [{ tabId: freshTabId, name: 'Planner 1' }],
      activeTabId: freshTabId,
    }));
    setActiveWorkspaceName(null);
    try {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    } catch {
      // ignore
    }
  }, [tabs, dispatch]);

  return {
    activeWorkspaceName,
    setActiveWorkspaceName,
    getWorkspaceNames,
    saveWorkspace,
    loadWorkspace,
    deleteWorkspace,
    newWorkspace,
  };
}
