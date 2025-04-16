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
 * @param sourceNodeId The uniqueId of the node whose output consumption we want to find.
 * @param sourceTreeId The treeId containing the sourceNode.
 * @param allTrees The complete record of all dependency trees.
 * @returns An array of ConsumerInfo objects.
 */
// Make the function async to await names
export const findNodeConsumers = async (
  sourceNodeId: string,
  sourceTreeId: string,
  allTrees: Record<string, DependencyNode>
): Promise<ConsumerInfo[]> => {
  const consumers: ConsumerInfo[] = [];
  const sourceTree = allTrees[sourceTreeId];
  // EARLY EXIT 1: Is sourceTree found?
  if (!sourceTree) {
    // console.log(`[DEBUG CONSUMPTION EXIT] Source tree ${sourceTreeId} not found.`);
    return consumers;
  }

  // Use findNodeById which should handle nested structures
  const sourceNode = findNodeById(sourceTree, sourceNodeId);

  // EARLY EXIT 2: Is sourceNode found AND not a byproduct?
  if (!sourceNode || sourceNode.isByproduct) {
    // console.log(`[DEBUG CONSUMPTION EXIT] Source node ${sourceNodeId} not found or is byproduct. Found: ${!!sourceNode}, IsByproduct: ${sourceNode?.isByproduct}`);
    return consumers;
  }

  const producedItemId = sourceNode.id;
//   console.log(`[DEBUG CONSUMPTION START] Found source node ${sourceNodeId} (Item: ${producedItemId}). Starting search...`); // Log before traversal starts

  // Keep track of consumer parent names to fetch them efficiently
  const consumerParentNames: Record<string, string> = {};

  // Recursive function to traverse a tree and find consumers
  const traverseTree = (node: DependencyNode, treeId: string) => {
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        // -- DEBUG LOG --
        // console.log(`[DEBUG CONSUMPTION] Checking Child: ${child.id} (Byproduct: ${!!child.isByproduct}) against ProducedItem: ${producedItemId} by Parent: ${node.id}`);
        // -- END DEBUG LOG --
        
        // Check if the child requires the item produced by sourceNode AND is not a byproduct itself
        if (child.id === producedItemId && !child.isByproduct) {
          // The PARENT node (`node`) is the one consuming the item to produce itself
          consumers.push({
            consumerNodeId: child.uniqueId, // The node representing the requirement
            consumerParentId: node.id,      // The item being produced by the consumer
            consumerParentName: node.id,    // Placeholder, will be replaced later
            consumingTreeId: treeId,        // Tree where consumption occurs
            consumedAmount: child.amount,   // The amount required by the child
          });
          // Store parent ID for name fetching
          if (!consumerParentNames[node.id]) {
              consumerParentNames[node.id] = ''; // Mark for fetching
          }
        }
        // Continue traversal down this branch
        // Avoid infinite loops with imports, but check children of imports in their own trees later
        if (!child.isImport && !child.importReference) { 
            traverseTree(child, treeId);
        }
      });
    }
  };

  // Iterate through all trees
  Object.entries(allTrees).forEach(([treeId, tree]) => {
    traverseTree(tree, treeId);
  });

  // Fetch names for all unique consumer parents
  const parentIdsToFetch = Object.keys(consumerParentNames);
  await Promise.all(parentIdsToFetch.map(async (parentId) => {
      consumerParentNames[parentId] = await getItemName(parentId);
  }));

  // Replace placeholder names in the results
  consumers.forEach(consumer => {
      consumer.consumerParentName = consumerParentNames[consumer.consumerParentId] || consumer.consumerParentId;
  });

  // Remove the potentially incorrect filter - the traversal logic should prevent self-consumption
  // const filteredConsumers = consumers.filter(c => c.consumerParentId !== sourceNode.id);
  // return filteredConsumers;

  // Return the unfiltered list
  return consumers;
};

// Remove old placeholder getItemNameFromId
// function getItemNameFromId(itemId: string): string { ... } 