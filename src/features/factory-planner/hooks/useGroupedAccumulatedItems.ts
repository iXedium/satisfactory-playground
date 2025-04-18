import { useState, useEffect } from 'react';
import { RootState } from '../../../store'; // Adjust path as needed
import { DependencyNode, Recipe, Item } from '../../../types'; // Adjust path as needed
import { AccumulatedNode } from '../../../utils'; // Adjust path as needed
import { getRecipesForItem, getItemById, getRecipeByOutput } from '../../../data'; // Add getRecipeByOutput

// Output structure from the original component
export interface GroupedItem {
  itemId: string;
  amount: number;
  recipes: Recipe[];
  recipeId: string; // This was derived from node, need to confirm source
  isByproduct: boolean;
  nodeIds: string[]; // IDs of nodes contributing to this group
  name?: string;
  depth: number;
  normalizedMachineCount: number;
  isImport: boolean;
  isRaw?: boolean; // Add isRaw flag
}

interface UseGroupedAccumulatedItemsProps {
  accumulatedDependencies: Record<string, AccumulatedNode>;
  // State from Redux needed for recipe lookups etc.
  dependenciesState: RootState['dependencies']; 
  recipeSelections: RootState['recipeSelections']['selections'];
  // Props affecting grouping/calculation
  showExtensions: boolean;
  accumulateExtensions: boolean;
  machineCountMap: Record<string, number>;
  machineMultiplierMap: Record<string, number>;
}

interface UseGroupedAccumulatedItemsReturn {
  groupedItems: GroupedItem[];
  itemsMap: Record<string, Item>;
  recipesMap: Record<string, Recipe[]>;
  isLoading: boolean;
}

// Find a node in any tree by its unique ID - Needed locally for recipeId lookup
const findNodeByIdInTrees = (trees: Record<string, DependencyNode>, id: string): DependencyNode | null => {
  if (!trees) return null;
  for (const treeId in trees) {
    const tree = trees[treeId];
    const findInTree = (node: DependencyNode): DependencyNode | null => {
      if (node.uniqueId === id) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findInTree(child);
          if (found) return found;
        }
      }
      return null;
    };
    const found = findInTree(tree);
    if (found) return found;
  }
  return null;
};

export const useGroupedAccumulatedItems = ({
  accumulatedDependencies,
  dependenciesState, // Use the passed Redux state
  recipeSelections, // Use the passed Redux state
  showExtensions,
  accumulateExtensions,
  machineCountMap,
  machineMultiplierMap,
}: UseGroupedAccumulatedItemsProps): UseGroupedAccumulatedItemsReturn => {
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, Item>>({});
  const [recipesMap, setRecipesMap] = useState<Record<string, Recipe[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processTree = async () => {
      // Reset loading state at the beginning
      setIsLoading(true); 
      if (!accumulatedDependencies) {
          setGroupedItems([]);
          setItemsMap({});
          setRecipesMap({});
          setIsLoading(false);
          return;
      }
      
      const grouped: Record<string, GroupedItem> = {};
      const itemIds = new Set<string>();
      
      // Pass 1: Aggregate amounts and machine counts
      Object.entries(accumulatedDependencies).forEach(([nodeId, node]) => {
        if ((node.isExtension && (!showExtensions || !accumulateExtensions)) || node.isImport) {
          return;
        }
        
        const itemId = node.itemId;
        itemIds.add(itemId);
        
        // Find the original node to get the correct recipeId
        const originalNode = findNodeByIdInTrees(dependenciesState.dependencyTrees, nodeId);
        // Determine recipeId: use selection, then node's recipe, then empty
        const currentRecipeId = recipeSelections[nodeId] || originalNode?.recipe?.id || '';

        // Use itemId and recipeId for grouping key
        const groupKey = `${itemId}-${currentRecipeId}`;
        
        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            itemId,
            amount: 0,
            recipes: [], // Will be fetched later
            recipeId: currentRecipeId,
            isByproduct: node.isByproduct || false,
            nodeIds: [],
            name: node.name, // Use name from accumulated node initially
            depth: node.depth ?? Infinity, // Initialize depth to Infinity
            normalizedMachineCount: 0,
            isImport: node.isImport || false,
          };
        }
        
        grouped[groupKey].amount += node.amount;
        grouped[groupKey].nodeIds.push(nodeId);
        
        grouped[groupKey].depth = Math.min(grouped[groupKey].depth, node.depth ?? Infinity);
        
        const machineCount = machineCountMap[nodeId] || 0;
        const multiplier = machineMultiplierMap[nodeId] || 1;
        grouped[groupKey].normalizedMachineCount += machineCount * multiplier;
      });
      
      // Pass 2: Fetch data for unique itemIds
      const uniqueItemIds = Array.from(itemIds);
      const recipePromises = uniqueItemIds.map(id => getRecipesForItem(id));
      const itemPromises = uniqueItemIds.map(id => getItemById(id).then(item => item || null));
      const defaultRecipePromises = uniqueItemIds.map(id => getRecipeByOutput(id)); // Fetch default recipes
      
      try {
        const recipesResults = await Promise.all(recipePromises);
        const itemsResults = await Promise.all(itemPromises);
        const defaultRecipesResults = await Promise.all(defaultRecipePromises); // Get default recipes
        
        const newItemsMap: Record<string, Item> = {};
        const newRecipesMap: Record<string, Recipe[]> = {};
        const defaultRecipesMap: Record<string, Recipe | null> = {}; // Map for default recipes
        
        itemsResults.forEach((item, index) => {
          if (item) {
            newItemsMap[item.id] = item;
            newRecipesMap[item.id] = recipesResults[index] || [];
            defaultRecipesMap[item.id] = defaultRecipesResults[index] || null; // Store default recipe
          }
        });

        // Pass 3: Update grouped items with fetched data and isRaw flag
        const finalGroupedArray = Object.values(grouped).map(group => {
           const defaultRecipe = defaultRecipesMap[group.itemId];
           const isRaw = !defaultRecipe || !defaultRecipe.in || Object.keys(defaultRecipe.in).length === 0;
           return {
             ...group,
             name: newItemsMap[group.itemId]?.name || group.name || group.itemId, // Use fetched name
             recipes: newRecipesMap[group.itemId] || [], // Assign fetched recipes
             depth: group.depth === Infinity ? 0 : group.depth, 
             isRaw: isRaw // Set the isRaw flag
           }
        });
        
        setItemsMap(newItemsMap);
        setRecipesMap(newRecipesMap);
        setGroupedItems(finalGroupedArray);

      } catch (error) {
          console.error("Error fetching item/recipe data for accumulated view:", error);
          // Set empty state on error?
          setGroupedItems([]);
          setItemsMap({});
          setRecipesMap({});
      } finally {
         setIsLoading(false);
      }
    };
    
    processTree();
  }, [
    accumulatedDependencies, 
    dependenciesState.dependencyTrees, // Depend on trees for node lookup
    recipeSelections, // Depend on selections
    showExtensions, 
    accumulateExtensions, 
    machineCountMap, 
    machineMultiplierMap
  ]);

  return { groupedItems, itemsMap, recipesMap, isLoading };
}; 