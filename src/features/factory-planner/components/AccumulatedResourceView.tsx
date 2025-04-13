/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import ListNode from "./ListNode";
import { Recipe, Item, DependencyNode } from "../../../types";
import { AccumulatedNode } from "../../../utils";
import Icon from '../../../components/Icon';
import { findNodeById, findParentNode } from "../../../utils/treeUtils";
import { useGroupedAccumulatedItems, GroupedItem } from "../hooks/useGroupedAccumulatedItems";
import { useItemFilteringSorting } from "../hooks/useItemFilteringSorting";

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
  onDeleteTree?: (treeId: string) => void;
  onImportNode?: (nodeId: string) => void;
  nodeExtensionOverrides?: Record<string, boolean>;
  onToggleNodeExtensions?: (nodeId: string) => void;
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
  onDeleteTree,
  onImportNode,
  nodeExtensionOverrides,
  onToggleNodeExtensions
}) => {
  const dependenciesState = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);
  const accumulatedDependencies = dependenciesState.accumulatedDependencies;

  const { 
    groupedItems, 
    recipesMap,
    isLoading 
  } = useGroupedAccumulatedItems({
    accumulatedDependencies,
    dependenciesState,
    recipeSelections,
    showExtensions,
    accumulateExtensions,
    machineCountMap,
    machineMultiplierMap,
  });

  const {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    showByproducts,
    setShowByproducts,
    showRawMaterials,
    setShowRawMaterials,
    showIntermediates,
    setShowIntermediates,
    getFilteredAndSortedItems,
  } = useItemFilteringSorting();

  const [showMachines, setShowMachines] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToNode = (nodeId: string) => {
    if (!dependenciesState.dependencyTrees || Object.keys(dependenciesState.dependencyTrees).length === 0) return;
    
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

  if (isLoading) {
    return <div>Loading accumulated resources...</div>;
  }

  const finalItemsToRender = getFilteredAndSortedItems(groupedItems);

  return (
    <div ref={containerRef} style={{ padding: "4px" }}>
      {finalItemsToRender.map((item, index) => {
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