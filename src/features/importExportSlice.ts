import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppThunk } from '../store';
import { exportData, importData, readFile } from '../services/importExport';
import { updateSettings } from './settingsSlice';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../store';

// Define the state shape for import/export operations
interface ImportExportState {
  isImporting: boolean;
  isExporting: boolean;
  importError: string | null;
  exportError: string | null;
  lastExportDate: string | null;
  lastImportDate: string | null;
}

// Initial state
const initialState: ImportExportState = {
  isImporting: false,
  isExporting: false,
  importError: null,
  exportError: null,
  lastExportDate: null,
  lastImportDate: null,
};

// Create the slice
const importExportSlice = createSlice({
  name: 'importExport',
  initialState,
  reducers: {
    // Set import processing status
    setImporting: (state, action: PayloadAction<boolean>) => {
      state.isImporting = action.payload;
      if (action.payload) {
        state.importError = null;
      }
    },
    
    // Set export processing status
    setExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload;
      if (action.payload) {
        state.exportError = null;
      }
    },
    
    // Set import error
    setImportError: (state, action: PayloadAction<string | null>) => {
      state.importError = action.payload;
      state.isImporting = false;
    },
    
    // Set export error
    setExportError: (state, action: PayloadAction<string | null>) => {
      state.exportError = action.payload;
      state.isExporting = false;
    },
    
    // Update last export date
    updateLastExportDate: (state) => {
      state.lastExportDate = new Date().toISOString();
    },
    
    // Update last import date
    updateLastImportDate: (state) => {
      state.lastImportDate = new Date().toISOString();
    },
    
    // Reset state
    resetState: () => initialState,
  },
});

// Export actions
export const {
  setImporting,
  setExporting,
  setImportError,
  setExportError,
  updateLastExportDate,
  updateLastImportDate,
  resetState,
} = importExportSlice.actions;

// Thunk for exporting data
export const startExport = (): AppThunk => async (
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>,
  getState: () => RootState
) => {
  try {
    dispatch(setExporting(true));
    
    // Get current state and export
    const state = getState();
    await exportData(state);
    
    // Update last export date
    dispatch(updateLastExportDate());
    dispatch(setExporting(false));
  } catch (error) {
    console.error('Export failed:', error);
    dispatch(setExportError(error instanceof Error ? error.message : 'Unknown export error'));
  }
};

// Thunk for importing data
export const startImport = (file: File): AppThunk => async (
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>
) => {
  try {
    dispatch(setImporting(true));
    
    // Read and parse file
    const fileContent = await readFile(file);
    const importedData = importData(fileContent);
    
    // Apply imported data to state
    // This will need to be expanded with actions for each slice
    if (importedData.settings) {
      dispatch(updateSettings(importedData.settings));
    }
    
    // TODO: Add actions for other slices
    
    // Update last import date
    dispatch(updateLastImportDate());
    dispatch(setImporting(false));
  } catch (error) {
    console.error('Import failed:', error);
    dispatch(setImportError(error instanceof Error ? error.message : 'Unknown import error'));
  }
};

// Export reducer
export default importExportSlice.reducer; 