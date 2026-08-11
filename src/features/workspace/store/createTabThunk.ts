import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '../../../store';
import { generateOperationId } from './operationTracking';

export interface TabThunkArg {
  tabId: string;
  description?: string;
}

function injectTabMeta(action: unknown, tabId: string): unknown {
  if (typeof action === 'function') return action;
  const a = (action || {}) as Record<string, unknown>;
  return { ...a, meta: { ...(a.meta as Record<string, unknown> || {}), tabId } };
}

export function createTabThunk<Returned, ThunkArg extends Record<string, unknown>>(
  typePrefix: string,
  payloadCreator: (
    arg: ThunkArg,
    api: { dispatch: AppDispatch; getState: () => RootState; tabId: string }
  ) => Promise<Returned>
) {
  return createAsyncThunk<Returned, ThunkArg & TabThunkArg>(
    typePrefix,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (fullArg: any, rawAPI: any) => {
      const { tabId, description, ...rest } = fullArg;
      const operationId = generateOperationId();

      rawAPI.dispatch({
        type: '_planner/beginOperation',
        payload: { operationId, description: description || typePrefix },
        meta: { tabId },
      });

      try {
        const scopedDispatch: AppDispatch = ((action: unknown) =>
          rawAPI.dispatch(injectTabMeta(action, tabId))) as AppDispatch;

        const scoped = {
          dispatch: scopedDispatch,
          getState: () => rawAPI.getState() as RootState,
          tabId,
        };
        return await payloadCreator(rest as ThunkArg, scoped);
      } finally {
        rawAPI.dispatch({
          type: '_planner/endOperation',
          payload: { operationId },
          meta: { tabId },
        });
      }
    }
  );
}
