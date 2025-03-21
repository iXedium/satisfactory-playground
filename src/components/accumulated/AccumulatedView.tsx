/**
 * AccumulatedView Component
 * 
 * Main component for displaying accumulated view of all items across trees.
 * Serves as the composition root for accumulated view components.
 */

import React, { useRef, useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { Recipe, Item } from "../../types/core";
import { Card } from "../common";
import { getRecipesForItem, getItemById } from "../../data/dbQueries";
import { DependencyNode } from "../../utils/calculateDependencyTree";
import { AccumulatedNode } from "../../utils/calculateAccumulatedFromTree";
import AccumulatedViewHeader from "./AccumulatedViewHeader";
import AccumulatedViewFilters from "./AccumulatedViewFilters";
import AccumulatedViewItem from "./AccumulatedViewItem";
import AccumulatedViewSummary, { GroupedItem } from "./AccumulatedViewSummary";

export interface AccumulatedViewProps {
  /**
   * Callback when a recipe is changed
   */
  onRecipeChange: (nodeId: string, recipeId: string) => void;
  
  /**
   * Callback when excess is changed
   */
  onExcessChange: (nodeId: string, excess: number) => void;
  
  /**
   * Map of excess values by node ID
   */
  excessMap: Record<string, number>;
  
  /**
   * Map of machine counts by node ID
   */
  machineCountMap: Record<string, number>;
  
  /**
   * Callback when machine count is changed
   */
  onMachineCountChange: (nodeId: string, count: number) => void;
  
  /**
   * Map of machine multipliers by node ID
   */
  machineMultiplierMap: Record<string, number>;
  
  /**
   * Callback when machine multiplier is changed
   */
  onMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  
  /**
   * Whether to show extensions
   */
  showExtensions?: boolean;
  
  /**
   * Whether to accumulate extensions
   */
  accumulateExtensions?: boolean;
  
  /**
   * Whether to show machine section
   */
  showMachineSection?: boolean;
  
  /**
   * Whether to show machine multiplier
   */
  showMachineMultiplier?: boolean;
  
  /**
   * Callback when a tree is deleted
   */
  onDelete?: (treeId: string) => void;
  
  /**
   * Map of accumulated dependencies
   */
  accumulatedDependencies: Record<string, AccumulatedNode>;
  
  /**
   * Callback when a tree is deleted
   */
  onDeleteTree?: (treeId: string) => void;
  
  /**
   * Callback when a node is imported
   */
  onImportNode?: (nodeId: string) => void;
  
  /**
   * Map of node extension overrides
   */
  nodeExtensionOverrides?: Record<string, boolean>;
  
  /**
   * Callback when node extensions are toggled
   */
  onToggleNodeExtensions?: (nodeId: string) => void;
}

/**
 * Component for displaying accumulated view of all items
 */
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
  // Redux state
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  
  // State hooks
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
  
  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Fetch recipes when dependency tree changes
  useEffect(() => {
    processTree();
  }, [dependencies, showExtensions, accumulateExtensions]);
  
  // Helper function to find a node by ID in any tree
  const findNodeInAllTrees = (nodeId: string): DependencyNode | null => {
    for (const treeId in dependencies.dependencyTrees) {
      const foundNode = findNodeById(dependencies.dependencyTrees[treeId], nodeId);
      if (foundNode) return foundNode;
    }
    return null;
  };
  
  // Helper function to find a node by ID
  const findNodeById = (tree: DependencyNode, id: string): DependencyNode | null => {
    if (tree.uniqueId === id) return tree;
    
    if (tree.children) {
      for (const child of tree.children) {
        const foundNode = findNodeById(child, id);
        if (foundNode) return foundNode;
      }
    }
    
    return null;
  };
  
  // Helper function to find a parent node
  const findParentInAllTrees = (nodeId: string): { node: DependencyNode, treeId: string } | null => {
    for (const treeId in dependencies.dependencyTrees) {
      const foundParent = findParentNode(dependencies.dependencyTrees[treeId], nodeId);
      if (foundParent) return { node: foundParent, treeId };
    }
    return null;
  };
  
  // Helper function to find a parent node
  const findParentNode = (tree: DependencyNode, childId: string): DependencyNode | null => {
    if (!tree.children) return null;
    
    for (const child of tree.children) {
      if (child.uniqueId === childId) return tree;
      
      const foundInChild = findParentNode(child, childId);
      if (foundInChild) return foundInChild;
    }
    
    return null;
  };
  
  // Handler for scrolling to a node
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
    
    // Fetch recipes and items
    const recipePromises = Array.from(itemIds).map(async (itemId) => {
      const recipes = await getRecipesForItem(itemId);
      newRecipeMap[itemId] = recipes;
      return { itemId, recipes };
    });
    
    const itemPromises = Array.from(itemIds).map(async (itemId) => {
      const item = await getItemById(itemId);
      return { itemId, item };
    });
    
    const [recipeResults, itemResults] = await Promise.all([
      Promise.all(recipePromises),
      Promise.all(itemPromises)
    ]);
    
    // Update recipes map
    const newItemsMap: Record<string, Item> = {};
    itemResults.forEach(({ itemId, item }) => {
      if (item) {
        newItemsMap[itemId] = item;
        // Update name in grouped items if not already set
        if (grouped[itemId] && !grouped[itemId].name && item.name) {
          grouped[itemId].name = item.name;
        }
      }
    });
    
    // Update recipes in grouped items
    recipeResults.forEach(({ itemId, recipes }) => {
      if (grouped[itemId]) {
        grouped[itemId].recipes = recipes;
      }
    });
    
    // Convert grouped items to array
    const groupedItemsArray = Object.values(grouped);
    
    // Update state
    setRecipesMap(newRecipeMap);
    setItemsMap(newItemsMap);
    setGroupedItems(groupedItemsArray);
    setIsLoading(false);
  };

  // Filter and sort the grouped items
  const filteredAndSortedItems = useMemo(() => {
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
  }, [groupedItems, searchTerm, sortBy, sortDirection, showByproducts, showRawMaterials, showIntermediates]);

  return (
    <div className="accumulated-view">
      {/* Header with search and sort controls */}
      <AccumulatedViewHeader 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
      />
      
      {/* Filters */}
      <AccumulatedViewFilters
        showByproducts={showByproducts}
        onShowByproductsChange={setShowByproducts}
        showRawMaterials={showRawMaterials}
        onShowRawMaterialsChange={setShowRawMaterials}
        showIntermediates={showIntermediates}
        onShowIntermediatesChange={setShowIntermediates}
        showMachines={showMachines}
        onShowMachinesChange={setShowMachines}
        showExtensions={showExtensions}
        onShowExtensionsChange={() => {}}
        compactView={compactView}
        onCompactViewChange={setCompactView}
      />
      
      {/* Summary */}
      <AccumulatedViewSummary
        groupedItems={groupedItems}
        filters={{
          showByproducts,
          showRawMaterials,
          showIntermediates,
          showMachines
        }}
        itemsMap={itemsMap}
      />
      
      {/* Loading state */}
      {isLoading && (
        <Card>
          <div style={{ padding: "16px", textAlign: "center" }}>
            Loading items...
          </div>
        </Card>
      )}
      
      {/* Empty state */}
      {!isLoading && filteredAndSortedItems.length === 0 && (
        <Card>
          <div style={{ padding: "16px", textAlign: "center" }}>
            No items found. Try adjusting your filters or search term.
          </div>
        </Card>
      )}
      
      {/* Item list */}
      <div ref={containerRef} style={{ padding: "4px" }}>
        {filteredAndSortedItems.map((item) => {
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
              <AccumulatedViewItem
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
                machineCount={effectiveMachineCount}
                onMachineCountChange={(count) => onMachineCountChange(nodeId, count)}
                machineMultiplier={lowestMultiplier}
                onMachineMultiplierChange={(multiplier) => onMachineMultiplierChange(nodeId, multiplier)}
                showMachines={showMachineSection}
                showMachineMultiplier={showMachineMultiplier}
                showExtensions={showExtensions}
                accumulateExtensions={accumulateExtensions}
                onDelete={onDelete ? () => onDelete(nodeId) : undefined}
                onImport={onImportNode ? () => onImportNode(nodeId) : undefined}
                onConsumerClick={scrollToNode}
                nodeExtensionOverrides={nodeExtensionOverrides}
                onToggleNodeExtensions={onToggleNodeExtensions}
                nodeId={nodeId}
                depth={item.depth}
                compact={compactView}
                nodeIds={item.nodeIds}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(AccumulatedView); 