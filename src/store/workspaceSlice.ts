import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TabInfo {
  tabId: string;
  name: string;
}

export interface WorkspaceState {
  tabs: TabInfo[];
  activeTabId: string | null;
}

let nextTabNumber = 1;

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTabName(): string {
  return `Tab ${nextTabNumber++}`;
}

function loadWorkspaceState(): WorkspaceState {
  try {
    const stored = localStorage.getItem('workspaceState');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.tabs)) {
        const maxTabNumber = parsed.tabs.reduce((max: number, t: TabInfo) => {
          const match = t.name?.match(/^Tab (\d+)$/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        if (maxTabNumber > 0) {
          nextTabNumber = maxTabNumber + 1;
        }
        return { tabs: parsed.tabs, activeTabId: parsed.activeTabId ?? null };
      }
    }
  } catch {
    // ignore parse errors
  }
  return { tabs: [], activeTabId: null };
}

function persistWorkspaceState(state: WorkspaceState): void {
  try {
    localStorage.setItem('workspaceState', JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

const defaultTab: TabInfo = {
  tabId: generateTabId(),
  name: generateTabName(),
};

const initialState: WorkspaceState = (() => {
  const loaded = loadWorkspaceState();
  if (loaded.tabs.length === 0) {
    const initial: WorkspaceState = {
      tabs: [defaultTab],
      activeTabId: defaultTab.tabId,
    };
    persistWorkspaceState(initial);
    return initial;
  }
  if (!loaded.activeTabId && loaded.tabs.length > 0) {
    loaded.activeTabId = loaded.tabs[0].tabId;
    persistWorkspaceState(loaded);
  }
  return loaded;
})();

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    addTab(state, action: PayloadAction<TabInfo | undefined>) {
      const tab = action.payload ?? {
        tabId: generateTabId(),
        name: generateTabName(),
      };
      state.tabs.push(tab);
      state.activeTabId = tab.tabId;
      persistWorkspaceState(state);
    },
    removeTab(state, action: PayloadAction<string>) {
      const index = state.tabs.findIndex(t => t.tabId === action.payload);
      if (index === -1) return;
      state.tabs.splice(index, 1);
      if (state.activeTabId === action.payload) {
        state.activeTabId = state.tabs.length > 0 ? state.tabs[Math.min(index, state.tabs.length - 1)].tabId : null;
      }
      persistWorkspaceState(state);
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTabId = action.payload;
      persistWorkspaceState(state);
    },
    renameTab(state, action: PayloadAction<{ tabId: string; name: string }>) {
      const tab = state.tabs.find(t => t.tabId === action.payload.tabId);
      if (tab) {
        tab.name = action.payload.name;
        persistWorkspaceState(state);
      }
    },
    reorderTabs(state, action: PayloadAction<TabInfo[]>) {
      state.tabs = action.payload;
      persistWorkspaceState(state);
    },
    setWorkspaceTabs(state, action: PayloadAction<WorkspaceState>) {
      state.tabs = action.payload.tabs;
      state.activeTabId = action.payload.activeTabId;
      persistWorkspaceState(state);
    },
  },
});

export const { addTab, removeTab, setActiveTab, renameTab, reorderTabs, setWorkspaceTabs } = workspaceSlice.actions;
export default workspaceSlice.reducer;
