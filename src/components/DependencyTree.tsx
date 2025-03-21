import React, { useRef } from "react";
import { DependencyNode } from "../utils/calculateDependencyTree";
import TreeNode from './TreeNode';

export interface DependencyTreeProps {
  tree: DependencyNode;
  onRecipeChange: (nodeId: string, recipeId: string) => void;
  onExcessChange: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  onMachineCountChange: (nodeId: string, count: number) => void;
  machineMultiplierMap: Record<string, number>;
  onMachineMultiplierChange: (nodeId: string, multiplier: number) => void;
  expandedNodes: Record<string, boolean>;
  onNodeExpandChange: (nodeId: string, expanded: boolean) => void;
  showExtensions: boolean;
  accumulateExtensions: boolean;
  showMachines: boolean;
  isRoot: boolean;
  onDelete?: (treeId: string) => void;
  onImportNode?: (nodeId: string) => void;
  onUnimportNode?: (nodeId: string, treeId: string) => void;
  showMachineMultiplier?: boolean;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({
  tree,
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap,
  onMachineCountChange,
  machineMultiplierMap,
  onMachineMultiplierChange,
  expandedNodes,
  onNodeExpandChange,
  showExtensions,
  accumulateExtensions,
  showMachines,
  isRoot,
  onDelete,
  onImportNode,
  onUnimportNode,
  showMachineMultiplier = false
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
        showMachineMultiplier={showMachineMultiplier}
      />
    </div>
  );
};

export default DependencyTree;
