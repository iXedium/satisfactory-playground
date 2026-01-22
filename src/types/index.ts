// src/types.ts

/** Represents an item in the game */
export interface Item {
  id: string;
  name: string;
  category: string;
  stack?: number;
  fuel?: { category: string; value: number };
  icon?: string;
}

/** Represents a recipe in the game */
export interface Recipe {
  id: string;
  name: string;
  producers: string[];
  time: number;
  in: Record<string, number>;
  out: Record<string, number>;
  category: string;
}

/** Represents a building/machine in the game */
export interface Building {
  id: string;
  name: string;
  category: string;
  // Add other relevant properties like power consumption, etc. as needed
}

/** Represents an item's dependency tree */
export interface DependencyNode {
  id: string; // Item class name
  uniqueId: string; // Unique identifier for this specific node instance
  amount: number; // Required amount per minute
  recipe?: Recipe; // Selected recipe to produce this item
  availableRecipes?: Recipe[]; // All recipes that can produce this item
  children?: DependencyNode[]; // Sub-dependencies (ingredients)
  originalChildren?: DependencyNode[]; // Stores original children when importing
  isRoot?: boolean; // True if this is the root node of a tree
  isByproduct?: boolean; // True if it's a byproduct of the parent's recipe
  isImport?: boolean; // True if node (or an ancestor) imports from another tree (Legacy)
  importedFrom?: string; // Tree ID it's imported from (Legacy)
  importReference?: { targetTreeId: string; targetNodeId: string }; // New import system
  childrenVisible?: boolean; // Control visibility of children, especially for imported nodes
  depth?: number; // Current visual depth
  isSelected?: boolean; // New property for selection state
  isCompleted?: boolean; // New property for completion state
  excess?: number; // Amount of excess production requested for this node
  machineCount?: number; // Number of machines allocated
  machineMultiplier?: number; // Clock speed/multiplier for machines
  originalDepth?: number; // Original depth in the parent tree before becoming an import root
  isHidden?: boolean; // True if this node is hidden (shy layer)
}

/** Stores calculated dependency state */
export interface DependencyState {
  dependencies: DependencyNode[];
}

/** Data structure that holds everything in the app */
export interface DataStructure {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
}

// Add the Icon type definition here
export interface Icon {
  id: string;
  position: string;
  color: string;
}
