import React, { useRef } from "react";
import { DependencyNode } from "../utils/calculateDependencyTree";
import TreeNode from './TreeNode';

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
  onRecipeChange?: (nodeId: string, recipeId: string) => void;
  onExcessChange?: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
  machineCountMap?: Record<string, number>;
  onMachineCountChange?: (nodeId: string, count: number) => void;
  machineMultiplierMap?: Record<string, number>;
  onMachineMultiplierChange?: (nodeId: string, multiplier: number) => void;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ 
  dependencyTree, 
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap = {},
  onMachineCountChange,
  machineMultiplierMap = {},
  onMachineMultiplierChange
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
        node={dependencyTree}
        depth={0}
        onRecipeChange={onRecipeChange}
        onExcessChange={onExcessChange}
        excessMap={excessMap}
        machineCountMap={machineCountMap}
        onMachineCountChange={onMachineCountChange}
        machineMultiplierMap={machineMultiplierMap}
        onMachineMultiplierChange={onMachineMultiplierChange}
      />
    </div>
  );
};

export default DependencyTree;
