import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { DependencyNode, ComparisonSnapshot, TreeSnapshot, NodeSnapshot, NodeComparisonResult } from '../../../types';
import {
  storeSnapshot,
  clearSnapshot,
  toggleComparisonDisplay,
  setComparisonDisplay,
  removeSnapshotTree,
  selectActiveSnapshot,
  selectShowComparison,
} from '../store/comparisonSlice';
import { getMachineForRecipe } from '../../../data';
import { logger } from '../../../utils/logger';

// --- Helper: Calculate efficiency for a node ---
const calculateNodeEfficiency = (
  amount: number,
  excess: number,
  machineCount: number,
  machineMultiplier: number,
  nominalRate: number
): number => {
  if (machineCount <= 0 || machineMultiplier <= 0 || nominalRate <= 0) return 0;
  const totalCapacity = machineCount * machineMultiplier * nominalRate;
  if (totalCapacity === 0) return 0;
  const needed = amount + excess;
  return (needed / totalCapacity) * 100;
};

// --- Helper: Compare values and return change type ---
const compareValues = (current: number, snapshot: number): 'increased' | 'decreased' | 'unchanged' => {
  if (current > snapshot) return 'increased';
  if (current < snapshot) return 'decreased';
  return 'unchanged';
};

// --- Props Interface ---
interface UsePlannerComparisonProps {
  machineCountMap: Record<string, number>;
  machineMultiplierMap: Record<string, number>;
  excessMap: Record<string, number>;
  /**
   * Function to get nominal rate for a node
   * This needs to be provided because nominal rate calculation requires recipe data
   */
  getNominalRate?: (nodeId: string) => number;
}

// --- Return Type ---
export interface UsePlannerComparisonResult {
  /** Whether comparison display is enabled */
  showComparison: boolean;
  /** The active snapshot (null if none) */
  activeSnapshot: ComparisonSnapshot | null;
  /** Whether there is an active snapshot */
  hasSnapshot: boolean;
  /** Store current state as snapshot (async - calculates efficiency for all nodes) */
  storeCurrentSnapshot: (name?: string) => Promise<void>;
  /** Clear the active snapshot */
  clearActiveSnapshot: () => void;
  /** Toggle comparison display on/off */
  toggleComparison: () => void;
  /** Set comparison display explicitly */
  setShowComparison: (show: boolean) => void;
  /** Get comparison result for a specific node */
  getNodeComparison: (treeId: string, nodeId: string, currentAmount: number, currentEfficiency: number) => NodeComparisonResult;
  /** Remove a tree from the snapshot (when tree is deleted) */
  removeTreeFromSnapshot: (treeId: string) => void;
  /** Get snapshot info for display */
  snapshotInfo: { name: string; timestamp: number; treeCount: number } | null;
}

/**
 * Hook for managing production chain comparison snapshots
 */
export function usePlannerComparison({
  machineCountMap,
  machineMultiplierMap,
  excessMap,
}: UsePlannerComparisonProps): UsePlannerComparisonResult {
  const dispatch = useDispatch<AppDispatch>();
  
  const activeSnapshot = useSelector(selectActiveSnapshot);
  const showComparison = useSelector(selectShowComparison);
  const dependencyTrees = useSelector((state: RootState) => state.dependencies.dependencyTrees);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);

  const hasSnapshot = activeSnapshot !== null;

  // --- Snapshot Info for Display ---
  const snapshotInfo = useMemo(() => {
    if (!activeSnapshot) return null;
    return {
      name: activeSnapshot.name,
      timestamp: activeSnapshot.timestamp,
      treeCount: Object.keys(activeSnapshot.trees).length,
    };
  }, [activeSnapshot]);

  // --- Helper: Recursively extract node snapshots from a tree (async for machine lookup) ---
  const extractNodeSnapshots = useCallback(async (
    node: DependencyNode,
    treeId: string,
    snapshots: Record<string, NodeSnapshot>
  ): Promise<void> => {
    // Skip import/byproduct nodes for now - they inherit from source
    if (node.isImport || node.isByproduct) {
      // Still recurse into children if any
      if (node.children) {
        await Promise.all(node.children.map(child => extractNodeSnapshots(child, treeId, snapshots)));
      }
      return;
    }

    const machineCount = machineCountMap[node.uniqueId] ?? node.machineCount ?? 1;
    const machineMultiplier = machineMultiplierMap[node.uniqueId] ?? node.machineMultiplier ?? 1;
    const excess = excessMap[node.uniqueId] ?? node.excess ?? 0;
    
    // Get recipe info
    const recipeId = recipeSelections[node.uniqueId] || node.recipe?.id;
    const recipeName = node.recipe?.name;

    // Calculate efficiency at snapshot time
    // SNAPSHOT-ONLY: These values are stored for comparison baseline capture.
    // Do NOT use for live calculations; always recalculate fresh in component render.
    let efficiency = 0;
    if (node.recipe && recipeId) {
      try {
        const machine = await getMachineForRecipe(recipeId);
        if (machine && node.recipe.time > 0 && machine.speed > 0) {
          const itemOut = node.recipe.out[node.id];
          if (itemOut) {
            const nominalRate = (60 / node.recipe.time) * itemOut * machine.speed;
            if (nominalRate > 0 && machineCount > 0 && machineMultiplier > 0) {
              const totalCapacity = machineCount * machineMultiplier * nominalRate;
              const needed = node.amount + excess;
              efficiency = (needed / totalCapacity) * 100;
            }
          }
        }
      } catch (error) {
        logger.warn('[usePlannerComparison] Failed to get machine for efficiency calc:', error);
      }
    }

    const snapshot: NodeSnapshot = {
      uniqueId: node.uniqueId,
      itemId: node.id,
      recipeId,
      recipeName,
      machineCount,
      machineMultiplier,
      excess,
      amount: node.amount,
      efficiency,
    };

    snapshots[node.uniqueId] = snapshot;

    // Recurse into children
    if (node.children) {
      await Promise.all(node.children.map(child => extractNodeSnapshots(child, treeId, snapshots)));
    }
  }, [machineCountMap, machineMultiplierMap, excessMap, recipeSelections]);

  // --- Store Current State as Snapshot ---
  const storeCurrentSnapshot = useCallback(async (name?: string) => {
    const timestamp = Date.now();
    const snapshotName = name || `Snapshot ${new Date(timestamp).toLocaleTimeString()}`;
    
    const trees: Record<string, TreeSnapshot> = {};

    // Process trees in parallel for efficiency
    await Promise.all(Object.entries(dependencyTrees).map(async ([treeId, tree]) => {
      if (!tree) return;

      const nodes: Record<string, NodeSnapshot> = {};
      await extractNodeSnapshots(tree, treeId, nodes);

      trees[treeId] = {
        treeId,
        rootItemId: tree.id,
        rootItemName: tree.recipe?.name || tree.id,
        timestamp,
        nodes,
      };
    }));

    const snapshot: ComparisonSnapshot = {
      id: `snapshot-${timestamp}`,
      name: snapshotName,
      timestamp,
      trees,
    };

    dispatch(storeSnapshot(snapshot));
    logger.info('[usePlannerComparison] Stored snapshot:', snapshotName, 'with', Object.keys(trees).length, 'trees');
  }, [dependencyTrees, extractNodeSnapshots, dispatch]);

  // --- Clear Active Snapshot ---
  const clearActiveSnapshot = useCallback(() => {
    dispatch(clearSnapshot());
  }, [dispatch]);

  // --- Toggle Comparison Display ---
  const toggleComparison = useCallback(() => {
    dispatch(toggleComparisonDisplay());
  }, [dispatch]);

  // --- Set Comparison Display ---
  const setShowComparison = useCallback((show: boolean) => {
    dispatch(setComparisonDisplay(show));
  }, [dispatch]);

  // --- Remove Tree from Snapshot ---
  const removeTreeFromSnapshot = useCallback((treeId: string) => {
    dispatch(removeSnapshotTree(treeId));
  }, [dispatch]);

  // --- Get Comparison for a Specific Node ---
  const getNodeComparison = useCallback((
    treeId: string,
    nodeId: string,
    currentAmount: number,
    currentEfficiency: number
  ): NodeComparisonResult => {
    // No snapshot = no comparison
    if (!activeSnapshot) {
      return {
        hasSnapshot: false,
        changes: {
          machineCount: 'unchanged',
          machineMultiplier: 'unchanged',
          excess: 'unchanged',
          amount: 'unchanged',
          efficiency: 'unchanged',
          recipe: 'unchanged',
          isNew: false,
          isRemoved: false,
        },
      };
    }

    const treeSnapshot = activeSnapshot.trees[treeId];
    
    // Tree didn't exist in snapshot = all nodes are new
    if (!treeSnapshot) {
      return {
        hasSnapshot: true,
        changes: {
          machineCount: 'unchanged',
          machineMultiplier: 'unchanged',
          excess: 'unchanged',
          amount: 'unchanged',
          efficiency: 'unchanged',
          recipe: 'unchanged',
          isNew: true,
          isRemoved: false,
        },
      };
    }

    const nodeSnapshot = treeSnapshot.nodes[nodeId];

    // Node didn't exist in snapshot = it's new
    if (!nodeSnapshot) {
      return {
        hasSnapshot: true,
        changes: {
          machineCount: 'unchanged',
          machineMultiplier: 'unchanged',
          excess: 'unchanged',
          amount: 'unchanged',
          efficiency: 'unchanged',
          recipe: 'unchanged',
          isNew: true,
          isRemoved: false,
        },
      };
    }

    // Get current values
    const currentMachineCount = machineCountMap[nodeId] ?? 1;
    const currentMachineMultiplier = machineMultiplierMap[nodeId] ?? 1;
    const currentExcess = excessMap[nodeId] ?? 0;
    const currentRecipeId = recipeSelections[nodeId];

    // Compare values
    const result: NodeComparisonResult = {
      hasSnapshot: true,
      snapshotValues: nodeSnapshot,
      changes: {
        machineCount: compareValues(currentMachineCount, nodeSnapshot.machineCount),
        machineMultiplier: compareValues(currentMachineMultiplier, nodeSnapshot.machineMultiplier),
        excess: compareValues(currentExcess, nodeSnapshot.excess),
        amount: compareValues(currentAmount, nodeSnapshot.amount),
        efficiency: compareValues(currentEfficiency, nodeSnapshot.efficiency || 0),
        recipe: currentRecipeId !== nodeSnapshot.recipeId ? 'changed' : 'unchanged',
        isNew: false,
        isRemoved: false,
      },
    };

    return result;
  }, [activeSnapshot, machineCountMap, machineMultiplierMap, excessMap, recipeSelections]);

  return {
    showComparison,
    activeSnapshot,
    hasSnapshot,
    storeCurrentSnapshot,
    clearActiveSnapshot,
    toggleComparison,
    setShowComparison,
    getNodeComparison,
    removeTreeFromSnapshot,
    snapshotInfo,
  };
}
