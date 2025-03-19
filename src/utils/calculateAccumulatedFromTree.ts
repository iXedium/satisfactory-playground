import { DependencyNode } from "./calculateDependencyTree";

export interface AccumulatedNode {
  itemId: string;
  amount: number;
  recipeId: string;
  isByproduct: boolean;
  isImport?: boolean;
  isExtension?: boolean;
  name?: string;
  depth?: number;
}

export const calculateAccumulatedFromTree = (
  tree: DependencyNode
): Record<string, AccumulatedNode> => {
  const results: Record<string, AccumulatedNode> = {};
  
  const processNode = (node: DependencyNode, depth: number = 0) => {
    // Skip import nodes - they're already accounted for in their target trees
    if (node.isImport) {
      return;
    }
    
    // Process all non-import nodes including root nodes
    const uniqueId = node.uniqueId;
    
    results[uniqueId] = {
      itemId: node.id,
      amount: node.amount,
      recipeId: node.selectedRecipeId || "",
      isByproduct: node.isByproduct || false,
      isImport: node.isImport || false,
      isExtension: false,
      name: undefined,
      depth: depth
    };
    
    // Recursively process all children
    if (node.children) {
      node.children.forEach(child => {
        processNode(child, depth + 1);
      });
    }
  };
  
  processNode(tree);
  return results;
};
