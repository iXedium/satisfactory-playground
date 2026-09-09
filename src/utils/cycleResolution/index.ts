export { resolveSelfLoops } from './selfLoopResolver';
export type { SelfLoopResult, RecirculatedItem } from './selfLoopResolver';
export { buildRecipeGraph, findCycleGroups, detectCycles, getCycleGroupForItem } from './cycleDetector';
export type { RecipeGraph, CycleGroup, CycleType, CycleDetectionResult } from './cycleDetector';
export { solveCycle, buildCycleResolutionMeta } from './cycleSolver';
export type { CycleVariable, CycleResolution, CycleResolutionMeta } from './cycleSolver';
export { getCycleDetectionResult, clearCycleCache } from './cycleCache';
