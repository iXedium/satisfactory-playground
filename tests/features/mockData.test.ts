/**
 * Unit Tests - Mock Data Fixtures
 * 
 * Tests to verify the mock data fixtures work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Items
  mockIronOre,
  mockIronIngot,
  mockIronPlate,
  mockIronRod,
  mockScrew,
  mockReinforcedIronPlate,
  // Recipes
  mockIronIngotRecipe,
  mockIronPlateRecipe,
  mockIronRodRecipe,
  mockScrewRecipe,
  mockReinforcedIronPlateRecipe,
  // Nodes
  createMockNode,
  createMockTree,
  mockIronPlateNode,
  // State factories
  createMockDependencyState,
  createMockRootState,
  // Builders
  TreeBuilder,
  resetNodeCounter,
} from '../utils';

describe('Mock Items', () => {
  it('should have correct item IDs', () => {
    expect(mockIronOre.id).toBe('Desc_OreIron_C');
    expect(mockIronIngot.id).toBe('Desc_IronIngot_C');
    expect(mockIronPlate.id).toBe('Desc_IronPlate_C');
    expect(mockIronRod.id).toBe('Desc_IronRod_C');
    expect(mockScrew.id).toBe('Desc_IronScrew_C');
  });

  it('should have correct categories', () => {
    expect(mockIronOre.category).toBe('ore');
    expect(mockIronIngot.category).toBe('ingot');
    expect(mockIronPlate.category).toBe('standard-part');
  });
});

describe('Mock Recipes', () => {
  it('should have correct recipe inputs and outputs', () => {
    // Iron Ingot: 1 Iron Ore -> 1 Iron Ingot
    expect(mockIronIngotRecipe.in).toHaveProperty('Desc_OreIron_C');
    expect(mockIronIngotRecipe.out).toHaveProperty('Desc_IronIngot_C');

    // Iron Plate: 3 Iron Ingot -> 2 Iron Plate
    expect(mockIronPlateRecipe.in['Desc_IronIngot_C']).toBe(3);
    expect(mockIronPlateRecipe.out['Desc_IronPlate_C']).toBe(2);

    // Reinforced Iron Plate: 6 Iron Plate + 12 Screw -> 1 RIP
    expect(mockReinforcedIronPlateRecipe.in['Desc_IronPlate_C']).toBe(6);
    expect(mockReinforcedIronPlateRecipe.in['Desc_IronScrew_C']).toBe(12);
    expect(mockReinforcedIronPlateRecipe.out['Desc_IronPlateReinforced_C']).toBe(1);
  });

  it('should have timing information', () => {
    expect(mockIronIngotRecipe.time).toBe(2);
    expect(mockIronPlateRecipe.time).toBe(6);
  });
});

describe('createMockNode', () => {
  beforeEach(() => {
    resetNodeCounter();
  });

  it('should create a node with required fields', () => {
    const node = createMockNode({ id: 'Desc_IronPlate_C' });

    expect(node.id).toBe('Desc_IronPlate_C');
    expect(node.uniqueId).toBeDefined();
    expect(node.amount).toBe(1);
  });

  it('should allow overriding defaults', () => {
    const node = createMockNode({
      id: 'Desc_IronPlate_C',
      amount: 100,
      depth: 5,
      isRoot: true,
    });

    expect(node.amount).toBe(100);
    expect(node.depth).toBe(5);
    expect(node.isRoot).toBe(true);
  });

  it('should generate unique IDs', () => {
    const node1 = createMockNode({ id: 'Desc_IronPlate_C' });
    const node2 = createMockNode({ id: 'Desc_IronPlate_C' });

    expect(node1.uniqueId).not.toBe(node2.uniqueId);
  });
});

describe('createMockTree', () => {
  it('should create a root node', () => {
    const tree = createMockTree('Desc_IronPlate_C');

    expect(tree.isRoot).toBe(true);
    expect(tree.depth).toBe(0);
  });

  it('should accept options', () => {
    const tree = createMockTree('Desc_IronPlate_C', {
      amount: 50,
      recipe: mockIronPlateRecipe,
      treeId: 'custom-id',
    });

    expect(tree.amount).toBe(50);
    expect(tree.recipe?.id).toBe(mockIronPlateRecipe.id);
    expect(tree.uniqueId).toBe('custom-id');
  });
});

describe('TreeBuilder', () => {
  it('should build a basic tree', () => {
    const tree = new TreeBuilder('Desc_IronPlate_C')
      .withAmount(20)
      .build();

    expect(tree.id).toBe('Desc_IronPlate_C');
    expect(tree.amount).toBe(20);
    expect(tree.isRoot).toBe(true);
  });

  it('should build trees with nested children', () => {
    const tree = new TreeBuilder('Desc_ReinforcedIronPlate_C', 'rip-tree')
      .withAmount(5)
      .withRecipe(mockReinforcedIronPlateRecipe)
      .addChild('Desc_IronPlate_C', (plate) =>
        plate
          .withAmount(30)
          .withRecipe(mockIronPlateRecipe)
          .addChild('Desc_IronIngot_C', (ingot) =>
            ingot
              .withAmount(45)
              .withRecipe(mockIronIngotRecipe)
              .addChild('Desc_OreIron_C', (ore) => ore.withAmount(45))
          )
      )
      .addChild('Desc_IronScrew_C', (screw) =>
        screw
          .withAmount(60)
          .withRecipe(mockScrewRecipe)
          .addChild('Desc_IronRod_C', (rod) =>
            rod
              .withAmount(15)
              .withRecipe(mockIronRodRecipe)
              .addChild('Desc_IronIngot_C', (ingot) => ingot.withAmount(15))
          )
      )
      .build();

    expect(tree.children).toHaveLength(2);
    expect(tree.children?.[0].id).toBe('Desc_IronPlate_C');
    expect(tree.children?.[1].id).toBe('Desc_IronScrew_C');
    
    // Check nested depths
    expect(tree.children?.[0].depth).toBe(1);
    expect(tree.children?.[0].children?.[0].depth).toBe(2);
  });

  it('should support import references', () => {
    const tree = new TreeBuilder('Desc_IronIngot_C')
      .asImport('other-tree', 'other-node')
      .build();

    expect(tree.isImport).toBe(true);
    expect(tree.importReference?.targetTreeId).toBe('other-tree');
  });

  it('should support completion and selection states', () => {
    const tree = new TreeBuilder('Desc_IronPlate_C')
      .asCompleted()
      .asSelected()
      .build();

    expect(tree.isCompleted).toBe(true);
    expect(tree.isSelected).toBe(true);
  });
});

describe('State Factories', () => {
  it('should create empty dependency state', () => {
    const state = createMockDependencyState();

    expect(state.dependencyTrees).toEqual({});
    expect(state.accumulatedDependencies).toEqual({});
    expect(state.errors).toEqual([]);
  });

  it('should create full root state', () => {
    const state = createMockRootState();

    expect(state).toHaveProperty('data');
    expect(state).toHaveProperty('dependencies');
    expect(state).toHaveProperty('recipeSelections');
    expect(state).toHaveProperty('treeUi');
    expect(state).toHaveProperty('comparison');
    expect(state).toHaveProperty('history');
    
    // Should have real game data loaded
    expect(Array.isArray(state.data.items)).toBe(true);
    expect(Array.isArray(state.data.recipes)).toBe(true);
  });
});
