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
  isCyclicReference?: boolean;
  /** If this node was cycle-resolved, contains the resolution metadata */
  cycleResolution?: {
    grossRequirement: number;
    netRequirement: number;
    recirculated: number;
  };
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
        isImport: node.isImport || false,
        isCyclicReference: node.isCyclicReference || false,
      };
    }

    // For cycle-resolved nodes, use netRequirement (what the user actually needs to supply)
    if (node.cycleResolution) {
      accumulated[key].amount += node.cycleResolution.netRequirement;
      accumulated[key].cycleResolution = {
        grossRequirement: node.cycleResolution.grossRequirement,
        netRequirement: node.cycleResolution.netRequirement,
        recirculated: node.cycleResolution.recirculated,
      };
    } else if (!node.isCyclicReference) {
      accumulated[key].amount += node.amount;
    }

    accumulated[key].depth = Math.min(accumulated[key].depth ?? Infinity, depth);

    if (!node.isByproduct && node.children && node.children.length > 0) {
      node.children.forEach((child: DependencyNode) => traverse(child, depth + 1));
    }
  };

  traverse(tree);
  return accumulated;
};

