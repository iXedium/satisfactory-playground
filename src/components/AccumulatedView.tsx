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
  showMachineSection?: boolean;
  showMachineMultiplier?: boolean;
  onDelete?: (treeId: string) => void;
  accumulatedDependencies: Record<string, AccumulatedNode>;
  onDeleteTree?: (treeId: string) => void;
  onImportNode?: (nodeId: string) => void;
  nodeExtensionOverrides?: Record<string, boolean>;
  onToggleNodeExtensions?: (nodeId: string) => void;
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
  isImport: boolean;
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
  showMachineSection = true,
  showMachineMultiplier = false,
  onDelete,
  accumulatedDependencies,
  onDeleteTree,
  onImportNode,
  nodeExtensionOverrides,
  onToggleNodeExtensions
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
      if (dependencies.dependencyTrees) {
        const processNode = (node: DependencyNode, depth: number = 0) => {
          // Skip import nodes to avoid double-counting
          if (node.isImport) {
            return;
          }
          
          // Group only by item ID to merge byproducts with same item type
          const key = `${node.id}`;
          
          if (!items[key]) {
            items[key] = {
              itemId: node.id,
              amount: 0,
              recipes: [],
              // Use non-byproduct recipe if possible
              selectedRecipeId: node.isByproduct ? "" : (node.selectedRecipeId || ""),
              isByproduct: false, // Will be overridden if all nodes are byproducts
              nodeIds: [],
              depth: depth,
              normalizedMachineCount: 0,
              isImport: false
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
            
            // Prefer non-byproduct recipes
            if (!node.isByproduct && node.selectedRecipeId && !items[key].selectedRecipeId) {
              items[key].selectedRecipeId = node.selectedRecipeId;
            }
          }
          
          // Add amount and node ID
          items[key].amount += node.amount; // This will add negative amounts for byproducts
          
          // Only add unique nodeIds
          if (!items[key].nodeIds.includes(node.uniqueId)) {
            items[key].nodeIds.push(node.uniqueId);
            
            // Track machine counts and multipliers for this node
            if (!node.isByproduct) { // Only count machines for non-byproducts
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
        
        for (const treeId in dependencies.dependencyTrees) {
          const tree = dependencies.dependencyTrees[treeId];
          processNode(tree);
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

  const findNodeInAllTrees = (nodeId: string): DependencyNode | null => {
    if (!dependencies.dependencyTrees) return null;
    
    for (const treeId in dependencies.dependencyTrees) {
      const tree = dependencies.dependencyTrees[treeId];
      const node = findNodeById(tree, nodeId);
      if (node) return node;
    }
    
    return null;
  };
  
  const findParentInAllTrees = (nodeId: string): { tree: DependencyNode, node: DependencyNode } | null => {
    if (!dependencies.dependencyTrees) return null;
    
    for (const treeId in dependencies.dependencyTrees) {
      const tree = dependencies.dependencyTrees[treeId];
      const parent = findParentNode(tree, nodeId);
      if (parent) return { tree, node: parent };
    }
    
    return null;
  };

  // Find a node by ID
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

  // Find the consumer item in our list by its nodeId
  const scrollToNode = (nodeId: string) => {
    if (!dependencies.dependencyTrees || Object.keys(dependencies.dependencyTrees).length === 0) return;
    
    // Find the clicked node in any tree
    const clickedNode = findNodeInAllTrees(nodeId);
    if (!clickedNode) return;
    
    // Find the parent that produces this item
    const parentResult = findParentInAllTrees(nodeId);
    if (!parentResult) return;
    
    const parentNode = parentResult.node;
    
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
      
      // Skip import nodes to avoid double-counting
      if (node.isImport) {
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
          isImport: false
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
    <div ref={containerRef} style={{ padding: "4px" }}>
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
              isRoot={item.nodeIds.some(id => {
                for (const treeId in dependencies.dependencyTrees) {
                  if (id === dependencies.dependencyTrees[treeId].uniqueId) {
                    return true;
                  }
                }
                return false;
              })}
              isByproduct={item.isByproduct}
              isImport={item.isImport}
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
              showMachines={showMachineSection}
              showMachineMultiplier={showMachineMultiplier}
              onDelete={onDelete}
              onImport={onImportNode ? () => onImportNode(nodeId) : undefined}
              nodeExtensionOverrides={nodeExtensionOverrides}
              onToggleNodeExtensions={onToggleNodeExtensions}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AccumulatedView; 
