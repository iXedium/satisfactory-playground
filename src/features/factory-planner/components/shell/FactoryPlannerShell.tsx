import React, { forwardRef, useImperativeHandle, useEffect, useRef, useCallback } from 'react';
import { useStore } from 'react-redux';
import FactoryPlanner from '../FactoryPlanner';
import { SavedPlannerState } from '../../hooks/usePlannerSaveLoad';
import type { PlannerRootState } from '../../../../store/plannerStore';

interface FactoryPlannerShellProps {
  tabId: string;
  isActive: boolean;
  initialState?: SavedPlannerState;
  onDirtyChange?: (dirty: boolean) => void;
}

export interface FactoryPlannerShellRef {
  getFullState(): SavedPlannerState | null;
}

const FactoryPlannerShell = forwardRef<FactoryPlannerShellRef, FactoryPlannerShellProps>(
  ({ tabId, isActive, initialState, onDirtyChange }, ref) => {
    const store = useStore<PlannerRootState>();

    const getFullState = useCallback((): SavedPlannerState | null => {
      const state = store.getState();
      return {
        dependencies: JSON.parse(JSON.stringify(state.dependencies)),
        recipeSelections: JSON.parse(JSON.stringify(state.recipeSelections?.selections ?? {})),
        nodeState: {
          excessMap: {},
          machineCountMap: {},
          machineMultiplierMap: {},
          expandedNodes: {},
          nodeExtensionOverrides: {},
        },
        displayOptions: {
          viewDensity: 'compact',
          showExtensions: false,
          accumulateExtensions: true,
          showMachines: true,
          showMachineMultiplier: false,
          autoImport: true,
        },
        sortOptions: {
          key: 'originalDepth',
          direction: 'asc',
        },
        manualTreeOrder: [],
      };
    }, [store]);

    useImperativeHandle(ref, () => ({
      getFullState,
    }), [getFullState]);

    return (
      <div style={{ display: isActive ? undefined : 'none', height: '100%' }}>
        <FactoryPlanner tabId={tabId} isActive={isActive} />
      </div>
    );
  }
);

FactoryPlannerShell.displayName = 'FactoryPlannerShell';

export default FactoryPlannerShell;
