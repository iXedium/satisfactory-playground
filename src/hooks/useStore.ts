import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';

/**
 * Typed version of useDispatch hook
 * 
 * Use this instead of plain `useDispatch` for better TypeScript support
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed version of useSelector hook
 * 
 * Use this instead of plain `useSelector` for better TypeScript support 
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Hook to select a specific slice of the Redux store
 * 
 * @param sliceSelector Function to select a specific slice
 * @returns The selected slice from the Redux store
 */
export function useStoreSlice<T>(sliceSelector: (state: RootState) => T): T {
  return useAppSelector(sliceSelector);
}

/**
 * Helper hook to access the UI state slice
 */
export function useUIState() {
  return useStoreSlice(state => state.ui);
}

/**
 * Helper hook to access the settings state slice
 */
export function useSettingsState() {
  return useStoreSlice(state => state.settings);
}

/**
 * Helper hook to access the dependencies state slice
 */
export function useDependenciesState() {
  return useStoreSlice(state => state.dependencies);
}

/**
 * Helper hook to access the data state slice
 */
export function useDataState() {
  return useStoreSlice(state => state.data);
}

/**
 * Helper hook to access the import/export state slice
 */
export function useImportExportState() {
  return useStoreSlice(state => state.importExport);
}

export default {
  useAppDispatch,
  useAppSelector,
  useStoreSlice,
  useUIState,
  useSettingsState,
  useDependenciesState,
  useDataState,
  useImportExportState
}; 