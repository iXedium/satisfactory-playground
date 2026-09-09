import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../../store';
import { setWorkspaceTabs } from '../../../../store/workspaceSlice';
import { saveService } from '../../../../services/saveService';
import { SavedPlannerState } from '../../hooks/usePlannerSaveLoad';
import { FactoryPlannerShellRef } from './FactoryPlannerShell';
import { cloneTabState } from './workspaceHelpers';

const WORKSPACE_PREFIX = 'workspace:';

interface WorkspaceEntry {
  tabId: string;
  name: string;
  plannerState: SavedPlannerState;
}

interface SaveWorkspacePayload {
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

  const getWorkspaceNames = useCallback(async (): Promise<string[]> => {
    const result = await saveService.getNames();
    if (result.ok && result.data) {
      return result.data
        .filter(name => name.startsWith(WORKSPACE_PREFIX))
        .map(name => name.slice(WORKSPACE_PREFIX.length));
    }
    return [];
  }, []);

  const saveWorkspace = useCallback(async (name: string): Promise<boolean> => {
    if (!name?.trim()) return false;

    const entries: WorkspaceEntry[] = [];
    const activeIndex = tabs.findIndex(t => t.tabId === activeTabId);

    for (const tab of tabs) {
      const ref = shellRefs.current.get(tab.tabId);
      const plannerState = ref?.getFullState();
      if (plannerState) {
        entries.push({
          tabId: tab.tabId,
          name: tab.name,
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
      `${WORKSPACE_PREFIX}${name}`,
      JSON.stringify(payload)
    );

    return result.ok;
  }, [tabs, activeTabId, shellRefs]);

  const loadWorkspace = useCallback(async (name: string): Promise<boolean> => {
    const result = await saveService.get(`${WORKSPACE_PREFIX}${name}`);

    if (!result.ok || !result.data) return false;

    try {
      const payload: SaveWorkspacePayload = JSON.parse(result.data);

      if (payload.version !== 1 || !payload.tabs) return false;

      // Seed localStorage for each tab before mounting
      for (const t of payload.tabs) {
        if (t.plannerState) {
          cloneTabState(t.tabId, t.plannerState);
        }
      }

      dispatch(setWorkspaceTabs({
        tabs: payload.tabs.map(t => ({ tabId: t.tabId, name: t.name })),
        activeTabId: payload.tabs[payload.activeTabIndex]?.tabId ?? payload.tabs[0]?.tabId ?? null,
      }));

      return true;
    } catch {
      return false;
    }
  }, [dispatch]);

  const deleteWorkspace = useCallback(async (name: string): Promise<boolean> => {
    const result = await saveService.delete(`${WORKSPACE_PREFIX}${name}`);
    return result.ok;
  }, []);

  return { getWorkspaceNames, saveWorkspace, loadWorkspace, deleteWorkspace };
}
