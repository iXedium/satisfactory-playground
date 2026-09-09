import { describe, it, expect } from 'vitest';
import { resolveSelfLoops } from '../../src/utils/cycleResolution/selfLoopResolver';
import { buildRecipeGraph, findCycleGroups } from '../../src/utils/cycleResolution/cycleDetector';
import { solveCycle } from '../../src/utils/cycleResolution/cycleSolver';
import { Recipe } from '../../src/types';

describe('Cycle Resolution', () => {
  describe('Phase 1: resolveSelfLoops', () => {
    it('should correctly net out items that appear in both in and out', () => {
      const selfLoopRecipe: Recipe = { 
        id: 'encased-uranium', 
        name: 'Encased Uranium Cell', 
        time: 12, 
        in: { 'uranium': 10, 'sulfuric-acid': 8 }, 
        out: { 'encased-uranium': 5, 'sulfuric-acid': 2 }, 
        producers: [], category: 'blender' 
      };

      const result = resolveSelfLoops(selfLoopRecipe, 'encased-uranium');
      
      expect(result.hasSelfLoops).toBe(true);
      expect(result.netInputs['sulfuric-acid']).toBe(6);
      expect(result.netOutputs['sulfuric-acid']).toBeUndefined();
      expect(result.netInputs['uranium']).toBe(10);
      
      expect(result.recirculatedItems['sulfuric-acid']).toBeDefined();
      expect(result.recirculatedItems['sulfuric-acid'].recirculated).toBe(2);
      expect(result.recirculatedItems['sulfuric-acid'].netInput).toBe(6);
    });

    it('should handle zero net input', () => {
      const recipe: Recipe = {
        id: 'test', name: 'Test', time: 1, producers: [], category: 'test',
        in: { 'water': 10 }, out: { 'product': 1, 'water': 10 }
      };
      const result = resolveSelfLoops(recipe, 'product');
      expect(result.netInputs['water']).toBeUndefined();
      expect(result.netOutputs['water']).toBeUndefined();
      expect(result.recirculatedItems['water'].recirculated).toBe(10);
    });
  });

  describe('Phase 2 & 3: detectCycles and solveCycle', () => {
    const plasticRubberRecipes: Recipe[] = [
      { id: 'recycled-plastic', name: 'Recycled Plastic', time: 6, producers: [], category: 'refinery', in: { 'rubber': 3, 'fuel': 3 }, out: { 'plastic': 6 } },
      { id: 'recycled-rubber', name: 'Recycled Rubber', time: 6, producers: [], category: 'refinery', in: { 'plastic': 3, 'fuel': 3 }, out: { 'rubber': 6 } },
    ];
    const recipeMap = new Map<string, Recipe>(plasticRubberRecipes.map(r => [r.id, r]));

    it('should detect the mutual cycle', () => {
      const graph = buildRecipeGraph(plasticRubberRecipes);
      const groups = findCycleGroups(graph);
      
      expect(groups.length).toBe(1);
      expect(groups[0].type).toBe('mutual');
      expect(groups[0].itemIds.has('plastic')).toBe(true);
      expect(groups[0].itemIds.has('rubber')).toBe(true);
    });

    it('should solve the plastic/rubber cycle', () => {
      const graph = buildRecipeGraph(plasticRubberRecipes);
      const group = findCycleGroups(graph)[0];
      
      const externalDemands = { 'plastic': 60 }; // Need 60 plastic/min
      
      const resolution = solveCycle(group, externalDemands, {}, recipeMap);
      
      expect(resolution.converged).toBe(true);
      
      const plastic = resolution.variables.find(v => v.itemId === 'plastic')!;
      const rubber = resolution.variables.find(v => v.itemId === 'rubber')!;
      
      expect(plastic.grossRequirement).toBeCloseTo(80, 2);
      expect(plastic.netRequirement).toBeCloseTo(80, 2);
      expect(plastic.recirculated).toBeCloseTo(20, 2);
      
      expect(rubber.grossRequirement).toBeCloseTo(40, 2);
      expect(rubber.netRequirement).toBeCloseTo(40, 2);
      expect(rubber.recirculated).toBeCloseTo(40, 2);
      
      // Check total fuel requirement indirectly via cycles
      // Plastic: 80 / 60 (per min) = 1.333 machines = 80/min
      // Wait, 6 output per 6s = 60 per minute.
      // 80 plastic -> 1.333 machines * 30 fuel/min = 40 fuel/min
      // Rubber: 40 output -> 0.666 machines * 30 fuel/min = 20 fuel/min
      // Total fuel = 60/min.
    });
  });
});
