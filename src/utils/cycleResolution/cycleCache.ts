import { Recipe } from '../../types';
import { CycleDetectionResult, detectCycles } from './cycleDetector';
import { getAllRecipes } from '../../data';
import { logger } from '../logger';

let cachedCycleResult: CycleDetectionResult | null = null;
let allRecipesCache: Map<string, Recipe> | null = null;

export const getCycleDetectionResult = async (): Promise<{ result: CycleDetectionResult, recipesMap: Map<string, Recipe> }> => {
  if (!cachedCycleResult || !allRecipesCache) {
    logger.info('[CycleCache] Initializing cycle detection cache from database...');
    const recipes = await getAllRecipes();
    allRecipesCache = new Map<string, Recipe>();
    for (const recipe of recipes) {
      allRecipesCache.set(recipe.id, recipe);
    }
    cachedCycleResult = detectCycles(recipes);
    logger.info(`[CycleCache] Detected ${cachedCycleResult.groups.length} cycle groups.`);
  }
  return { result: cachedCycleResult, recipesMap: allRecipesCache };
};

export const clearCycleCache = () => {
  cachedCycleResult = null;
  allRecipesCache = null;
};
