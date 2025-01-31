// src/types.ts

/** Represents an item in the game */
export interface Item {
  id: string;
  name: string;
  category: string;
  stack?: number;
  fuel?: { category: string; value: number };
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

/** Represents an item's dependency tree */
export interface DependencyNode {
  item: string; // ID of the item
  amount: number;
  children?: DependencyNode[]; // Sub-dependencies
  byproduct?: boolean; // True if it's a byproduct
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
