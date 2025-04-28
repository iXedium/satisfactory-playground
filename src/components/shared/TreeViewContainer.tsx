/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { forwardRef } from 'react';
import { DependencyNode, Item } from '../../types';
import DependencyTree from '../../features/factory-planner/components/DependencyTree';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { TreeSortKey, SortDirection } from '../../features/factory-planner/hooks/useFactoryPlanner';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface TreeViewContainerProps {
  treesArray: DependencyNode[];
  handleTreeRecipeChange: (nodeId: string, recipeId: string) => void;
  handleExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  handleMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  handleMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  showMachines: boolean;
  showMachineMultiplier: boolean;
  handleDeleteTree: (treeId: string) => void;
  handleImportNode: (nodeId: string) => void;
  handleUnimportNode?: (nodeId: string) => void;
  handleNodeUpdate: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  nodeExtensionOverrides?: Record<string, boolean>;
  handleToggleNodeExtensions?: (nodeId: string) => void;
  containerStyle?: React.CSSProperties;
  itemsMap: Record<string, Item>;
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
  onManualSort: (result: DropResult) => void;
}

/**
 * Container component for rendering the tree view of dependency trees.
 * Now handles drag-and-drop sorting for root nodes.
 */
const TreeViewContainer: React.ForwardRefRenderFunction<HTMLDivElement, TreeViewContainerProps> = (
  {
    treesArray,
    handleTreeRecipeChange, handleExcessChange, excessMap, machineCountMap, handleMachineCountChange, machineMultiplierMap, handleMachineMultiplierChange, expandedNodes, setExpandedNodes, showExtensions, accumulateExtensions, showMachines, showMachineMultiplier, handleDeleteTree, handleImportNode, handleUnimportNode, handleNodeUpdate, containerStyle, itemsMap, treeSortKey, treeSortDirection,
    onManualSort
  },
  ref) => {

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }
    onManualSort(result);
  };

  const isDragDisabled = treeSortKey !== 'Manual';

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="root-nodes">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={node => {
              provided.innerRef(node);
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            style={containerStyle}
          >
            {treesArray.map((tree, index) => {
              const treeId = tree.uniqueId;
              return (
                <Draggable
                  key={treeId}
                  draggableId={treeId}
                  index={index}
                >
                  {(providedDraggable, snapshot) => (
                    <div
                      ref={providedDraggable.innerRef}
                      {...providedDraggable.draggableProps}
                      {...providedDraggable.dragHandleProps}
                      style={{
                        ...providedDraggable.draggableProps.style,
                        marginBottom: '8px',
                      }}
                    >
                      <DependencyTree
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
                        onUnimportNode={handleUnimportNode}
                        onNodeUpdate={handleNodeUpdate}
                        treeSortKey={treeSortKey}
                        treeSortDirection={treeSortDirection}
                      />
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default React.forwardRef(TreeViewContainer); 