import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';

interface TabDispatchValue {
  tabId: string | null;
  tabDispatch: AppDispatch;
}

const TabDispatchContext = createContext<TabDispatchValue>({
  tabId: null,
  tabDispatch: ((action: unknown) => action) as unknown as AppDispatch,
});

/**
 * Injects tabId into every dispatched action's meta.
 */
function injectTabMeta(action: unknown, tabId: string): unknown {
  if (typeof action === 'function') return action;
  const a = (action || {}) as Record<string, unknown>;
  return { ...a, meta: { ...(a.meta as Record<string, unknown> || {}), tabId } };
}

export function TabDispatchProvider({
  tabId,
  children,
}: {
  tabId: string | null;
  children: ReactNode;
}) {
  const rawDispatch = useDispatch<AppDispatch>();

  const tabDispatch = useCallback(
    (action: unknown): unknown => {
      if (tabId === null) return rawDispatch(action as Parameters<AppDispatch>[0]);
      return rawDispatch(injectTabMeta(action, tabId) as Parameters<AppDispatch>[0]);
    },
    [rawDispatch, tabId]
  ) as AppDispatch;

  return (
    <TabDispatchContext.Provider value={{ tabId, tabDispatch }}>
      {children}
    </TabDispatchContext.Provider>
  );
}

export function useTabDispatch(): TabDispatchValue {
  return useContext(TabDispatchContext);
}
