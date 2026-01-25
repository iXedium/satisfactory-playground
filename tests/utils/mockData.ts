/**
 * Mock Data Fixtures
 * 
 * Provides sample data for testing including:
 * - Items (Iron Ore, Iron Ingot, Iron Plate, etc.)
 * - Recipes (smelting, crafting recipes)
 * - Dependency nodes and trees
 * - Factory functions for creating custom test data
 */

import type { Item, Recipe, DependencyNode } from '../../src/types';
import type { RootState } from '../../src/store';
import type { DependencyState } from '../../src/features/factory-planner/store/dependencySlice';
import { loadData } from '../../src/data/dataLoader';

// ============================================
// Sample Items
// ============================================

export const mockIronOre: Item = {
  id: 'Desc_OreIron_C',
  name: 'Iron Ore',
  category: 'ore',
  stack: 100,
};

export const mockIronIngot: Item = {
  id: 'Desc_IronIngot_C',
  name: 'Iron Ingot',
  category: 'ingot',
  stack: 100,
};

export const mockIronPlate: Item = {
  id: 'Desc_IronPlate_C',
  name: 'Iron Plate',
  category: 'standard-part',
  stack: 200,
};

export const mockIronRod: Item = {
  id: 'Desc_IronRod_C',
  name: 'Iron Rod',
  category: 'standard-part',
  stack: 200,
};

export const mockScrew: Item = {
  id: 'Desc_IronScrew_C',
  name: 'Screw',
  category: 'standard-part',
  stack: 500,
};

export const mockReinforcedIronPlate: Item = {
  id: 'Desc_IronPlateReinforced_C',
  name: 'Reinforced Iron Plate',
  category: 'standard-part',
  stack: 100,
};

export const mockCopper: Item = {
  id: 'Desc_OreCopper_C',
  name: 'Copper Ore',
  category: 'ore',
  stack: 100,
};

export const mockCopperIngot: Item = {
  id: 'Desc_CopperIngot_C',
  name: 'Copper Ingot',
  category: 'ingot',
  stack: 100,
};

export const mockWire: Item = {
  id: 'Desc_Wire_C',
  name: 'Wire',
  category: 'standard-part',
  stack: 500,
};

export const mockCable: Item = {
  id: 'Desc_Cable_C',
  name: 'Cable',
  category: 'standard-part',
  stack: 200,
};

// ============================================
// Sample Recipes
// ============================================

export const mockIronIngotRecipe: Recipe = {
  id: 'Recipe_IngotIron_C',
  name: 'Iron Ingot',
  producers: ['Desc_SmelterMk1_C'],
  time: 2,
  in: { 'Desc_OreIron_C': 1 },
  out: { 'Desc_IronIngot_C': 1 },
  category: 'smelting',
};

export const mockIronPlateRecipe: Recipe = {
  id: 'Recipe_IronPlate_C',
  name: 'Iron Plate',
  producers: ['Desc_ConstructorMk1_C'],
  time: 6,
  in: { 'Desc_IronIngot_C': 3 },
  out: { 'Desc_IronPlate_C': 2 },
  category: 'standard-part',
};

export const mockIronRodRecipe: Recipe = {
  id: 'Recipe_IronRod_C',
  name: 'Iron Rod',
  producers: ['Desc_ConstructorMk1_C'],
  time: 4,
  in: { 'Desc_IronIngot_C': 1 },
  out: { 'Desc_IronRod_C': 1 },
  category: 'standard-part',
};

export const mockScrewRecipe: Recipe = {
  id: 'Recipe_Screw_C',
  name: 'Screw',
  producers: ['Desc_ConstructorMk1_C'],
  time: 6,
  in: { 'Desc_IronRod_C': 1 },
  out: { 'Desc_IronScrew_C': 4 },
  category: 'standard-part',
};

export const mockReinforcedIronPlateRecipe: Recipe = {
  id: 'Recipe_IronPlateReinforced_C',
  name: 'Reinforced Iron Plate',
  producers: ['Desc_AssemblerMk1_C'],
  time: 12,
  in: { 'Desc_IronPlate_C': 6, 'Desc_IronScrew_C': 12 },
  out: { 'Desc_IronPlateReinforced_C': 1 },
  category: 'standard-part',
};

export const mockCopperIngotRecipe: Recipe = {
  id: 'Recipe_IngotCopper_C',
  name: 'Copper Ingot',
  producers: ['Desc_SmelterMk1_C'],
  time: 2,
  in: { 'Desc_OreCopper_C': 1 },
  out: { 'Desc_CopperIngot_C': 1 },
  category: 'smelting',
};

export const mockWireRecipe: Recipe = {
  id: 'Recipe_Wire_C',
  name: 'Wire',
  producers: ['Desc_ConstructorMk1_C'],
  time: 4,
  in: { 'Desc_CopperIngot_C': 1 },
  out: { 'Desc_Wire_C': 2 },
  category: 'standard-part',
};

export const mockCableRecipe: Recipe = {
  id: 'Recipe_Cable_C',
  name: 'Cable',
  producers: ['Desc_ConstructorMk1_C'],
  time: 2,
  in: { 'Desc_Wire_C': 2 },
  out: { 'Desc_Cable_C': 1 },
  category: 'standard-part',
};

// ============================================
// Node Factory Functions
// ============================================

let nodeCounter = 0;

/**
 * Creates a mock dependency node with sensible defaults
 */
export function createMockNode(
  overrides: Partial<DependencyNode> & { id: string }
): DependencyNode {
  const id = overrides.id;
  const uniqueId = overrides.uniqueId ?? `${id}-${nodeCounter++}`;
  
  return {
    id,
    uniqueId,
    amount: 1,
    depth: 0,
    isRoot: false,
    isByproduct: false,
    isImport: false,
    isSelected: false,
    isCompleted: false,
    isHidden: false,
    isCyclicReference: false,
    excess: 0,
    machineCount: 1,
    machineMultiplier: 1,
    childrenVisible: true,
    ...overrides,
  };
}

/**
 * Creates a mock tree (root node with optional children)
 */
export function createMockTree(
  rootId: string,
  options: {
    amount?: number;
    recipe?: Recipe;
    children?: DependencyNode[];
    treeId?: string;
  } = {}
): DependencyNode {
  const treeId = options.treeId ?? rootId;
  
  return createMockNode({
    id: rootId,
    uniqueId: treeId,
    amount: options.amount ?? 1,
    recipe: options.recipe,
    children: options.children,
    isRoot: true,
    depth: 0,
  });
}

// ============================================
// Pre-built Sample Nodes
// ============================================

export const mockIronOreNode: DependencyNode = createMockNode({
  id: 'Desc_OreIron_C',
  uniqueId: 'iron-ore-1',
  amount: 30,
  depth: 2,
});

export const mockIronIngotNode: DependencyNode = createMockNode({
  id: 'Desc_IronIngot_C',
  uniqueId: 'iron-ingot-1',
  amount: 30,
  recipe: mockIronIngotRecipe,
  availableRecipes: [mockIronIngotRecipe],
  depth: 1,
  children: [mockIronOreNode],
});

export const mockIronPlateNode: DependencyNode = createMockNode({
  id: 'Desc_IronPlate_C',
  uniqueId: 'iron-plate-tree',
  amount: 20,
  recipe: mockIronPlateRecipe,
  availableRecipes: [mockIronPlateRecipe],
  isRoot: true,
  depth: 0,
  children: [mockIronIngotNode],
});

// ============================================
// State Factory Functions
// ============================================

/**
 * Creates a mock dependency state
 */
export function createMockDependencyState(
  overrides: Partial<DependencyState> = {}
): DependencyState {
  return {
    dependencyTrees: {},
    accumulatedDependencies: {},
    highlightedNodeId: null,
    errors: [],
    lastUpdateTime: Date.now(),
    ...overrides,
  };
}

/**
 * Creates a mock root state with all slices
 */
export function createMockRootState(
  overrides: Partial<RootState> = {}
): RootState {
  // Load real game data for items/recipes
  const gameData = loadData();
  
  return {
    data: {
      items: gameData.items,
      recipes: gameData.recipes,
    },
    dependencies: createMockDependencyState(overrides.dependencies),
    recipeSelections: {
      selections: {},
      ...overrides.recipeSelections,
    },
    treeUi: {
      expandedNodes: [],
      ...overrides.treeUi,
    },
    comparison: {
      activeSnapshot: null,
      showComparison: false,
      ...overrides.comparison,
    },
    history: {
      undoStack: [],
      redoStack: [],
      maxStackSize: 50,
      isRestoring: false,
      canUndo: false,
      canRedo: false,
      pendingTransaction: null,
      ...overrides.history,
    },
    ...overrides,
  } as RootState;
}

// ============================================
// Tree Builder (Fluent API)
// ============================================

/**
 * Fluent builder for creating complex dependency trees
 * 
 * @example
 * ```ts
 * const tree = new TreeBuilder('Desc_IronPlate_C')
 *   .withAmount(20)
 *   .withRecipe(mockIronPlateRecipe)
 *   .addChild('Desc_IronIngot_C', (child) => 
 *     child
 *       .withAmount(30)
 *       .withRecipe(mockIronIngotRecipe)
 *       .addChild('Desc_OreIron_C', (ore) => ore.withAmount(30))
 *   )
 *   .build();
 * ```
 */
export class TreeBuilder {
  private node: DependencyNode;
  private parentId: string = '';
  private depthLevel: number = 0;
  
  constructor(itemId: string, uniqueId?: string) {
    this.node = createMockNode({
      id: itemId,
      uniqueId: uniqueId ?? itemId,
      isRoot: true,
      depth: 0,
    });
  }
  
  withAmount(amount: number): this {
    this.node.amount = amount;
    return this;
  }
  
  withRecipe(recipe: Recipe): this {
    this.node.recipe = recipe;
    this.node.availableRecipes = [recipe];
    return this;
  }
  
  withAvailableRecipes(recipes: Recipe[]): this {
    this.node.availableRecipes = recipes;
    return this;
  }
  
  withExcess(excess: number): this {
    this.node.excess = excess;
    return this;
  }
  
  withMachineCount(count: number): this {
    this.node.machineCount = count;
    return this;
  }
  
  withMachineMultiplier(multiplier: number): this {
    this.node.machineMultiplier = multiplier;
    return this;
  }
  
  asImport(targetTreeId: string, targetNodeId: string): this {
    this.node.importReference = { targetTreeId, targetNodeId };
    this.node.isImport = true;
    return this;
  }
  
  asCompleted(): this {
    this.node.isCompleted = true;
    return this;
  }
  
  asSelected(): this {
    this.node.isSelected = true;
    return this;
  }
  
  asHidden(): this {
    this.node.isHidden = true;
    return this;
  }
  
  addChild(
    itemId: string,
    configure?: (builder: TreeBuilder) => TreeBuilder
  ): this {
    const childUniqueId = `${this.node.uniqueId}-${itemId}-${this.depthLevel + 1}`;
    const childBuilder = new TreeBuilder(itemId, childUniqueId);
    childBuilder.node.isRoot = false;
    childBuilder.node.depth = this.depthLevel + 1;
    childBuilder.parentId = this.node.uniqueId;
    childBuilder.depthLevel = this.depthLevel + 1;
    
    if (configure) {
      configure(childBuilder);
    }
    
    if (!this.node.children) {
      this.node.children = [];
    }
    this.node.children.push(childBuilder.build());
    
    return this;
  }
  
  addByproduct(
    itemId: string,
    amount: number
  ): this {
    const byproductUniqueId = `${this.node.uniqueId}-byproduct-${itemId}`;
    const byproduct = createMockNode({
      id: itemId,
      uniqueId: byproductUniqueId,
      amount,
      isByproduct: true,
      depth: this.depthLevel + 1,
    });
    
    if (!this.node.children) {
      this.node.children = [];
    }
    this.node.children.push(byproduct);
    
    return this;
  }
  
  build(): DependencyNode {
    return { ...this.node };
  }
}

// ============================================
// Reset Counter (for test isolation)
// ============================================

/**
 * Resets the node counter - call in beforeEach for consistent IDs
 */
export function resetNodeCounter(): void {
  nodeCounter = 0;
}
