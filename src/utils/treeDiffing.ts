import { DependencyNode } from "../types";

// Define NodePath correctly
export interface NodePath {
  nodeId: string;
}

export const findAffectedBranches = (
  tree: DependencyNode,
  nodeId: string
): NodePath[] => {
  const affected: NodePath[] = [];
  const path = findNodePath(tree, nodeId);

  if (path) {
    // Add the node itself and all ancestors
    affected.push(...path);
  }

  return affected;
};

// Finds the path to a node (array of ancestor node IDs)
function findNodePath(node: DependencyNode, targetId: string, currentPath: NodePath[] = []): NodePath[] | null {
  const pathWithCurrent = [...currentPath, { nodeId: node.uniqueId }];

  if (node.uniqueId === targetId) {
    return pathWithCurrent;
  }

  if (node.children) {
    for (const child of node.children) {
      const result = findNodePath(child, targetId, pathWithCurrent);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

// Comment out broken function for now
/*
function getNodeByPath(node: DependencyNode, path: NodePath[]): DependencyNode | null {
 // ... function body needs review ...
    let currentNode = node; // Initialize currentNode
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      // Logic needs review - NodePath only has nodeId now
      // Need to find child based on nodeId, not index
      const childNode = currentNode?.children?.find(c => c.uniqueId === segment.nodeId);
      if (!childNode) {
        return null;
      }
      currentNode = childNode;
    }
    return currentNode;
}
*/

export const diffTrees = (
  oldTree: DependencyNode,
  newTree: DependencyNode
): NodePath[] => {
  // Basic implementation: find nodes with changed amounts or recipes
  const changedPaths: NodePath[] = [];
  
  function compareNodes(oldNode: DependencyNode | undefined, newNode: DependencyNode | undefined, path: NodePath[]) {
    if (!newNode) return; // Node removed, handled elsewhere?
    const currentPath = [...path, { nodeId: newNode.uniqueId }];

    if (!oldNode || 
        oldNode.amount !== newNode.amount || 
        oldNode.recipe?.id !== newNode.recipe?.id ||
        oldNode.excess !== newNode.excess) {
      changedPaths.push(...currentPath); // Add path if node changed
    }

    const oldChildrenMap = new Map(oldNode?.children?.map(c => [c.uniqueId, c]) || []);
    newNode.children?.forEach(newChild => {
      compareNodes(oldChildrenMap.get(newChild.uniqueId), newChild, currentPath);
    });
  }

  compareNodes(oldTree, newTree, []);
  // Deduplicate paths (keep only the shallowest occurrence)
  const uniquePaths = Array.from(new Map(changedPaths.map(p => [p.nodeId, p])).values());
  return uniquePaths;
};
