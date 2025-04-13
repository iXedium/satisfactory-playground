import { DependencyNode } from "../types";

// Helper to find a node by its uniqueId in a dependency tree
export const findNodeById = (tree: DependencyNode | null, nodeId: string): DependencyNode | null => {
  if (!tree) return null;
  if (tree.uniqueId === nodeId) {
    return tree;
  }
  
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeById(child, nodeId);
      if (found) {
        return found;
      }
    }
  }
  
  // Also check originalChildren for import nodes (important for finding nodes within imported structures)
  if (tree.originalChildren) {
    for (const child of tree.originalChildren) {
      const found = findNodeById(child, nodeId);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

// Helper to find a node with the given ID in any tree (used by calculateDependencyTree)
// Note: Renamed from findNodeWithReference for clarity, as it finds by ID.
export async function findNodeByIdInAllTrees(
  nodeId: string,
  dependencyTrees: Record<string, DependencyNode>
): Promise<DependencyNode | null> {
  for (const treeId in dependencyTrees) {
    // Use the updated findNodeById which checks originalChildren
    const node = findNodeById(dependencyTrees[treeId], nodeId); 
    if (node) {
      return node;
    }
  }
  return null;
}

// Count nodes in a tree
export const countNodes = (node: DependencyNode): number => {
  let count = 1;
  node.children?.forEach(child => count += countNodes(child));
  // Should we count originalChildren?
  return count;
};

// Get the maximum depth of a tree
export const getTreeDepth = (node: DependencyNode): number => {
  if (!node.children || node.children.length === 0) return 0;
  // Should we consider depth of originalChildren?
  return 1 + Math.max(...node.children.map(getTreeDepth));
};

// Find the parent node that contains the child with the given target ID
export const findParentNode = (tree: DependencyNode | null, targetId: string): DependencyNode | null => {
  if (!tree) return null;
  if (tree.children) {
    for (const child of tree.children) {
      if (child.uniqueId === targetId) {
        return tree; // Current node is the parent
      }
      const found = findParentNode(child, targetId);
      if (found) return found;
    }
  }
  // Check original children as well?
  if (tree.originalChildren) {
    for (const child of tree.originalChildren) {
       if (child.uniqueId === targetId) {
         return tree; // Current node is the parent
       }
       // Don't recurse into originalChildren's children for parent finding
    }
  }
  return null;
}; 