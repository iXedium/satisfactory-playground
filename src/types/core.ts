/**
 * Core type definitions for the Satisfactory Production Planner
 */

// Tree Structure Types

/**
 * Represents a node in a dependency tree
 */
export interface DependencyNode {
  /** The item ID */
  id: string;
  /** The amount of the item to produce */
  amount: number;
  /** A unique identifier for this specific node */
  uniqueId: string;
  /** Whether this node is a root node */
  isRoot?: boolean;
  /** Whether this node is a byproduct */
  isByproduct?: boolean;
  /** Whether this node is imported from another tree */
  isImport?: boolean;
  /** The ID of the selected recipe */
  selectedRecipeId?: string;
  /** Available recipes for this item */
  availableRecipes?: Recipe[];
  /** Child nodes (inputs) */
  children: DependencyNode[];
  /** The amount of excess production for this node */
  excess: number;
  /** Original children before any modifications */
  originalChildren?: DependencyNode[];
  /** If this is an import node, the ID of the source tree */
  importedFrom?: string;
}

/**
 * Represents a node in the accumulated view
 */
export interface AccumulatedNode {
  /** The item ID */
  itemId: string;
  /** The total amount from all nodes */
  amount: number;
  /** IDs of all contributing nodes */
  nodeIds: string[];
  /** Whether this node is a byproduct */
  isByproduct: boolean;
  /** The ID of the selected recipe */
  selectedRecipeId?: string;
  /** The number of machines */
  machineCount?: number;
  /** The machine multiplier (overclocking) */
  machineMultiplier?: number;
  /** The amount of excess production */
  excess?: number;
}

/**
 * Normalized version of the dependency tree state
 */
export interface NormalizedTreeState {
  /** All nodes indexed by their uniqueId */
  nodes: Record<string, DependencyNode>;
  /** Map of tree IDs to their root node IDs */
  trees: Record<string, string>;
  /** The order of trees in the UI */
  treeOrder: string[];
}

// Recipe and Item Types

/**
 * Represents a recipe in the game
 */
export interface Recipe {
  /** The recipe ID */
  id: string;
  /** Input items and amounts */
  in: Record<string, number>;
  /** Output items and amounts */
  out: Record<string, number>;
  /** Recipe processing time in seconds */
  time: number;
  /** The machine type that can process this recipe */
  machine?: string;
}

/**
 * Represents a machine in the game
 */
export interface Machine {
  /** The machine ID */
  id: string;
  /** The machine name */
  name: string;
  /** The machine processing speed multiplier */
  speed: number;
  /** The machine type */
  type: string;
  /** Power usage in MW */
  usage: number;
  /** Number of module slots */
  modules?: number;
}

/**
 * Represents an item in the game
 */
export interface Item {
  /** The item ID */
  id: string;
  /** The item name */
  name: string;
  /** The stack size */
  stack: number;
  /** The item type */
  type: string;
  /** The item class */
  class?: string;
  /** Whether the item sinks (for AWESOME sink) */
  sink?: boolean;
  /** Sink value */
  sinkValue?: number;
}

// Service Types

/**
 * Options for tree calculation
 */
export interface TreeCalculationOptions {
  /** Recipe selections by node ID */
  recipeSelections?: Record<string, string>;
  /** Excess production values by node ID */
  excessMap?: Record<string, number>;
  /** Import mappings */
  importMap?: Record<string, { targetTreeId: string; amount: number }>;
  /** Whether to use cached results */
  useCache?: boolean;
}

/**
 * Machine calculation result
 */
export interface MachineCalculationResult {
  /** Number of machines required */
  machineCount: number;
  /** Efficiency percentage (0-100+) */
  efficiency: number;
  /** The machine type */
  machineType: string;
  /** Power consumption in MW */
  powerConsumption: number;
}

// UI Types

/**
 * Available view modes
 */
export type ViewMode = 'tree' | 'accumulated';

/**
 * Node extension settings
 */
export interface NodeExtensionSettings {
  /** Whether to show extensions */
  showExtensions: boolean;
  /** Whether to accumulate extensions */
  accumulateExtensions: boolean;
  /** Per-node overrides */
  nodeOverrides: Record<string, boolean>;
}

/**
 * Machine display settings
 */
export interface MachineDisplaySettings {
  /** Whether to show machines */
  showMachines: boolean;
  /** Whether to show machine multipliers */
  showMachineMultiplier: boolean;
}

// Redux State Types

/**
 * Root state type for the Redux store
 * This will be updated to match the new structure once implemented
 */
export interface RootState {
  dependencies: DependencyState;
  recipeSelections: RecipeSelectionsState;
  ui: UIState;
  // Future slices will be added here
}

/**
 * Current dependency state shape
 * This will be replaced with a normalized structure
 */
export interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedNodes: AccumulatedNode[];
  loading: boolean;
  error: string | null;
}

/**
 * Recipe selections state shape
 */
export interface RecipeSelectionsState {
  selections: Record<string, string>;
}

/**
 * UI state shape
 */
export interface UIState {
  expandedNodes: Record<string, boolean>;
  viewMode: ViewMode;
  nodeExtensions: NodeExtensionSettings;
  machineDisplay: MachineDisplaySettings;
} 