/* eslint-disable @typescript-eslint/no-unused-vars */
import { DependencyNode } from "../types";
import { findNodeById } from "./index"; // Ensure findNodeById is correctly exported from utils index
import { getItemById } from "../data"; // Import DB query for names
import { getImportReference } from "./nodeReferenceUtils"; // Import utility

export interface ConsumerInfo {
  consumerNodeId: string; // uniqueId of the node consuming the item
  consumerParentId: string; // id of the item the consumer node is producing
  consumerParentName: string; // name of the item the consumer node is producing
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

  if (!sourceRootNode) {
    console.warn(`[findNodeConsumers] Source root node ${sourceNodeId} not found.`);
    return consumers;
  }

  const consumerParentNames: Record<string, string> = {};

  const findImporters = (node: DependencyNode, parentNode: DependencyNode | null, treeId: string) => {
    const importRef = getImportReference(node);
    if (importRef && importRef.targetTreeId === sourceNodeId) {
        consumers.push({
            consumerNodeId: node.uniqueId,
            consumerParentId: parentNode?.id ?? 'Root',
            consumerParentName: parentNode?.id ?? 'Root', // Placeholder
            consumingTreeId: treeId,
            consumedAmount: node.amount || 0,
        });
        if (parentNode && !consumerParentNames[parentNode.id]) {
            consumerParentNames[parentNode.id] = ''; // Mark for fetching
        }
        return; // Stop traversing this branch
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        findImporters(child, node, treeId);
      });
    }
  };

  Object.entries(allTrees).forEach(([treeId, tree]) => {
    findImporters(tree, null, treeId);
  });

  const parentIdsToFetch = Object.keys(consumerParentNames);
  await Promise.all(parentIdsToFetch.map(async (parentId) => {
      if (parentId !== 'Root') {
         consumerParentNames[parentId] = await getItemName(parentId);
      }
  }));

  consumers.forEach(consumer => {
      if (consumer.consumerParentId !== 'Root') {
          consumer.consumerParentName = consumerParentNames[consumer.consumerParentId] || consumer.consumerParentId;
      }
  });

  return consumers;
};

// Remove old placeholder getItemNameFromId
// function getItemNameFromId(itemId: string): string { ... } 