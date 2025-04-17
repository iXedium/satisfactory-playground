import { DependencyNode } from "../types";

export interface AccumulatedNode {
  itemId: string;
  amount: number;
  name?: string;
  isByproduct?: boolean;
  isExtension?: boolean;
  recipeId?: string;
  depth?: number;
  isImport?: boolean;
}

export const calculateAccumulatedFromTree = (
  tree: DependencyNode | null,
  nodeExtensionOverrides?: Record<string, boolean>,
  visibleNodesOnly: boolean = false
): Record<string, AccumulatedNode> => {
  const accumulated: Record<string, AccumulatedNode> = {};

  if (!tree) {
    return accumulated;
  }

  const traverse = (node: DependencyNode, depth: number = 0) => {
    if (!node) return;

    const isVisible = !visibleNodesOnly || node.childrenVisible !== false;
    if (!isVisible) return;

    const key = node.id;
    if (!accumulated[key]) {
      accumulated[key] = {
        itemId: key,
        amount: 0,
        isByproduct: node.isByproduct || false,
        isExtension: false,
        recipeId: node.recipe?.id,
        depth: depth,
        isImport: node.isImport || false
      };
    }
    accumulated[key].amount += node.amount;
    accumulated[key].depth = Math.min(accumulated[key].depth ?? Infinity, depth);

    if (!node.isByproduct && node.children && node.children.length > 0) {
      node.children.forEach((child: DependencyNode) => traverse(child, depth + 1));
    }
  };

  traverse(tree);
  return accumulated;
};
