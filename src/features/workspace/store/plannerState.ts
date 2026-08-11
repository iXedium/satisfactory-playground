import { DependencyState } from '../../factory-planner/store/dependencySlice';
import { RecipeSelectionsState } from '../../factory-planner/store/recipeSelectionsSlice';
import { ComparisonState } from '../../factory-planner/store/comparisonSlice';
import { HistoryState } from '../../factory-planner/store/historySlice';
import { TreeUiState } from '../../factory-planner/store/treeUiSlice';

export interface ActiveOperation {
  description: string;
  startedAt: number;
}

export interface PlannerState {
  dependencies: DependencyState;
  recipeSelections: RecipeSelectionsState;
  history: HistoryState;
  comparison: ComparisonState;
  treeUi: TreeUiState;
  activeOperations: Record<string, ActiveOperation>;
}

export function createEmptyPlannerState(): PlannerState {
  return {
    dependencies: {
      dependencyTrees: {},
      accumulatedDependencies: {},
      highlightedNodeId: null,
      manualTreeOrder: [],
      externalImports: {},
      errors: [],
      lastUpdateTime: 0,
    },
    recipeSelections: { selections: {} },
    history: {
      isRestoring: false,
      undoStack: [],
      redoStack: [],
      maxStackSize: 50,
      pendingTransaction: null,
      canUndo: false,
      canRedo: false,
    } as HistoryState,
    comparison: {
      activeSnapshot: null,
      showComparison: false,
    } as ComparisonState,
    treeUi: { expandedNodes: [] },
    activeOperations: {},
  };
}
