/* eslint-disable @typescript-eslint/no-unused-vars */
import { DependencyNode } from "../types";
import { findNodeById } from "./index";
import { getItemById } from "../data"; // Import DB query for names

export interface ConsumerInfo {
  consumerNodeId: string; // uniqueId of the node consuming the item (e.g., the Iron Rod node needing Iron Ingots)
  consumerParentId: string; // id of the item the consumer node is producing (e.g., Screw node)
  consumerParentName: string; // name of the item the consumer node is producing (e.g., "Screw")
  consumingTreeId: string; // treeId where the consumption happens
  consumedAmount: number; // Amount the consumer node requires
}

// Helper to get item name asynchronously
async function getItemName(itemId: string): Promise<string> {
    try {
        const item = await getItemById(itemId);
        return item?.name ?? itemId.replace(/item:/g, '').replace(/_/g, ' '); // Fallback name
    } catch (error) {
        // console.error(`Error fetching name for item ${itemId}:`, error);
        return itemId.replace(/item:/g, '').replace(/_/g, ' '); // Fallback name on error
    }
}

/**
 * Finds all nodes across all trees that consume the output of a given source node.
 * This version iterates through all nodes and checks their importReference.
 * @param sourceNodeId The uniqueId of the SOURCE ROOT node whose output consumption we want to find.
 * @param allTrees The complete record of all dependency trees.
 * @returns An array of ConsumerInfo objects.
 */
export const findNodeConsumers = async (
  sourceNodeId: string, // This should be the uniqueId of the ROOT node
  allTrees: Record<string, DependencyNode>
): Promise<ConsumerInfo[]> => {
  const consumers: ConsumerInfo[] = [];
  const sourceRootNode = allTrees[sourceNodeId];

  // EARLY EXIT 1: Source root not found?
  if (!sourceRootNode) {
    console.warn(`[findNodeConsumers] Source root node ${sourceNodeId} not found.`);
    return consumers;
  }
  // No need for the isByproduct check here anymore


  // Keep track of consumer parent names to fetch them efficiently
  const consumerParentNames: Record<string, string> = {};

  // Recursive function to traverse a tree and find CONSUMING nodes via importReference
  const findImporters = (node: DependencyNode, parentNode: DependencyNode | null, treeId: string) => {
    // Check if THIS node imports from the sourceNodeId
    if (node.importReference && node.importReference.targetTreeId === sourceNodeId) {
        // We found a consumer!
        // The consumer is the node *containing* this import node (the parent)
        // Or, if the import node itself is the root, it has no consuming parent in this context?
        // Let's record the import node itself and its tree for now.
        // The *amount* is the amount on the IMPORT node itself.
        consumers.push({
            consumerNodeId: node.uniqueId,      // The uniqueId of the node with the importReference
            consumerParentId: parentNode?.id ?? 'Root', // The item ID of the parent node (or 'Root')
            consumerParentName: parentNode?.id ?? 'Root', // Placeholder
            consumingTreeId: treeId,           // Tree where consumption occurs
            consumedAmount: node.amount || 0,  // The amount on the import node
        });
        // Store parent ID for name fetching (if parent exists)
        if (parentNode && !consumerParentNames[parentNode.id]) {
            consumerParentNames[parentNode.id] = ''; // Mark for fetching
        }
        // Stop traversing further down this import branch (already processed)
        return; 
    }

    // If not an import node itself, continue traversing its children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        findImporters(child, node, treeId); // Pass current node as parent
      });
    }
  };

  // Iterate through all trees
  Object.entries(allTrees).forEach(([treeId, tree]) => {
    findImporters(tree, null, treeId); // Start traversal from the root of each tree
  });

  // Fetch names for all unique consumer parents
  const parentIdsToFetch = Object.keys(consumerParentNames);
  await Promise.all(parentIdsToFetch.map(async (parentId) => {
      if (parentId !== 'Root') { // Don't fetch name for 'Root'
         consumerParentNames[parentId] = await getItemName(parentId);
      }
  }));

  // Replace placeholder names in the results
  consumers.forEach(consumer => {
      if (consumer.consumerParentId !== 'Root') {
          consumer.consumerParentName = consumerParentNames[consumer.consumerParentId] || consumer.consumerParentId;
      }
  });

  return consumers;
};

// Remove old placeholder getItemNameFromId
// function getItemNameFromId(itemId: string): string { ... } 