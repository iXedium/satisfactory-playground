import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { addTab, replaceWorkspace } from '../store/workspaceSlice';

const LS_WORKSPACE_KEY = 'workspace_tabs';

function generateTabName(index: number): string {
  return `Planner ${index}`;
}

export function useWorkspaceInit(): boolean {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((s: RootState) => s.workspace.tabs);
  const activeTabId = useSelector((s: RootState) => s.workspace.activeTabId);
  const initialized = tabs.length > 0 || false;
  const restoreDone = useRef(false);

  // On mount: restore saved workspace or create default tab
  useEffect(() => {
    if (restoreDone.current) return;
    restoreDone.current = true;

    try {
      const saved = localStorage.getItem(LS_WORKSPACE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tabs && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          dispatch(replaceWorkspace({ tabs: parsed.tabs, activeTabId: parsed.activeTabId || parsed.tabs[0].tabId }));
          return;
        }
      }
    } catch {
      localStorage.removeItem(LS_WORKSPACE_KEY);
    }

    // Fallback: create default tab
    const tabId = `tab-${Date.now()}`;
    dispatch(addTab({ tabId, name: generateTabName(1) }));
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save workspace to localStorage on every change (debounced via ref)
  const saveTimeout = useRef<number>(0);

  useEffect(() => {
    if (!initialized) return;
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => {
      try {
        localStorage.setItem(LS_WORKSPACE_KEY, JSON.stringify({ tabs, activeTabId }));
      } catch { /* ignore quota errors */ }
    }, 500) as unknown as number;
    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    };
  }, [tabs, activeTabId, initialized]);

  return initialized;
}
