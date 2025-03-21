import { store, RootState, AppDispatch } from './configureStore';

// Create typed hooks
export type { RootState, AppDispatch };
export { store };

// Default export for backward compatibility
export default store;
