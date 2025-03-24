import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Recipe, Item } from "../data/dexieDB";
import { getRecipesForItem, getItemById } from "../data/dbQueries";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { AccumulatedNode } from "../utils/calculateAccumulatedFromTree";
import { GroupedItem } from "./shared/ResourceSummary";
import SortingControls, { SortOption, SortDirection } from "./shared/SortingControls";
import CategorySection from "./shared/CategorySection";

interface NodeMachineInfo {
  nodeId: string;
  machineCount: number;
  multiplier: number;
}

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

const RefactoredAccumulatedView: React.FC<RefactoredAccumulatedViewProps> = ({
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
  
  // Sorting and filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showByproducts, setShowByproducts] = useState(true);
  const [showRawMaterials, setShowRawMaterials] = useState(true);
  const [showIntermediates, setShowIntermediates] = useState(true);
  const [showMachines, setShowMachines] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Find a node in any tree by its unique ID
  const findNodeInAllTrees = (nodeId: string): DependencyNode | null => {
    if (!dependencies.dependencyTrees) return null;

    for (const treeId in dependencies.dependencyTrees) {
      const found = findNodeById(dependencies.dependencyTrees[treeId], nodeId);
      if (found) return found;
    }
    return null;
  };

  // Find the parent node and tree containing the node with the given ID
  const findParentInAllTrees = (nodeId: string): { tree: DependencyNode, node: DependencyNode } | null => {
    if (!dependencies.dependencyTrees) return null;

    for (const treeId in dependencies.dependencyTrees) {
      const tree = dependencies.dependencyTrees[treeId];
      const foundParent = findParentNode(tree, nodeId);
      if (foundParent) return { tree, node: foundParent };
    }
    return null;
  };

  // Find a node in a tree by its unique ID
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

  // Find the parent node that contains the child with the given target ID
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

  // Scroll to a specific node when clicked
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
      group.itemId === parentNode.id
    );
    
    if (!targetGroup) return;
    
    const targetKey = `${targetGroup.itemId}-0`;
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
      const itemsPromises: Promise<Item | null>[] = [];
      const recipesPromises: Promise<Recipe[]>[] = [];
      
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
        
        if (!grouped[itemId]) {
          itemIds.add(itemId);
          grouped[itemId] = {
            itemId,
            amount: 0,
            isByproduct: node.isByproduct || false,
            name: node.name,
            depth: node.depth || 0,
            normalizedMachineCount: 0,
            isImport: node.isImport || false
          };
          
          // Queue item and recipe fetching
          itemsPromises.push(getItemById(itemId).then(item => item || null));
          recipesPromises.push(getRecipesForItem(itemId));
        }
        
        // Add this node's contribution
        grouped[itemId].amount += node.amount;
        
        // Update the normalized machine count
        const machineCount = machineCountMap[nodeId] || 0;
        const multiplier = machineMultiplierMap[nodeId] || 1;
        grouped[itemId].normalizedMachineCount += machineCount * multiplier;
      });
      
      // Fetch all item details and recipes
      const items = await Promise.all(itemsPromises);
      const recipes = await Promise.all(recipesPromises);
      
      // Create item and recipe maps
      const newItemsMap: Record<string, Item> = {};
      
      items.forEach((item, index) => {
        if (item) {
          newItemsMap[item.id] = item;
          newRecipeMap[item.id] = recipes[index] || [];
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

  // Filter and sort the items
  const getFilteredAndSortedItems = () => {
    return groupedItems
      .filter(item => {
        // Apply search filter
        const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm && !nameMatch) return false;
        
        // Apply type filters
        if (item.isByproduct && !showByproducts) return false;
        
        // Determine if it's a raw material (no recipe)
        const isRawMaterial = item.isImport;
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

  const filteredItems = getFilteredAndSortedItems();
  
  // Group items by category
  const byproducts = filteredItems.filter(item => item.isByproduct);
  const rawMaterials = filteredItems.filter(item => item.isImport && !item.isByproduct);
  const intermediates = filteredItems.filter(item => !item.isByproduct && !item.isImport);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div ref={containerRef} style={{ padding: "16px" }}>
      {/* Sorting and Filtering Controls */}
      <SortingControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        showByproducts={showByproducts}
        onShowByproductsChange={setShowByproducts}
        showRawMaterials={showRawMaterials}
        onShowRawMaterialsChange={setShowRawMaterials}
        showIntermediates={showIntermediates}
        onShowIntermediatesChange={setShowIntermediates}
        showMachines={showMachines}
        onShowMachinesChange={setShowMachines}
      />

      {/* Categorized Resource Sections */}
      <CategorySection
        title="Raw Materials"
        type="raw_materials"
        items={rawMaterials}
        showSection={showRawMaterials}
        nodeRefs={nodeRefs}
        onConsumerClick={scrollToNode}
      />

      <CategorySection
        title="Intermediate Products"
        type="intermediates"
        items={intermediates}
        showSection={showIntermediates}
        nodeRefs={nodeRefs}
        onConsumerClick={scrollToNode}
      />

      <CategorySection
        title="Byproducts"
        type="byproducts"
        items={byproducts}
        showSection={showByproducts}
        nodeRefs={nodeRefs}
        onConsumerClick={scrollToNode}
      />
    </div>
  );
};

export default RefactoredAccumulatedView; 