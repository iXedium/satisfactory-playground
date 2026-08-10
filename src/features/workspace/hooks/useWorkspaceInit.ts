import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { addTab } from '../store/workspaceSlice';

function generateTabName(index: number): string {
  return `Planner ${index}`;
}

export function useWorkspaceInit(): boolean {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((s: RootState) => s.workspace.tabs);
  const initialized = tabs.length > 0 || false;

  useEffect(() => {
    if (tabs.length === 0) {
      const tabId = `tab-${Date.now()}`;
      dispatch(addTab({ tabId, name: generateTabName(1) }));
    }
  }, [tabs.length, dispatch]);

  return initialized;
}
