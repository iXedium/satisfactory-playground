export interface ActiveOperation {
  description: string;
  startedAt: number;
}

export interface PlannerState {
  dependencies: {
    dependencyTrees: Record<string, unknown>;
    accumulatedDependencies: Record<string, unknown>;
    highlightedNodeId: string | null;
    manualTreeOrder: string[];
    externalImports: Record<string, true>;
    errors: string[];
    lastUpdateTime: number;
  };
  recipeSelections: { selections: Record<string, string> };
  history: {
    isRestoring: boolean;
    undoStack: unknown[];
    redoStack: unknown[];
    pendingTransaction: unknown | null;
  };
  comparison: {
    activeSnapshot: unknown;
    showComparison: boolean;
  };
  treeUi: { expandedNodes: string[] };
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
      pendingTransaction: null,
    },
    comparison: {
      activeSnapshot: null,
      showComparison: false,
    },
    treeUi: { expandedNodes: [] },
    activeOperations: {},
  };
}
