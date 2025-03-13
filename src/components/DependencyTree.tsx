import React, { useRef } from "react";
import { DependencyNode } from "../utils/calculateDependencyTree";
import TreeNode from './TreeNode';

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
  onRecipeChange?: (nodeId: string, recipeId: string) => void;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree, onRecipeChange }) => {
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
      />
    </div>
  );
};

export default DependencyTree;
