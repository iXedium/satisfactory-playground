import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  startExport, 
  startImport, 
  setImportError, 
  setExportError
} from '../features/importExportSlice';

/**
 * Hook for import/export functionality
 * @returns Object with functions and state for import/export
 */
export const useImportExport = () => {
  const dispatch = useDispatch();
  const importExportState = useSelector((state: RootState) => state.importExport);
  
  // Export all data
  const exportAllData = useCallback(() => {
    dispatch(startExport());
  }, [dispatch]);
  
  // Import data from file
  const importDataFromFile = useCallback((file: File) => {
    if (!file) {
      dispatch(setImportError('No file selected'));
      return;
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'json') {
      dispatch(setImportError('Invalid file type. Please select a JSON file.'));
      return;
    }
    
    dispatch(startImport(file));
  }, [dispatch]);
  
  // Clear import error
  const clearImportError = useCallback(() => {
    dispatch(setImportError(null));
  }, [dispatch]);
  
  // Clear export error
  const clearExportError = useCallback(() => {
    dispatch(setExportError(null));
  }, [dispatch]);
  
  return {
    // State
    isImporting: importExportState.isImporting,
    isExporting: importExportState.isExporting,
    importError: importExportState.importError,
    exportError: importExportState.exportError,
    lastImportDate: importExportState.lastImportDate,
    lastExportDate: importExportState.lastExportDate,
    
    // Functions
    exportAllData,
    importDataFromFile,
    clearImportError,
    clearExportError,
  };
}; 