import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { DependencyNode } from '../utils/calculateDependencyTree';

/**
 * Custom hook to get the correct amount for a node, especially for imported nodes
 * which should display the amount from their target tree plus excess
 */
export const useImportedNodeAmount = (node: DependencyNode): number => {
  const dependencies = useSelector((state: RootState) => state.dependencies);

  if (!node.isImport || !node.importedFrom) {
    // For regular nodes, return the normal amount
    return node.amount;
  }

  // For imported nodes, get the amount from the target tree
  const targetTree = dependencies.dependencyTrees[node.importedFrom];
  if (targetTree) {
    // Use the total production (amount + excess) from the target tree
    const targetAmount = targetTree.amount || 0;
    const targetExcess = targetTree.excess || 0;
    const totalAmount = targetAmount + targetExcess;
    
    // Return the total amount from the target tree
    return totalAmount;
  }

  // Fallback to the node's own amount if target tree not found
  return node.amount;
};

export default useImportedNodeAmount; 