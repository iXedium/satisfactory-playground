import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { useStore } from 'react-redux';
import FactoryPlanner, { FactoryPlannerRef } from '../FactoryPlanner';
import { SavedPlannerState } from '../../hooks/usePlannerSaveLoad';
import type { PlannerRootState } from '../../../../store/plannerStore';
import { consumeTabInitialState } from './workspaceHelpers';

interface FactoryPlannerShellProps {
  tabId: string;
  tabName?: string;
  isActive: boolean;
  initialState?: SavedPlannerState;
  onDirtyChange?: (dirty: boolean) => void;
  onLinkedSetupChange?: (name: string | null) => void;
}

export interface FactoryPlannerShellRef {
  getFullState(): SavedPlannerState | null;
  unlinkSetup(): void;
}

const FactoryPlannerShell = forwardRef<FactoryPlannerShellRef, FactoryPlannerShellProps>(
  ({ tabId, tabName, isActive, initialState, onDirtyChange, onLinkedSetupChange }, ref) => {
    const store = useStore<PlannerRootState>();
    const plannerRef = useRef<FactoryPlannerRef>(null);
    const initialRef = useRef<SavedPlannerState | undefined>(initialState ?? consumeTabInitialState(tabId));

    useImperativeHandle(ref, () => ({
      getFullState: () => plannerRef.current?.getFullState() ?? null,
      unlinkSetup: () => plannerRef.current?.unlinkSetup(),
    }), []);

    return (
      <div style={{ display: isActive ? undefined : 'none', height: '100%' }}>
        <FactoryPlanner
          ref={plannerRef}
          tabId={tabId}
          tabName={tabName}
          isActive={isActive}
          initialState={initialRef.current}
          onDirtyChange={onDirtyChange}
          onLinkedSetupChange={onLinkedSetupChange}
        />
      </div>
    );
  }
);

FactoryPlannerShell.displayName = 'FactoryPlannerShell';

export default FactoryPlannerShell;
