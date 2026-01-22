import { useCallback, Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { DependencyNode } from '../../../types';
import { AppDispatch } from '../../../store';
import { setNodeMachineCount, setNodeMachineMultiplier } from '../store/dependencySlice';

// Define the expected shape of the dependencies state slice locally
interface DependencySliceStateForInteractions {
  dependencyTrees: Record<string, DependencyNode>;
  // Removed other potential properties
}

interface PlannerNodeInteractionsProps {
  dependencies: DependencySliceStateForInteractions;
  setExpandedNodes: Dispatch<SetStateAction<Record<string, boolean>>>;
  setMachineCountMap: Dispatch<SetStateAction<Record<string, number>>>;
  setMachineMultiplierMap: Dispatch<SetStateAction<Record<string, number>>>;
  setNodeExtensionOverrides: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export const usePlannerNodeInteractions = ({
  dependencies,
  setExpandedNodes,
  setMachineCountMap,
  setMachineMultiplierMap,
  setNodeExtensionOverrides,
}: PlannerNodeInteractionsProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleExpandCollapseAll = useCallback((expand: boolean) => {
    const newExpandedNodes: Record<string, boolean> = {};
    const collectNodeIds = (node: DependencyNode) => {
      newExpandedNodes[node.uniqueId] = expand;
      if (node.children) {
        node.children.forEach(collectNodeIds);
      }
    };
    Object.values(dependencies.dependencyTrees).forEach(collectNodeIds);
    setExpandedNodes(newExpandedNodes);
  }, [dependencies.dependencyTrees, setExpandedNodes]);

  const handleMachineCountChange = useCallback((nodeId: string, count: number) => {
    // Update local state for UI responsiveness
    setMachineCountMap(prev => ({ ...prev, [nodeId]: count }));
    // Sync to Redux for persistence and thunk access
    dispatch(setNodeMachineCount({ nodeId, machineCount: count }));
  }, [setMachineCountMap, dispatch]);

  const handleMachineMultiplierChange = useCallback((nodeId: string, multiplier: number) => {
    // Update local state for UI responsiveness
    setMachineMultiplierMap(prev => ({ ...prev, [nodeId]: multiplier }));
    // Sync to Redux for persistence and thunk access
    dispatch(setNodeMachineMultiplier({ nodeId, machineMultiplier: multiplier }));
  }, [setMachineMultiplierMap, dispatch]);

  const handleToggleNodeExtensions = useCallback((nodeId: string) => {
    setNodeExtensionOverrides(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  }, [setNodeExtensionOverrides]);

  return {
    handleExpandCollapseAll,
    handleMachineCountChange,
    handleMachineMultiplierChange,
    handleToggleNodeExtensions,
  };
}; 