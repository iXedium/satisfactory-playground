import { Recipe } from '../../types';

/** A directed graph of item production relationships */
export interface RecipeGraph {
  /** All item IDs that participate in at least one recipe */
  nodes: Set<string>;
  /** item → Set of items it can produce (via being an input to a recipe that outputs them) */
  edges: Map<string, Set<string>>;
  /** item → Set of recipe IDs that produce this item */
  producedBy: Map<string, Set<string>>;
  /** recipeId → Recipe object for quick lookup */
  recipeMap: Map<string, Recipe>;
}

/** Classification of a cycle */
export type CycleType = 'mutual' | 'chain' | 'self';

/** A group of items that form a cycle */
export interface CycleGroup {
  /** Unique ID for this cycle group */
  id: string;
  /** Item IDs involved in this cycle */
  itemIds: Set<string>;
  /** Recipe IDs involved in this cycle */
  recipeIds: Set<string>;
  /** Type classification */
  type: CycleType;
}

/** Cached cycle detection results */
export interface CycleDetectionResult {
  /** All detected cycle groups */
  groups: CycleGroup[];
  /** Quick lookup: itemId → CycleGroup (or undefined if not in a cycle) */
  itemToCycleGroup: Map<string, CycleGroup>;
  /** The full recipe graph used for detection */
  graph: RecipeGraph;
}

/**
 * Builds a directed graph representing production relationships.
 * 
 * @param recipes - List of all recipes
 * @returns Built recipe graph
 */
export function buildRecipeGraph(recipes: Recipe[]): RecipeGraph {
  const nodes = new Set<string>();
  const edges = new Map<string, Set<string>>();
  const producedBy = new Map<string, Set<string>>();
  const recipeMap = new Map<string, Recipe>();

  for (const recipe of recipes) {
    recipeMap.set(recipe.id, recipe);
    
    for (const outId of Object.keys(recipe.out)) {
      nodes.add(outId);
      if (!producedBy.has(outId)) {
        producedBy.set(outId, new Set());
      }
      producedBy.get(outId)!.add(recipe.id);
    }

    for (const inId of Object.keys(recipe.in)) {
      nodes.add(inId);
      if (!edges.has(inId)) {
        edges.set(inId, new Set());
      }
      const edgeSet = edges.get(inId)!;
      for (const outId of Object.keys(recipe.out)) {
        edgeSet.add(outId);
      }
    }
  }

  return { nodes, edges, producedBy, recipeMap };
}

/**
 * Finds strongly connected components (SCCs) in the recipe graph.
 * Uses an iterative version of Tarjan's strongly connected components algorithm.
 * 
 * @param graph - The recipe graph
 * @returns Array of cycle groups
 */
export function findCycleGroups(graph: RecipeGraph): CycleGroup[] {
  const indexMap = new Map<string, number>();
  const lowlinkMap = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let currentIndex = 0;
  
  const sccs: Set<string>[] = [];

  const nodes = Array.from(graph.nodes);
  
  for (const v of nodes) {
    if (!indexMap.has(v)) {
      const callStack: { node: string; neighbors: string[]; nextNeighborIdx: number }[] = [];
      
      indexMap.set(v, currentIndex);
      lowlinkMap.set(v, currentIndex);
      currentIndex++;
      stack.push(v);
      onStack.add(v);
      
      callStack.push({
        node: v,
        neighbors: Array.from(graph.edges.get(v) || []),
        nextNeighborIdx: 0
      });

      while (callStack.length > 0) {
        const frame = callStack[callStack.length - 1];
        const u = frame.node;
        
        if (frame.nextNeighborIdx < frame.neighbors.length) {
          const w = frame.neighbors[frame.nextNeighborIdx++];
          
          if (!indexMap.has(w)) {
            indexMap.set(w, currentIndex);
            lowlinkMap.set(w, currentIndex);
            currentIndex++;
            stack.push(w);
            onStack.add(w);
            
            callStack.push({
              node: w,
              neighbors: Array.from(graph.edges.get(w) || []),
              nextNeighborIdx: 0
            });
          } else if (onStack.has(w)) {
            lowlinkMap.set(u, Math.min(lowlinkMap.get(u)!, indexMap.get(w)!));
          }
        } else {
          callStack.pop();
          
          if (callStack.length > 0) {
            const caller = callStack[callStack.length - 1].node;
            lowlinkMap.set(caller, Math.min(lowlinkMap.get(caller)!, lowlinkMap.get(u)!));
          }
          
          if (lowlinkMap.get(u) === indexMap.get(u)) {
            const scc = new Set<string>();
            let w: string;
            do {
              w = stack.pop()!;
              onStack.delete(w);
              scc.add(w);
            } while (w !== u);
            
            if (scc.size > 1) {
              sccs.push(scc);
            }
          }
        }
      }
    }
  }

  let groupIdCounter = 1;
  const groups: CycleGroup[] = [];
  
  for (const scc of sccs) {
    const recipeIds = new Set<string>();
    
    for (const [recipeId, recipe] of graph.recipeMap.entries()) {
      let hasInputInScc = false;
      let hasOutputInScc = false;
      
      for (const inId of Object.keys(recipe.in)) {
        if (scc.has(inId)) {
          hasInputInScc = true;
          break;
        }
      }
      
      for (const outId of Object.keys(recipe.out)) {
        if (scc.has(outId)) {
          hasOutputInScc = true;
          break;
        }
      }
      
      if (hasInputInScc && hasOutputInScc) {
        recipeIds.add(recipeId);
      }
    }
    
    let type: CycleType = 'chain';
    if (scc.size === 2) {
      type = 'mutual';
    } else if (scc.size === 1) {
      type = 'self';
    }
    
    groups.push({
      id: `cycle-${groupIdCounter++}`,
      itemIds: scc,
      recipeIds,
      type
    });
  }

  return groups;
}

/**
 * Detects cycles in a list of recipes.
 * 
 * @param recipes - List of recipes
 * @returns Cycle detection result
 */
export function detectCycles(recipes: Recipe[]): CycleDetectionResult {
  const graph = buildRecipeGraph(recipes);
  const groups = findCycleGroups(graph);
  
  const itemToCycleGroup = new Map<string, CycleGroup>();
  for (const group of groups) {
    for (const itemId of group.itemIds) {
      itemToCycleGroup.set(itemId, group);
    }
  }
  
  return { groups, itemToCycleGroup, graph };
}

/**
 * Gets the cycle group an item belongs to, if any.
 * 
 * @param itemId - Item ID
 * @param result - Cycle detection result
 * @returns CycleGroup or undefined
 */
export function getCycleGroupForItem(itemId: string, result: CycleDetectionResult): CycleGroup | undefined {
  return result.itemToCycleGroup.get(itemId);
}
