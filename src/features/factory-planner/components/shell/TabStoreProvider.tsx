import React, { useMemo, useEffect } from 'react';
import { Provider } from 'react-redux';
import { createPlannerStore } from '../../../../store/plannerStore';
import { HideToggleDragProvider } from '../../../../contexts/HideToggleDragContext';
import { TreeNavigationProvider } from '../../../../contexts/TreeNavigationContext';

const plannerStores = new Map<string, ReturnType<typeof createPlannerStore>>();

interface TabStoreProviderProps {
  tabId: string;
  children: React.ReactNode;
}

const TabStoreProvider: React.FC<TabStoreProviderProps> = ({ tabId, children }) => {
  const store = useMemo(() => {
    const existing = plannerStores.get(tabId);
    if (existing) return existing;
    const newStore = createPlannerStore();
    plannerStores.set(tabId, newStore);
    return newStore;
  }, [tabId]);

  useEffect(() => {
    return () => {
      plannerStores.delete(tabId);
    };
  }, [tabId]);

  return (
    <Provider store={store}>
      <HideToggleDragProvider>
        <TreeNavigationProvider>
          {children}
        </TreeNavigationProvider>
      </HideToggleDragProvider>
    </Provider>
  );
};

export default TabStoreProvider;
export { plannerStores };
