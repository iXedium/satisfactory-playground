/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import ListNode from "./ListNode";
import { Recipe, Item } from "../data/dexieDB";
import { getRecipesForItem, getItemById } from "../data/dbQueries";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { AccumulatedNode } from "../utils/calculateAccumulatedFromTree";

interface AccumulatedViewProps {
  onRecipeChange: (nodeId: string, recipeId: string) => void;
  onExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  onMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  onMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  showExtensions?: boolean;
  accumulateExtensions?: boolean;
}

interface GroupedItem {
  itemId: string;
  amount: number;
  recipes: Recipe[];
  selectedRecipeId: string;
  isByproduct: boolean;
  nodeIds: string[]; // All node IDs that contribute to this item
  name?: string; // Item name
  depth: number; // Track the depth of the item in the tree
  normalizedMachineCount: number; // Machine count normalized to multiplier = 1
}

interface NodeMachineInfo {
  nodeId: string;
  machineCount: number;
  multiplier: number;
}

const AccumulatedView: React.FC<AccumulatedViewProps> = ({
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap,
  onMachineCountChange,
  machineMultiplierMap,
  onMachineMultiplierChange,
  showExtensions = true,
  accumulateExtensions = false,
}) => {
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, Item>>({});
  const [recipesMap, setRecipesMap] = useState<Record<string, Recipe[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "amount" | "depth">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showByproducts, setShowByproducts] = useState(true);
  const [showRawMaterials, setShowRawMaterials] = useState(true);
  const [showIntermediates, setShowIntermediates] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Group items by ID and recipe
  useEffect(() => {
    const fetchRecipes = async () => {
      const items: Record<string, GroupedItem> = {};
      const recipePromises: Promise<Recipe[]>[] = [];
      const itemIds: string[] = [];
      const namePromises: Promise<Item | null>[] = [];
      const machineCounts: Record<string, NodeMachineInfo[]> = {};
      
      // First, group items by ID and recipe
      if (dependencies.dependencyTree) {
        const processNode = (node: DependencyNode, depth: number = 0) => {
          // Skip the root node
          if (!node.isRoot) {
            const key = `${node.id}-${node.selectedRecipeId || "default"}`;
            
            if (!items[key]) {
              items[key] = {
                itemId: node.id,
                amount: 0,
                recipes: [],
                selectedRecipeId: node.selectedRecipeId || "",
                isByproduct: node.isByproduct || false,
                nodeIds: [],
                depth: depth,
                normalizedMachineCount: 0
              };
              
              // Add to list of items to fetch recipes for
              if (!itemIds.includes(node.id)) {
                itemIds.push(node.id);
                recipePromises.push(getRecipesForItem(node.id));
                namePromises.push(getItemById(node.id).then(item => item || null));
              }
              
              // Initialize machine count tracking
              machineCounts[key] = [];
            } else {
              // Keep the lowest depth
              items[key].depth = Math.min(items[key].depth, depth);
            }
            
            // Add amount and node ID
            items[key].amount += node.amount;
            // Only add unique nodeIds
            if (!items[key].nodeIds.includes(node.uniqueId)) {
              items[key].nodeIds.push(node.uniqueId);
              
              // Track machine counts and multipliers for this node
              machineCounts[key].push({
                nodeId: node.uniqueId,
                machineCount: machineCountMap[node.uniqueId] || 1,
                multiplier: machineMultiplierMap[node.uniqueId] || 1
              });
            }
          }
          
          // Process children
          if (node.children) {
            for (const child of node.children) {
              processNode(child, depth + 1);
            }
          }
        };
        
        processNode(dependencies.dependencyTree);
      }
      
      // Add the root item if it exists
      if (dependencies.selectedItem && dependencies.dependencyTree) {
        const rootKey = `${dependencies.selectedItem}-${dependencies.dependencyTree.selectedRecipeId || "default"}`;
        
        if (!items[rootKey]) {
          items[rootKey] = {
            itemId: dependencies.selectedItem,
            amount: dependencies.itemCount,
            recipes: [],
            selectedRecipeId: dependencies.dependencyTree.selectedRecipeId || "",
            isByproduct: false,
            nodeIds: [dependencies.dependencyTree.uniqueId], // Use the actual root node's uniqueId
            depth: 0,
            normalizedMachineCount: 0
          };
          
          // Add to list of items to fetch recipes for
          if (!itemIds.includes(dependencies.selectedItem)) {
            itemIds.push(dependencies.selectedItem);
            recipePromises.push(getRecipesForItem(dependencies.selectedItem));
            namePromises.push(getItemById(dependencies.selectedItem).then(item => item || null));
          }
          
          machineCounts[rootKey] = [{
            nodeId: dependencies.dependencyTree.uniqueId, // Use the actual root node's uniqueId
            machineCount: 1,
            multiplier: 1
          }];
        }
      }
      
      // Calculate accumulated machine counts for each group
      Object.keys(items).forEach(key => {
        const machines = machineCounts[key] || [];
        let normalizedCount = 0;
        
        machines.forEach(machine => {
          // Convert to base multiplier (mark 1)
          normalizedCount += machine.machineCount * machine.multiplier;
        });
        
        items[key].normalizedMachineCount = normalizedCount;
      });
      
      // Fetch recipes for all items
      const recipeResults = await Promise.all(recipePromises);
      const nameResults = await Promise.all(namePromises);
      
      const newRecipeMap: Record<string, Recipe[]> = {};
      
      itemIds.forEach((itemId, index) => {
        newRecipeMap[itemId] = recipeResults[index];
      });
      
      setRecipesMap(newRecipeMap);
      
      // Apply names to items
      Object.keys(items).forEach(key => {
        items[key].name = nameResults[itemIds.indexOf(items[key].itemId)]?.name;
      });
      
      // Convert to array and sort
      const groupedArray = Object.values(items).sort((a, b) => {
        // Non-byproducts first
        if (a.isByproduct !== b.isByproduct) {
          return a.isByproduct ? 1 : -1;
        }
        
        // Then by depth
        if (a.depth !== b.depth) {
          return a.depth - b.depth;
        }
        
        // Then by item ID
        return a.itemId.localeCompare(b.itemId);
      });
      
      setGroupedItems(groupedArray);
    };
    
    fetchRecipes();
  }, [dependencies, machineCountMap, machineMultiplierMap, excessMap, showExtensions, accumulateExtensions]);

  // Find the consumer item in our list by its nodeId
  const scrollToNode = (nodeId: string) => {
    if (!dependencies.dependencyTree) return;
    
    // Find the node in the tree to get its item ID
    const findNodeById = (tree: DependencyNode, id: string): DependencyNode | null => {
      if (tree.uniqueId === id) return tree;
      
      if (tree.children) {
        for (const child of tree.children) {
          const found = findNodeById(child, id);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // Find the clicked node in the tree
    const clickedNode = findNodeById(dependencies.dependencyTree, nodeId);
    
    if (!clickedNode) return;
    
    // Find the parent node that produces this item
    const findParentNode = (tree: DependencyNode, targetId: string): DependencyNode | null => {
      if (tree.children) {
        for (const child of tree.children) {
          if (child.uniqueId === targetId) {
            return tree;
          }
          const found = findParentNode(child, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    // Get the parent node that produces this item
    const parentNode = findParentNode(dependencies.dependencyTree, nodeId);
    
    if (!parentNode) return;
    
    // Find the group that contains the parent node
    const targetGroup = groupedItems.find(group => 
      group.itemId === parentNode.id && 
      group.selectedRecipeId === parentNode.selectedRecipeId
    );
    
    if (!targetGroup) return;
    
    const targetKey = `${targetGroup.itemId}-${targetGroup.selectedRecipeId || "default"}`;
    const element = nodeRefs.current[targetKey];
    
    if (element) {
      // Scroll element into view
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      
      // Add highlight effect
      element.style.transition = 'background-color 0.3s ease';
      element.style.backgroundColor = 'rgba(255, 122, 0, 0.2)';
      
      // Remove highlight after animation
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1500);
    }
  };

  // Process the dependency tree to create grouped items
  const processTree = async () => {
    if (!dependencies.accumulatedDependencies) return;
    
    const grouped: Record<string, GroupedItem> = {};
    const itemIds = new Set<string>();
    const newRecipeMap: Record<string, Recipe[]> = {};
    
    // First pass: collect all items and their total amounts
    Object.entries(dependencies.accumulatedDependencies).forEach(([nodeId, node]) => {
      // Skip extension nodes if not showing extensions or not accumulating them
      if (node.isExtension && (!showExtensions || !accumulateExtensions)) {
        return;
      }
      
      const itemId = node.itemId;
      itemIds.add(itemId);
      
      if (!grouped[itemId]) {
        grouped[itemId] = {
          itemId,
          amount: 0,
          recipes: [],
          selectedRecipeId: node.recipeId,
          isByproduct: node.isByproduct || false,
          nodeIds: [],
          name: node.name,
          depth: node.depth || 0,
          normalizedMachineCount: 0,
        };
      }
      
      // Add this node's contribution
      grouped[itemId].amount += node.amount;
      grouped[itemId].nodeIds.push(nodeId);
      
      // Update the normalized machine count
      const machineCount = machineCountMap[nodeId] || 0;
      const multiplier = machineMultiplierMap[nodeId] || 1;
      grouped[itemId].normalizedMachineCount += machineCount * multiplier;
    });
    
    // ... rest of the function ...
  };

  // Filter and sort the grouped items
  const getFilteredAndSortedItems = () => {
    return groupedItems
      .filter(item => {
        // Apply search filter
        const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm && !nameMatch) return false;
        
        // Apply type filters
        if (item.isByproduct && !showByproducts) return false;
        
        // Determine if it's a raw material (no recipe)
        const isRawMaterial = !item.recipes || item.recipes.length === 0;
        if (isRawMaterial && !showRawMaterials) return false;
        
        // Determine if it's an intermediate product
        const isIntermediate = !item.isByproduct && !isRawMaterial;
        if (isIntermediate && !showIntermediates) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Apply sorting
        if (sortBy === "name") {
          return sortDirection === "asc" 
            ? (a.name || "").localeCompare(b.name || "")
            : (b.name || "").localeCompare(a.name || "");
        } else if (sortBy === "amount") {
          return sortDirection === "asc" 
            ? a.amount - b.amount
            : b.amount - a.amount;
        } else if (sortBy === "depth") {
          return sortDirection === "asc" 
            ? a.depth - b.depth
            : b.depth - a.depth;
        }
        return 0;
      });
  };

  return (
    <div ref={containerRef} style={{ padding: "8px" }}>
      {groupedItems.map((item, index) => {
        // Use the actual nodeId from the dependency tree
        const nodeId = item.nodeIds[0];
        const key = `${item.itemId}-${item.selectedRecipeId || "default"}`;
        
        // Get the lowest multiplier from all machines in this group
        const nodeMultipliers = item.nodeIds.map(nid => machineMultiplierMap[nid] || 1);
        const lowestMultiplier = Math.min(...nodeMultipliers) || 1;
        
        // Calculate effective machine count based on normalized count
        const effectiveMachineCount = Math.ceil(item.normalizedMachineCount / lowestMultiplier);

        // For grouped nodes, we'll show the total excess but only modify the primary node
        const totalExcess = item.nodeIds.reduce((sum, nid) => sum + (excessMap[nid] || 0), 0);
        
        return (
          <div 
            key={key}
            ref={(el) => {
              nodeRefs.current[key] = el;
              return undefined;
            }}
          >
            <ListNode
              itemId={item.itemId}
              amount={item.amount}
              isRoot={nodeId === dependencies.dependencyTree?.uniqueId}
              isByproduct={item.isByproduct}
              recipes={recipesMap[item.itemId] || []}
              selectedRecipeId={item.selectedRecipeId}
              onRecipeChange={(recipeId) => onRecipeChange(nodeId, recipeId)}
              excess={totalExcess}
              onExcessChange={(excess) => onExcessChange(nodeId, excess)}
              index={index}
              machineCount={effectiveMachineCount}
              onMachineCountChange={(count) => onMachineCountChange(nodeId, count)}
              machineMultiplier={lowestMultiplier}
              onMachineMultiplierChange={(multiplier) => onMachineMultiplierChange(nodeId, multiplier)}
              onConsumerClick={scrollToNode}
              showExtensions={showExtensions}
              accumulateExtensions={accumulateExtensions}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AccumulatedView; 
