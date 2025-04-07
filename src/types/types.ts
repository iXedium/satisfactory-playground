export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  selectedRecipeId?: string | null;
  recipe?: Recipe;
  children?: DependencyNode[];
  availableRecipes?: Recipe[];
  excess?: number;
  childrenVisible?: boolean;
  originalChildren?: DependencyNode[]; // Used to store original tree when importing
  
  // New import reference system
  importReference?: ImportReference;
  
  // Legacy import system properties (will be deprecated)
  isImport?: boolean;
  importedFrom?: string;
} 