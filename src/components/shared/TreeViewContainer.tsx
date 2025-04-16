import React from 'react';
import { DependencyNode, Item } from '../../types';
import DependencyTree from '../../features/factory-planner/components/DependencyTree';

// Import sort types (or define locally)
type TreeSortKey = 'originalDepth' | 'amount' | 'name' | 'nominalRate'; 
type SortDirection = 'asc' | 'desc';

interface TreeViewContainerProps {
  dependencies: {
    dependencyTrees: Record<string, DependencyNode>;
  };
  handleTreeRecipeChange: (nodeId: string, recipeId: string) => void;
  handleExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  handleMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  handleMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  handleDeleteTree: (treeId: string) => void;
  handleImportNode: (nodeId: string) => void;
  handleNodeUpdate?: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  containerStyle?: React.CSSProperties;
  // --- Add Sort Props & Item Map --- 
  itemsMap: Record<string, Item>; 
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
  // -------------------------------
}

/**
 * Container component for rendering the tree view of dependency trees
 */
const TreeViewContainer: React.FC<TreeViewContainerProps> = ({
  dependencies,
  handleTreeRecipeChange,
  handleExcessChange,
  excessMap,
  machineCountMap,
  handleMachineCountChange,
  machineMultiplierMap,
  handleMachineMultiplierChange,
  expandedNodes,
  setExpandedNodes,
  showExtensions,
  accumulateExtensions,
  showMachines,
  showMachineMultiplier,
  handleDeleteTree,
  handleImportNode,
  handleNodeUpdate,
  containerStyle,
  // --- Destructure Sort Props & Item Map ---
  itemsMap,
  treeSortKey,
  treeSortDirection,
  // ---------------------------------------
}) => {

  // --- Get trees array --- 
  const treesArray = Object.values(dependencies.dependencyTrees);
  
  // --- Apply Sorting --- 
  // No longer automatically sorting here, the sort happens inside the if block
  // console.log("[TreeView AutoSort] Unsorted Trees:", ... ); // Remove this log
  
  // --- Manual Sorting Logic (Uncommented) ---
  treesArray.sort((a, b) => {
    let compareResult = 0;
    
    if (treeSortKey === 'originalDepth') {
      // Sort by originalDepth ascending (main root -1, others Infinity if missing)
      const depthA = a.originalDepth ?? (a.depth === 0 ? -1 : Infinity);
      const depthB = b.originalDepth ?? (b.depth === 0 ? -1 : Infinity);
      compareResult = depthA - depthB;
    } else if (treeSortKey === 'amount') {
      compareResult = (a.amount ?? 0) - (b.amount ?? 0);
    } else if (treeSortKey === 'name') {
      const nameA = itemsMap[a.id]?.name?.toLowerCase() || a.id.toLowerCase();
      const nameB = itemsMap[b.id]?.name?.toLowerCase() || b.id.toLowerCase();
      compareResult = nameA.localeCompare(nameB);
    } else if (treeSortKey === 'nominalRate') {
      const outputA = a.recipe?.out?.[a.id] ?? 0;
      const timeA = a.recipe?.time ?? 0;
      const rateA = timeA > 0 ? (outputA / timeA) * 60 : 0;

      const outputB = b.recipe?.out?.[b.id] ?? 0;
      const timeB = b.recipe?.time ?? 0;
      const rateB = timeB > 0 ? (outputB / timeB) * 60 : 0;
      
      compareResult = rateA - rateB;
    }
    
    // Apply direction AFTER comparison is determined
    return treeSortDirection === 'asc' ? compareResult : -compareResult;
  });
  
  // Log the final sorted order
  console.log(`[TreeView Sort] Sorted by ${treeSortKey} (${treeSortDirection}):`, treesArray.map(t => { 
    const output = t.recipe?.out?.[t.id] ?? 0;
    const time = t.recipe?.time ?? 0;
    const rate = time > 0 ? (output / time) * 60 : 0;
    return { 
      id: t.uniqueId, 
      name: itemsMap[t.id]?.name, 
      originalDepth: t.originalDepth,
      amount: t.amount,
      nominalRate: rate
    };
  })) ;
  // ---------------------------------------

  return (
    <div style={containerStyle}>
      {treesArray.map((tree) => {
        const treeId = tree.uniqueId;
        return (
          <DependencyTree
            key={treeId}
            tree={tree}
            treeId={treeId}
            onRecipeChange={handleTreeRecipeChange}
            onExcessChange={handleExcessChange}
            excessMap={excessMap}
            machineCountMap={machineCountMap}
            onMachineCountChange={handleMachineCountChange}
            machineMultiplierMap={machineMultiplierMap}
            onMachineMultiplierChange={handleMachineMultiplierChange}
            expandedNodes={expandedNodes}
            onNodeExpandChange={(nodeId: string, expanded: boolean) => {
              setExpandedNodes(prev => ({
                ...prev,
                [nodeId]: expanded
              }));
            }}
            showMachines={showMachines}
            showMachineMultiplier={showMachineMultiplier}
            isRoot={true}
            onDelete={() => handleDeleteTree(treeId)}
            onImportNode={handleImportNode}
            onNodeUpdate={handleNodeUpdate}
          />
        );
      })}
    </div>
  );
};

export default TreeViewContainer; 