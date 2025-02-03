import { DependencyNode } from "./calculateDependencyTree";

export const calculateAccumulatedFromTree = (
  tree: DependencyNode,
  results: Record<string, number> = {}
): Record<string, number> => {
  // Skip root node as it's what we're trying to make
  if (!tree.isRoot) {
    results[tree.id] = (results[tree.id] || 0) + tree.amount;
  }

  // Recursively process all children
  if (tree.children) {
    tree.children.forEach(child => {
      calculateAccumulatedFromTree(child, results);
    });
  }

  return results;
};
