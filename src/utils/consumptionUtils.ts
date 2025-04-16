/* eslint-disable @typescript-eslint/no-unused-vars */
import { DependencyNode } from "../types";
import { findNodeById } from "./index";
import { getItemById } from "../data"; // Import DB query for names
// Import helper to get import reference safely
import { getImportReference } from "./nodeReferenceUtils";

export interface ConsumerInfo {
  consumerNodeId: string; // uniqueId of the import node representing the consumption
  consumerParentId: string; // id of the item the actual consumer node is producing
  consumerParentName: string; // name of the item the actual consumer node is producing
  consumingTreeId: string; // treeId where the consumption happens
  consumedAmount: number; // Amount consumed (always positive in this version)
  isSupplier?: boolean;    // Kept for interface consistency, but will be false
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
 * Finds all nodes across all trees that consume the output of a given source node
 * by identifying nodes that import directly from it.
 * @param sourceNodeId The uniqueId of the node whose output consumption we want to find.
 * @param sourceTreeId The treeId containing the sourceNode (used for initial lookup).
 * @param allTrees The complete record of all dependency trees.
 * @returns An array of ConsumerInfo objects.
 */
export const findNodeConsumers = async (
  sourceNodeId: string,
  sourceTreeId: string,
  allTrees: Record<string, DependencyNode>
): Promise<ConsumerInfo[]> => {
  console.log(`[CONSUMPTION v3] Starting findNodeConsumers for sourceNodeId: ${sourceNodeId}`);
  const consumers: ConsumerInfo[] = [];
  const sourceTree = allTrees[sourceTreeId]; // Still needed to potentially find source node info

  if (!sourceTree) {
      console.warn(`[CONSUMPTION v3] Source tree ${sourceTreeId} not found.`);
      return consumers;
  }
  const sourceNode = findNodeById(sourceTree, sourceNodeId); // Find source node
  if (!sourceNode) {
      console.warn(`[CONSUMPTION v3] Source node ${sourceNodeId} not found in tree ${sourceTreeId}.`);
      return consumers;
  }
  console.log(`[CONSUMPTION v3] Source node found: ${sourceNode.uniqueId} (Item: ${sourceNode.id})`);

  const nodeNamesToFetch: Record<string, string> = {};

  // Iterate through ALL trees to find potential consumers
  Object.entries(allTrees).forEach(([consumingTreeId, tree]) => {
    // Recursive function to traverse THIS tree
    const traverseTree = (parentNode: DependencyNode) => {
      if (parentNode.children && parentNode.children.length > 0) {
        parentNode.children.forEach(childNode => {
          const importRef = getImportReference(childNode);

          // --- Check: Does this child import FROM our sourceNodeId? ---
          if (importRef && importRef.targetNodeId === sourceNodeId) {
            console.log(`[CONSUMPTION v3 FOUND] Consumer Link: Node ${parentNode.uniqueId} (in tree ${consumingTreeId}) imports from ${sourceNodeId} via child ${childNode.uniqueId}. Amount: ${childNode.amount}`);
            consumers.push({
              consumerNodeId: childNode.uniqueId,      // The import node itself represents the link
              consumerParentId: parentNode.id,        // The item being produced by the actual consumer
              consumerParentName: parentNode.id,      // Placeholder name for consumer parent
              consumingTreeId: consumingTreeId,       // Tree where consumption occurs
              consumedAmount: childNode.amount,     // Positive amount consumed
              isSupplier: false                     // Explicitly false
            });
            // Mark consumer parent for name fetching
            if (!nodeNamesToFetch[parentNode.id]) {
              nodeNamesToFetch[parentNode.id] = '';
            }
          }

          // Continue traversal down this branch ONLY IF IT IS NOT an import node itself
          // because an import node's children are irrelevant to the current tree's consumption.
          if (!importRef) {
            traverseTree(childNode);
          }
        });
      }
    };
    // Start traversal for the current tree
    traverseTree(tree);
  });

  // Fetch names for all unique consumer parents
  const parentIdsToFetch = Object.keys(nodeNamesToFetch);
  await Promise.all(parentIdsToFetch.map(async (parentId) => {
      nodeNamesToFetch[parentId] = await getItemName(parentId);
  }));

  // Replace placeholder names in the results
  consumers.forEach(consumer => {
      consumer.consumerParentName = nodeNamesToFetch[consumer.consumerParentId] || consumer.consumerParentId;
  });

  console.log(`[CONSUMPTION v3] Final consumers found for ${sourceNodeId}:`, JSON.stringify(consumers));
  return consumers;
};

// Remove old placeholder getItemNameFromId
// function getItemNameFromId(itemId: string): string { ... } 