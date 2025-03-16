import { DependencyNode } from "./calculateDependencyTree";

export interface AccumulatedNode {
  itemId: string;
  amount: number;
  recipeId: string;
  isByproduct: boolean;
  isExtension?: boolean;
  name?: string;
  depth?: number;
}

export const calculateAccumulatedFromTree = (
  tree: DependencyNode
): Record<string, AccumulatedNode> => {
  const results: Record<string, AccumulatedNode> = {};
  
  const processNode = (node: DependencyNode, depth: number = 0) => {
    // Skip root node as it's what we're trying to make
    if (!node.isRoot) {
      const uniqueId = node.uniqueId;
      
      results[uniqueId] = {
        itemId: node.id,
        amount: node.amount,
        recipeId: node.selectedRecipeId || "",
        isByproduct: node.isByproduct || false,
        isExtension: node.isExtension || false,
        name: node.name,
        depth: depth
      };
    }
    
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
