import { store, RootState, AppDispatch } from './configureStore';
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

// Define AppThunk type
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

// Create typed hooks
export type { RootState, AppDispatch };
export { store };

// Default export for backward compatibility
export default store;
