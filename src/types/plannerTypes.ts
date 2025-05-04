import { Recipe } from "types";
import { Building } from "./index"; // Assuming Building is in index.ts

export interface DependencyNode {
  id: string; // e.g., 'iron-ore', 'iron-ingot'
  uniqueId: string; // Globally unique ID across all trees for this node instance
  treeId: string; // ID of the tree this node belongs to
  name: string;
  amount: number; // Amount required/produced by this node (per minute)
  dependencies?: DependencyNode[];
  recipeId?: string | null; // ID of the recipe used to produce this item
  machineCount?: number; // Number of machines used
  multiplier?: number; // Machine multiplier (e.g., overclocking)
  parentIds: string[]; // Track parent nodes
  isRoot?: boolean; // Is this the final output node of its tree?
  isInput?: boolean; // Is this a raw input node?
  isByproduct?: boolean; // Is this item a byproduct of the selected recipe?
  isImport?: boolean; // Is this node importing from another tree?
  importReference?: { sourceNodeId: string; targetTreeId: string }; // Details if it's an import
  efficiency?: number; // Production efficiency (0-1)
  excess?: number; // Amount produced in excess of requirements (per minute)
  itemColor?: string; // Optional color override for the item
  isSelected?: boolean; // Flag for user selection (e.g., work in progress)
  isCompleted?: boolean; // Flag for user completion
  availableRecipes?: Recipe[];
  recipe?: Recipe | null;
  machine?: Building | null;
  children?: DependencyNode[];
  originalDepth?: number; // Original depth before potential sorting
  childrenVisible?: boolean; // Control visibility of children, especially for imported nodes
  depth?: number; // Current visual depth
}
