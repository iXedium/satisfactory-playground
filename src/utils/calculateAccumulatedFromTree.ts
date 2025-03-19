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
    // Process all nodes including root nodes
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
