import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: any;
}

export interface UIState {
  activeTab: string;
  expandedSections: Record<string, boolean>;
  modals: Record<string, ModalState>;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  viewMode: 'default' | 'compact' | 'expanded';
  lastSavedTimestamp?: string;
}

const initialState: UIState = {
  activeTab: 'calculator',
  expandedSections: {},
  modals: {
    settings: { isOpen: false, type: null },
    confirmDialog: { isOpen: false, type: null },
    importExport: { isOpen: false, type: null }
  },
  sidebarOpen: true,
  theme: 'system',
  viewMode: 'default'
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Tab navigation
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    
    // Section expansion management
    toggleSection: (state, action: PayloadAction<string>) => {
      const sectionId = action.payload;
      state.expandedSections[sectionId] = !state.expandedSections[sectionId];
    },
    
    setSectionExpanded: (state, action: PayloadAction<{sectionId: string; expanded: boolean}>) => {
      const { sectionId, expanded } = action.payload;
      state.expandedSections[sectionId] = expanded;
    },
    
    // Modal management
    openModal: (state, action: PayloadAction<{modalId: string; type?: string; data?: any}>) => {
      const { modalId, type = null, data } = action.payload;
      if (state.modals[modalId]) {
        state.modals[modalId] = { 
          isOpen: true, 
          type,
          data
        };
      }
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      const modalId = action.payload;
      if (state.modals[modalId]) {
        state.modals[modalId].isOpen = false;
      }
    },
    
    // Sidebar management
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    // Theme management
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    
    // View mode management
    setViewMode: (state, action: PayloadAction<'default' | 'compact' | 'expanded'>) => {
      state.viewMode = action.payload;
    },
    
    // Record when UI state was last saved
    updateSavedTimestamp: (state) => {
      state.lastSavedTimestamp = new Date().toISOString();
    },
    
    // Reset UI state to default
    resetUI: (state) => {
      return {
        ...initialState,
        theme: state.theme // Preserve theme preference
      };
    }
  }
});

// Export actions
export const {
  setActiveTab,
  toggleSection,
  setSectionExpanded,
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setViewMode,
  updateSavedTimestamp,
  resetUI
} = uiSlice.actions;

// Export reducer
export default uiSlice.reducer; 