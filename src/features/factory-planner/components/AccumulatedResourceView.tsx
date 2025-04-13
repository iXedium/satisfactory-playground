/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import ListNode from "./ListNode";
import { Recipe, Item, DependencyNode } from "../../../types";
import { getRecipesForItem, getItemById } from "../../../data";
import { AccumulatedNode } from "../../../utils";
import Icon from '../../../components/Icon';
import { findNodeById, findParentNode } from "../../../utils/treeUtils";

interface RefactoredAccumulatedViewProps {
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
  recipeId: string;
  isByproduct: boolean;
  nodeIds: string[];
  name?: string;
  depth: number;
  normalizedMachineCount: number;
  isImport: boolean;
}

interface NodeMachineInfo {
  nodeId: string;
  machineCount: number;
  multiplier: number;
}

const AccumulatedResourceView: React.FC<RefactoredAccumulatedViewProps> = ({
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

  // Scroll to a specific node when clicked
  const scrollToNode = (nodeId: string) => {
    if (!dependencies.dependencyTrees || Object.keys(dependencies.dependencyTrees).length === 0) return;
    
    // Find the clicked node in any tree
    const clickedNode = findNodeById(dependencies.dependencyTrees[Object.keys(dependencies.dependencyTrees)[0]], nodeId);
    if (!clickedNode) return;
    
    // Find the parent that produces this item
    const parentResult = findParentNode(dependencies.dependencyTrees[Object.keys(dependencies.dependencyTrees)[0]], nodeId);
    if (!parentResult) return;
    
    const parentNode = parentResult.node;
    
    // Find the group that contains the parent node
    const targetGroup = groupedItems.find(group => 
      group.itemId === parentNode.id && 
      group.recipeId === parentNode.recipe?.id
    );
    
    if (!targetGroup) return;
    
    const targetKey = `${targetGroup.itemId}-${targetGroup.recipeId || "default"}`;
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
  useEffect(() => {
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
            recipeId: node.recipeId,
            isByproduct: node.isByproduct || false,
            nodeIds: [],
            name: node.name,
            depth: node.depth || 0,
            normalizedMachineCount: 0,
            isImport: node.isImport || false
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
      
      // Fetch all item details and recipes
      const recipePromises: Promise<Recipe[]>[] = [];
      const namePromises: Promise<Item | null>[] = [];
      
      itemIds.forEach(itemId => {
        recipePromises.push(getRecipesForItem(itemId));
        namePromises.push(getItemById(itemId).then(item => item || null));
      });
      
      const recipes = await Promise.all(recipePromises);
      const items = await Promise.all(namePromises);
      
      // Create item and recipe maps
      const newItemsMap: Record<string, Item> = {};
      
      items.forEach((item, index) => {
        if (item) {
          const itemId = item.id;
          newItemsMap[itemId] = item;
          newRecipeMap[itemId] = recipes[index] || [];
          
          if (grouped[itemId]) {
            grouped[itemId].name = item.name;
            grouped[itemId].recipes = recipes[index] || [];
          }
        }
      });
      
      setItemsMap(newItemsMap);
      setRecipesMap(newRecipeMap);
      setGroupedItems(Object.values(grouped));
      setIsLoading(false);
    };
    
    processTree();
  }, [
    dependencies.accumulatedDependencies, 
    showExtensions, 
    accumulateExtensions, 
    machineCountMap, 
    machineMultiplierMap
  ]);

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
      {getFilteredAndSortedItems().map((item, index) => {
        // Use the actual nodeId from the dependency tree
        const nodeId = item.nodeIds[0];
        const key = `${item.itemId}-${item.recipeId || "default"}`;
        
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
              selectedRecipeId={item.recipeId || ''}
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

export { AccumulatedResourceView }; 