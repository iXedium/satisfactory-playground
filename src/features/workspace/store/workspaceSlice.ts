import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TabDescriptor {
  tabId: string;
  name: string;
}

export interface WorkspaceState {
  tabs: TabDescriptor[];
  activeTabId: string | null;
}

const initialState: WorkspaceState = {
  tabs: [],
  activeTabId: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    addTab(state, action: PayloadAction<TabDescriptor>) {
      state.tabs.push(action.payload);
      if (state.activeTabId === null) {
        state.activeTabId = action.payload.tabId;
      }
    },
    removeTab(state, action: PayloadAction<string>) {
      state.tabs = state.tabs.filter(t => t.tabId !== action.payload);
      if (state.activeTabId === action.payload) {
        state.activeTabId = state.tabs.length > 0 ? state.tabs[0].tabId : null;
      }
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTabId = action.payload;
    },
    renameTab(state, action: PayloadAction<{ tabId: string; name: string }>) {
      const tab = state.tabs.find(t => t.tabId === action.payload.tabId);
      if (tab) tab.name = action.payload.name;
    },
    reorderTabs(state, action: PayloadAction<TabDescriptor[]>) {
      state.tabs = action.payload;
    },
    replaceWorkspace(state, action: PayloadAction<WorkspaceState>) {
      state.tabs = action.payload.tabs;
      state.activeTabId = action.payload.activeTabId;
    },
  },
});

export const { addTab, removeTab, setActiveTab, renameTab, reorderTabs, replaceWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;
