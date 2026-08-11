import { useCallback, Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { DependencyNode } from '../../../types';
import { getMachineForRecipe } from '../../../data';
import { findNodeById } from '../../../utils';
import {
  updateTreeProduction,
  updateExcessProduction,
  destroyNodeRecursiveThunk,
  updateNodeProperties,
  beginHistoryTransaction,
  commitHistoryTransaction,
} from '../store';

interface PlannerBulkActionsProps {
  dependencyTrees: Record<string, DependencyNode>;
  setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
}

export interface PlannerBulkActions {
  handleDeleteAllTrees: () => Promise<void>;
  handleToggleAllHidden: (targetHidden: boolean) => void;
  handleResetAllExcess: () => Promise<void>;
  handleMaxAllExcess: () => Promise<void>;
  handleToggleAllSelected: (targetSelected: boolean) => void;
  handleToggleAllCompleted: (targetCompleted: boolean) => void;
}

export const usePlannerBulkActions = ({
  dependencyTrees,
  setExcessMap,
}: PlannerBulkActionsProps): PlannerBulkActions => {
  const dispatch = useDispatch<AppDispatch>();

  const collectAllNodes = useCallback((): DependencyNode[] => {
    const nodes: DependencyNode[] = [];
    const walk = (node: DependencyNode) => {
      nodes.push(node);
      node.children?.forEach(walk);
    };
    Object.values(dependencyTrees).forEach(walk);
    return nodes;
  }, [dependencyTrees]);

  const findTreeId = useCallback((nodeId: string): string | null => {
    for (const [treeId, tree] of Object.entries(dependencyTrees)) {
      if (findNodeById(tree, nodeId)) return treeId;
    }
    return null;
  }, [dependencyTrees]);

  const handleDeleteAllTrees = useCallback(async () => {
    const treeIds = Object.keys(dependencyTrees);
    if (treeIds.length === 0) return;
    dispatch(beginHistoryTransaction('Delete all chains') as unknown as Parameters<typeof dispatch>[0]);
    try {
      for (const treeId of treeIds) {
        await dispatch(destroyNodeRecursiveThunk({ treeId }));
      }
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    } catch {
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    }
  }, [dependencyTrees, dispatch]);

  const handleToggleAllHidden = useCallback((targetHidden: boolean) => {
    const roots = Object.values(dependencyTrees);
    if (roots.length === 0) return;
    dispatch(beginHistoryTransaction(targetHidden ? 'Hide all chains' : 'Show all chains') as unknown as Parameters<typeof dispatch>[0]);
    roots.forEach(root => {
      dispatch(updateNodeProperties({ nodeId: root.uniqueId, updatedNode: { isHidden: targetHidden } }) as unknown as Parameters<typeof dispatch>[0]);
    });
    dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
  }, [dependencyTrees, dispatch]);

  // Shared helper: apply a computed excess value to every non-byproduct/non-import node
  // in a single pass, then recalculate each root tree once to propagate amounts.
  const applyExcessToAllNodes = useCallback(async (computeExcess: (node: DependencyNode) => number) => {
    const nodes = collectAllNodes().filter(n => !n.isByproduct && !n.isImport);
    const roots = Object.values(dependencyTrees);
    if (nodes.length === 0 || roots.length === 0) return;

    dispatch(beginHistoryTransaction('Set all excess') as unknown as Parameters<typeof dispatch>[0]);
    try {
      // 1. Compute and apply excess for every node in one synchronous pass.
      const newExcessMap: Record<string, number> = {};
      for (const node of nodes) {
        const value = computeExcess(node);
        newExcessMap[node.uniqueId] = value;
        const treeId = findTreeId(node.uniqueId);
        if (treeId) {
          dispatch(updateExcessProduction({ nodeId: node.uniqueId, treeId, amount: value }));
        }
      }
      setExcessMap(prev => ({ ...prev, ...newExcessMap }));

      // 2. Recalculate each root tree once so child amounts reflect the new excess.
      for (const root of roots) {
        await dispatch(updateTreeProduction(root.uniqueId, root.uniqueId, 'forced', root.amount || 0));
      }

      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    } catch {
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    }
  }, [collectAllNodes, findTreeId, dependencyTrees, dispatch, setExcessMap]);

  const handleResetAllExcess = useCallback(() => {
    return applyExcessToAllNodes(() => 0);
  }, [applyExcessToAllNodes]);

  const handleMaxAllExcess = useCallback(async () => {
    // Compute max excess for every node first (asynchronously), then apply in one pass.
    const nodes = collectAllNodes().filter(n => !n.isByproduct && !n.isImport && n.recipe?.id);
    if (nodes.length === 0) return;

    const computedExcess: Record<string, number> = {};
    for (const node of nodes) {
      const recipe = node.recipe!;
      const itemOut = recipe.out?.[node.id];
      if (!itemOut || recipe.time <= 0) continue;
      const machine = await getMachineForRecipe(recipe.id);
      if (!machine || machine.speed <= 0) continue;
      const nominalRate = (60 / recipe.time) * itemOut * machine.speed;
      const machineCount = node.machineCount ?? 1;
      const multiplier = node.machineMultiplier ?? 1;
      const totalCapacity = machineCount * multiplier * nominalRate;
      computedExcess[node.uniqueId] = Math.max(0, totalCapacity - node.amount);
    }

    await applyExcessToAllNodes((node) => computedExcess[node.uniqueId] ?? 0);
  }, [applyExcessToAllNodes, collectAllNodes]);

  const handleToggleAllSelected = useCallback((targetSelected: boolean) => {
    const nodes = collectAllNodes();
    if (nodes.length === 0) return;
    dispatch(beginHistoryTransaction(targetSelected ? 'Select all nodes' : 'Unselect all nodes') as unknown as Parameters<typeof dispatch>[0]);
    nodes.forEach(node => {
      dispatch(updateNodeProperties({ nodeId: node.uniqueId, updatedNode: { isSelected: targetSelected } }) as unknown as Parameters<typeof dispatch>[0]);
    });
    dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
  }, [collectAllNodes, dispatch]);

  const handleToggleAllCompleted = useCallback((targetCompleted: boolean) => {
    const nodes = collectAllNodes();
    if (nodes.length === 0) return;
    dispatch(beginHistoryTransaction(targetCompleted ? 'Mark all nodes completed' : 'Unmark all nodes completed') as unknown as Parameters<typeof dispatch>[0]);
    nodes.forEach(node => {
      dispatch(updateNodeProperties({ nodeId: node.uniqueId, updatedNode: { isCompleted: targetCompleted } }) as unknown as Parameters<typeof dispatch>[0]);
    });
    dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
  }, [collectAllNodes, dispatch]);

  return {
    handleDeleteAllTrees,
    handleToggleAllHidden,
    handleResetAllExcess,
    handleMaxAllExcess,
    handleToggleAllSelected,
    handleToggleAllCompleted,
  };
};
