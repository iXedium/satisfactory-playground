import React from 'react';
import { DependencyNode } from '../../utils/calculateDependencyTree';
import { AccumulatedNode } from '../../utils/calculateAccumulatedFromTree';
import { calculateDependencyTree } from '../../utils/calculateDependencyTree';
import { calculateAccumulatedFromTree } from '../../utils/calculateAccumulatedFromTree';
import { findAffectedBranches } from '../../utils/treeDiffing';

interface TreeNodeManagerProps {
  recipeSelections: Record<string, string>;
  excessMap: Record<string, number>;
  setExcessMap: (excessMap: Record<string, number>) => void;
  findNodeById: (tree: DependencyNode, nodeId: string) => DependencyNode | null;
  setDependencies: (payload: any) => void;
}

const TreeNodeManager: React.FC<TreeNodeManagerProps> = ({
  recipeSelections,
  excessMap,
  setExcessMap,
  findNodeById,
  setDependencies,
}) => {
  // Handle tree recipe changes
  const handleTreeRecipeChange = async (
    dependencyTrees: Record<string, DependencyNode>,
    nodeId: string, 
    recipeId: string
  ) => {
    // Find which tree this node belongs to
    const treeId = Object.keys(dependencyTrees).find(id => 
      findNodeById(dependencyTrees[id], nodeId)
    );

    if (!treeId) return;

    const affectedBranches = findAffectedBranches(dependencyTrees[treeId], nodeId);
    
    const updatedRecipeSelections = {
      ...recipeSelections,
      [nodeId]: recipeId
    };
    
    // Build a map of imported nodes to maintain relationships
    const importMap: Record<string, { targetTreeId: string, amount: number }> = {};
    
    // Track import nodes recursively
    const buildImportMap = (node: DependencyNode) => {
      if (node.isImport && node.importedFrom) {
        importMap[node.uniqueId] = {
          targetTreeId: node.importedFrom,
          amount: node.amount
        };
      }
      
      if (node.children) {
        node.children.forEach((child: DependencyNode) => {
          buildImportMap(child);
        });
      }
    };
    
    // Scan the entire tree for imported nodes
    buildImportMap(dependencyTrees[treeId]);

    const tree = await calculateDependencyTree(
      dependencyTrees[treeId].id,
      dependencyTrees[treeId].amount,
      recipeId,
      updatedRecipeSelections,
      0,
      affectedBranches,
      '',
      excessMap,
      importMap
    );
    
    if (tree) {
      const accumulated = calculateAccumulatedFromTree(tree);
      setDependencies({ treeId, tree, accumulated });
    }
  };

  // Handle excess changes
  const handleExcessChange = async (
    dependencyTrees: Record<string, DependencyNode>,
    nodeId: string, 
    excess: number
  ) => {
    const newExcessMap = { ...excessMap, [nodeId]: excess };
    setExcessMap(newExcessMap);

    // Find which tree this node belongs to
    const treeId = Object.keys(dependencyTrees).find(id => 
      findNodeById(dependencyTrees[id], nodeId)
    );

    if (!treeId) return;

    const affectedBranches = findAffectedBranches(dependencyTrees[treeId], nodeId);
    
    // Build a map of imported nodes to maintain relationships
    const importMap: Record<string, { targetTreeId: string, amount: number }> = {};
    
    // Track import nodes recursively
    const buildImportMap = (node: DependencyNode) => {
      if (node.isImport && node.importedFrom) {
        importMap[node.uniqueId] = {
          targetTreeId: node.importedFrom,
          amount: node.amount
        };
      }
      
      if (node.children) {
        node.children.forEach((child: DependencyNode) => {
          buildImportMap(child);
        });
      }
    };
    
    // Scan the entire tree for imported nodes
    buildImportMap(dependencyTrees[treeId]);

    // Recalculate the tree with import relationships maintained
    const tree = await calculateDependencyTree(
      dependencyTrees[treeId].id,
      dependencyTrees[treeId].amount,
      dependencyTrees[treeId].selectedRecipeId || "",
      recipeSelections,
      0,
      affectedBranches,
      '',
      newExcessMap,
      importMap
    );
    
    if (tree) {
      const accumulated = calculateAccumulatedFromTree(tree);
      setDependencies({ treeId, tree, accumulated });
    }
  };

  return null; // This is a logic component that doesn't render UI
};

export default TreeNodeManager; 