import { Recipe } from '../../types';

/** Metadata about an item that recirculates within a single recipe */
export interface RecirculatedItem {
  itemId: string;
  grossInput: number;     // Original recipe input amount (per cycle)
  grossOutput: number;    // Original recipe output amount (per cycle)
  netInput: number;       // Net input needed per cycle (grossInput - grossOutput, clamped >= 0)
  netOutput: number;      // Net output produced per cycle (grossOutput - grossInput, clamped >= 0)
  recirculated: number;   // Amount recirculated per cycle (min(grossInput, grossOutput))
}

/** Result of self-loop analysis for a recipe */
export interface SelfLoopResult {
  hasSelfLoops: boolean;
  /** Adjusted inputs with self-loop items netted out */
  netInputs: Record<string, number>;
  /** Adjusted outputs with self-loop items netted out */
  netOutputs: Record<string, number>;
  /** Details of each recirculated item */
  recirculatedItems: Record<string, RecirculatedItem>;
}

/**
 * Analyze a recipe for self-loops (items appearing in both inputs and outputs).
 * Returns adjusted net inputs/outputs and recirculation metadata.
 * 
 * @param recipe - The recipe to analyze
 * @param primaryOutputId - The main product item ID (excluded from self-loop analysis on the output side)
 */
export function resolveSelfLoops(recipe: Recipe, primaryOutputId: string): SelfLoopResult {
  const netInputs: Record<string, number> = { ...recipe.in };
  const netOutputs: Record<string, number> = { ...recipe.out };
  const recirculatedItems: Record<string, RecirculatedItem> = {};
  let hasSelfLoops = false;

  for (const itemId of Object.keys(recipe.in)) {
    if (itemId === primaryOutputId) continue;
    
    if (recipe.out[itemId] !== undefined) {
      hasSelfLoops = true;
      const grossInput = recipe.in[itemId];
      const grossOutput = recipe.out[itemId];
      
      const net = grossInput - grossOutput;
      const recirculated = Math.min(grossInput, grossOutput);
      
      const netInput = Math.max(0, net);
      const netOutput = Math.max(0, -net);
      
      recirculatedItems[itemId] = {
        itemId,
        grossInput,
        grossOutput,
        netInput,
        netOutput,
        recirculated
      };
      
      if (netInput > 0) {
        netInputs[itemId] = netInput;
      } else {
        delete netInputs[itemId];
      }
      
      if (netOutput > 0) {
        netOutputs[itemId] = netOutput;
      } else {
        delete netOutputs[itemId];
      }
    }
  }

  return {
    hasSelfLoops,
    netInputs,
    netOutputs,
    recirculatedItems
  };
}
