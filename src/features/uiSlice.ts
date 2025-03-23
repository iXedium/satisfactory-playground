import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ViewMode, NodeExtensionSettings, MachineDisplaySettings } from '../types/core';

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: any;
}

export interface UIState {
  /** Active tab ID */
  activeTab: string;
  /** Active tab index */
  activeTabIndex: number;
  /** Map of section IDs to expanded state */
  expandedSections: Record<string, boolean>;
  /** Modal states */
  modals: {
    settings: boolean;
    calculator: boolean;
    importExport: boolean;
  };
  /** Whether the sidebar is open */
  sidebarOpen: boolean;
  /** Alternative name for sidebarOpen */
  isSidebarOpen: boolean;
  /** Map of node IDs to expanded state */
  expandedNodes: Record<string, boolean>;
  /** Node extension overrides by node ID */
  nodeExtensionOverrides: Record<string, boolean>;
  /** Current view mode (tree or accumulated) */
  viewMode: ViewMode;
  /** Selected view mode */
  selectedView: string;
  /** Node extension settings */
  nodeExtensions: NodeExtensionSettings;
  /** Machine display settings */
  machineDisplay: MachineDisplaySettings;
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Last saved timestamp */
  lastSavedTimestamp?: string;
}

const initialState: UIState = {
  activeTab: 'calculator',
  activeTabIndex: 0,
  expandedSections: {},
  modals: {
    settings: false,
    calculator: false,
    importExport: false
  },
  sidebarOpen: true,
  isSidebarOpen: true,
  expandedNodes: {},
  nodeExtensionOverrides: {},
  viewMode: 'tree',
  selectedView: 'tree',
  nodeExtensions: {
    showExtensions: true,
    accumulateExtensions: false,
    nodeOverrides: {}
  },
  machineDisplay: {
    showMachines: true,
    showMachineMultiplier: false
  },
  theme: 'system'
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    setActiveTabIndex: (state, action: PayloadAction<number>) => {
      state.activeTabIndex = action.payload;
    },
    toggleExpandedSection: (state, action: PayloadAction<string>) => {
      const sectionId = action.payload;
      state.expandedSections[sectionId] = !state.expandedSections[sectionId];
    },
    setExpandedSection: (state, action: PayloadAction<{ sectionId: string; expanded: boolean }>) => {
      state.expandedSections[action.payload.sectionId] = action.payload.expanded;
    },
    toggleModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      const modalName = action.payload;
      state.modals[modalName] = !state.modals[modalName];
    },
    setModalState: (state, action: PayloadAction<{ modal: keyof UIState['modals']; isOpen: boolean }>) => {
      const { modal, isOpen } = action.payload;
      state.modals[modal] = isOpen;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
      state.isSidebarOpen = action.payload;
    },
    toggleNodeExpanded: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      state.expandedNodes[nodeId] = !state.expandedNodes[nodeId];
    },
    setNodeExpanded: (state, action: PayloadAction<{ nodeId: string; expanded: boolean }>) => {
      state.expandedNodes[action.payload.nodeId] = action.payload.expanded;
    },
    expandAllNodes: (state) => {
      // This is a placeholder, we'll need to know all node IDs to expand them all
      // For now, we'll just clear the expandedNodes object since nodes are expanded by default
      state.expandedNodes = {};
    },
    collapseAllNodes: (state, action: PayloadAction<string[]>) => {
      const nodeIds = action.payload;
      nodeIds.forEach(nodeId => {
        state.expandedNodes[nodeId] = false;
      });
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
      state.selectedView = action.payload;
    },
    toggleNodeExtension: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      state.nodeExtensionOverrides[nodeId] = !state.nodeExtensionOverrides[nodeId];
      state.nodeExtensions.nodeOverrides[nodeId] = !state.nodeExtensions.nodeOverrides[nodeId];
    },
    setNodeExtensionSettings: (state, action: PayloadAction<NodeExtensionSettings>) => {
      state.nodeExtensions = action.payload;
    },
    setMachineDisplaySettings: (state, action: PayloadAction<MachineDisplaySettings>) => {
      state.machineDisplay = action.payload;
    },
    toggleShowExtensions: (state) => {
      state.nodeExtensions.showExtensions = !state.nodeExtensions.showExtensions;
    },
    toggleAccumulateExtensions: (state) => {
      state.nodeExtensions.accumulateExtensions = !state.nodeExtensions.accumulateExtensions;
    },
    toggleShowMachines: (state) => {
      state.machineDisplay.showMachines = !state.machineDisplay.showMachines;
    },
    toggleShowMachineMultiplier: (state) => {
      state.machineDisplay.showMachineMultiplier = !state.machineDisplay.showMachineMultiplier;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    updateSavedTimestamp: (state) => {
      state.lastSavedTimestamp = new Date().toISOString();
    },
    resetUI: (state) => {
      return {
        ...initialState,
        theme: state.theme
      };
    }
  }
});

export const {
  setActiveTab,
  setActiveTabIndex,
  toggleExpandedSection,
  setExpandedSection,
  toggleModal,
  setModalState,
  toggleSidebar,
  setSidebarOpen,
  toggleNodeExpanded,
  setNodeExpanded,
  expandAllNodes,
  collapseAllNodes,
  setViewMode,
  toggleNodeExtension,
  setNodeExtensionSettings,
  setMachineDisplaySettings,
  toggleShowExtensions,
  toggleAccumulateExtensions,
  toggleShowMachines,
  toggleShowMachineMultiplier,
  setTheme,
  updateSavedTimestamp,
  resetUI
} = uiSlice.actions;

export default uiSlice.reducer; 