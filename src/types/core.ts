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
  /** The node name */
  name?: string;
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
  /** The recipe ID used to produce this item */
  recipeId?: string;
  /** Available recipes for this item */
  availableRecipes?: Recipe[];
  /** Child nodes (inputs) */
  children?: DependencyNode[];
  /** Parent node */
  parent?: DependencyNode;
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
  /** The item data */
  item?: Item;
  /** The total amount from all nodes */
  amount: number;
  /** IDs of all contributing nodes */
  nodeIds: string[];
  /** Primary node ID */
  primaryNodeId?: string;
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
  /** The recipe name */
  name?: string;
  /** Recipe description */
  description?: string;
  /** Input items and amounts */
  in: Record<string, number>;
  /** Output items and amounts */
  out: Record<string, number>;
  /** Input items (alternative format) */
  ingredients?: Array<{
    id: string; 
    amount: number;
    itemId?: string;
    itemName?: string;
  }>;
  /** Output items (alternative format) */
  products?: Array<{
    id: string; 
    amount: number;
    itemId?: string;
    itemName?: string;
  }>;
  /** Recipe efficiency (0-1) */
  efficiency?: number;
  /** Recipe processing time in seconds */
  time: number;
  /** Alternative name for processing time */
  manufacturingDuration?: number;
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
  /** Clock speed (0-1) */
  clockSpeed?: number;
  /** Overclock percentage (0-2.5) */
  overclock?: number;
  /** Power production in MW (for generators) */
  powerProduction?: number;
  /** Power consumption in MW */
  powerConsumption?: number;
  /** Number of module slots */
  modules?: number;
  /** Energy usage per item */
  power?: number;
  /** Machine efficiency (0-1) */
  efficiency?: number;
}

/**
 * Extends the database Item interface with additional properties
 */
export interface DatabaseItem {
  /** The item ID */
  id: string;
  /** The item name */
  name: string;
  /** The item category */
  category: string;
}

/**
 * Represents an item in the game
 */
export interface Item extends DatabaseItem {
  /** The stack size */
  stack?: number;
  /** The item type */
  type?: string;
  /** The item description */
  description?: string;
  /** The item icon */
  icon?: string;
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
  /** Machine name */
  name?: string;
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
 * Root state type for Redux
 */
export interface RootState {
  ui: UIState;
  data: DataStructure;
  settings: SettingsState;
  dependencies: DependencyState;
  importExport: ImportExportState;
  // Add missing slices
  recipeSelections: {
    selections: Record<string, string>;  // nodeId -> recipeId
  };
  machines: {
    machineCount: Record<string, number>;
    machineMultiplier: Record<string, number>;
  };
}

/**
 * Data structure containing all application data
 */
export interface DataStructure {
  /** Dependency trees for all calculations */
  dependencies: Record<string, DependencyNode>;
  /** Recipe selections for each node */
  recipeSelections: Record<string, string>;
  /** Excess production for each node */
  excessMap: Record<string, number>;
  /** Machine count for each node */
  machineCountMap: Record<string, number>;
  /** Machine multiplier for each node */
  machineMultiplierMap: Record<string, number>;
}

/**
 * Settings state shape
 */
export interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  productionRate: number;
  defaultRecipes: Record<string, string>;
  visualOptions: {
    showMachines: boolean;
    showEfficiency: boolean;
    compactMode: boolean;
    darkMode: boolean;
  };
}

/**
 * Import/Export state shape
 */
export interface ImportExportState {
  importing: boolean;
  exporting: boolean;
  error: string | null;
  lastExport: string | null;
  lastImport: string | null;
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
  activeTab: string;
  activeTabIndex: number;
  expandedSections: Record<string, boolean>;
  modals: {
    settings: boolean;
    calculator: boolean;
    importExport: boolean;
  };
  sidebarOpen: boolean;
  isSidebarOpen: boolean;
  expandedNodes: Record<string, boolean>;
  nodeExtensionOverrides: Record<string, boolean>;
  viewMode: ViewMode;
  selectedView: string;
  nodeExtensions: NodeExtensionSettings;
  machineDisplay: MachineDisplaySettings;
}

/**
 * Represents an import relationship between trees
 */
export interface ImportRelationship {
  sourceTreeId: string;
  targetTreeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  amount: number;
} 