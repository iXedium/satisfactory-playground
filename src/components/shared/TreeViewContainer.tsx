/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { forwardRef, useEffect } from 'react';
import { DependencyNode, Item } from '../../types';
import DependencyTree from '../../features/factory-planner/components/DependencyTree';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { TreeSortKey, SortDirection } from '../../features/factory-planner/hooks/useFactoryPlanner';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import TreeNode from '../../features/factory-planner/components/TreeNode';
import { ViewDensity } from '../../features/factory-planner/hooks/usePlannerDisplayOptions';
import { useTreeNavigation } from '../../contexts/TreeNavigationContext';
import { setHighlightedNode } from '../../features/factory-planner/store/dependencySlice';
import { logger } from '../../utils/logger';

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
  viewDensity: ViewDensity;
  onOptimizeAllMachines?: () => void;
  onDeleteAllTrees?: () => void;
  onToggleAllHidden?: (targetHidden: boolean) => void;
  onResetAllExcess?: () => void;
  onMaxAllExcess?: () => void;
  onToggleAllSelected?: (targetSelected: boolean) => void;
  onToggleAllCompleted?: (targetCompleted: boolean) => void;
}

/**
 * Container component for rendering the tree view of dependency trees.
 * Now handles drag-and-drop sorting for root nodes.
 */
const TreeViewContainer: React.ForwardRefRenderFunction<HTMLDivElement, TreeViewContainerProps> = (
  {
    treesArray,
    handleTreeRecipeChange, handleExcessChange, excessMap, machineCountMap, handleMachineCountChange, machineMultiplierMap, handleMachineMultiplierChange, expandedNodes, setExpandedNodes, showMachines, showMachineMultiplier, handleDeleteTree, handleImportNode, handleUnimportNode, handleNodeUpdate, containerStyle, itemsMap, treeSortKey, treeSortDirection,
    onManualSort,
    handleToggleNodeExtensions,
    viewDensity,
    onOptimizeAllMachines,
    onDeleteAllTrees,
    onToggleAllHidden,
    onResetAllExcess,
    onMaxAllExcess,
    onToggleAllSelected,
    onToggleAllCompleted
  },
  ref) => {

  const dispatch = useDispatch<AppDispatch>();
  const { navigationRequest, clearNavigationRequest } = useTreeNavigation();

  // Handle navigation requests - expand path and scroll to target
  useEffect(() => {
    if (!navigationRequest) return;

    logger.debug('[TreeViewContainer] Handling navigation request:', navigationRequest);

    // Expand all nodes in the path
    const newExpandedNodes = { ...expandedNodes };
    for (const nodeId of navigationRequest.pathNodeIds) {
      newExpandedNodes[nodeId] = true;
    }
    setExpandedNodes(newExpandedNodes);

    // Clear the request
    clearNavigationRequest();

    // Wait for React to re-render with expanded nodes, then scroll
    requestAnimationFrame(() => {
      setTimeout(() => {
        const targetElement = document.querySelector(`[data-node-id="${navigationRequest.targetNodeId}"]`);
        logger.debug('[TreeViewContainer] Looking for element after expand:', navigationRequest.targetNodeId, 'Found:', !!targetElement);
        
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight the target for a moment
          dispatch(setHighlightedNode(navigationRequest.targetNodeId));
          setTimeout(() => {
            dispatch(setHighlightedNode(null));
          }, 1500);
          logger.debug('[TreeViewContainer] Scrolled and highlighted');
        } else {
          logger.warn('[TreeViewContainer] Target element still not found after expansion');
        }
      }, 100); // Small delay to let React render
    });
  }, [navigationRequest, expandedNodes, setExpandedNodes, clearNavigationRequest, dispatch]);

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
                        // marginBottom: '8px',
                      }}
                    >
                      <TreeNode
                        key={treeId}
                        node={tree}
                        depth={0}
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
                        showMachineSection={showMachines}
                        showMachineMultiplier={showMachineMultiplier}
                        isRoot={true}
                        onDelete={handleDeleteTree}
                        onImport={handleImportNode}
                        onUnimport={handleUnimportNode}
                        onNodeUpdate={handleNodeUpdate}
                        treeSortKey={treeSortKey}
                        treeSortDirection={treeSortDirection}
                        viewDensity={viewDensity}
                        isSelected={tree.isSelected}
                        isCompleted={tree.isCompleted}
                        onOptimizeAllMachines={onOptimizeAllMachines}
                        onDeleteAllTrees={onDeleteAllTrees}
                        onToggleAllHidden={onToggleAllHidden}
                        onResetAllExcess={onResetAllExcess}
                        onMaxAllExcess={onMaxAllExcess}
                        onToggleAllSelected={onToggleAllSelected}
                        onToggleAllCompleted={onToggleAllCompleted}
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