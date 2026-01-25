import React, { useRef } from 'react';
import { DependencyNode } from '../../../types';
import TreeNode from './TreeNode';
import { TreeSortKey, SortDirection } from '../hooks/useFactoryPlanner';
import { ViewDensity } from '../hooks/usePlannerDisplayOptions';

export interface DependencyTreeProps {
  tree: DependencyNode;
  treeId: string;
  onRecipeChange: (nodeId: string, recipeId: string) => void;
  onExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  onMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  onMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  onNodeExpandChange: (nodeId: string, expanded: boolean) => void;
  showMachines: boolean;
  showMachineMultiplier?: boolean;
  isRoot: boolean;
  onDelete?: (treeId: string) => void;
  onImportNode?: (nodeId: string) => void;
  onUnimportNode?: (nodeId: string) => void;
  onNodeUpdate?: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
  viewDensity?: ViewDensity;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({
  tree,
  treeId,
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap,
  onMachineCountChange,
  machineMultiplierMap,
  onMachineMultiplierChange,
  expandedNodes,
  onNodeExpandChange,
  showMachines,
  showMachineMultiplier = false,
  isRoot,
  onDelete,
  onImportNode,
  onUnimportNode,
  onNodeUpdate,
  treeSortKey,
  treeSortDirection,
  viewDensity = 'compact',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ 
      textAlign: "left",
      position: 'relative',
      overflow: 'visible',
      width: '100%',
      // Remove fixed height and minHeight to let content determine height
    }}>
      <TreeNode
        node={tree}
        depth={0}
        treeId={treeId}
        onRecipeChange={onRecipeChange}
        onExcessChange={onExcessChange}
        excessMap={excessMap}
        machineCountMap={machineCountMap}
        onMachineCountChange={onMachineCountChange}
        machineMultiplierMap={machineMultiplierMap}
        onMachineMultiplierChange={onMachineMultiplierChange}
        expandedNodes={expandedNodes}
        onNodeExpandChange={onNodeExpandChange}
        showMachineSection={showMachines}
        isRoot={isRoot}
        onDelete={isRoot && onDelete ? onDelete : undefined}
        onImport={onImportNode}
        onUnimport={onUnimportNode}
        onNodeUpdate={onNodeUpdate}
        showMachineMultiplier={showMachineMultiplier}
        treeSortKey={treeSortKey}
        treeSortDirection={treeSortDirection}
        viewDensity={viewDensity}
      />
    </div>
  );
};

export default DependencyTree;
