import React from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem2 } from "@mui/x-tree-view/TreeItem2";
import { DependencyNode } from "../utils/calculateDependencies";

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree }) => {
  const getAllNodeIds = (
    node: DependencyNode,
    ids: string[] = []
  ): string[] => {
    ids.push(node.uniqueId);
    node.children?.forEach((child) => getAllNodeIds(child, ids));
    return ids;
  };

  const expandedIds = getAllNodeIds(dependencyTree); // ✅ Get all node IDs for expansion

  const renderTree = (node: DependencyNode) => (
    <TreeItem2
      key={node.uniqueId}
      itemId={node.uniqueId}
      label={node.id + ": " + node.amount.toFixed(2)}
      style={{ textAlign: "left" }} // ✅ Fix: Use standard inline `style`
    >
      {node.children && node.children.map((child) => renderTree(child))}
    </TreeItem2>
  );

  return (
    <SimpleTreeView defaultExpandedItems={expandedIds}>
      {renderTree(dependencyTree)}
    </SimpleTreeView>
  );
};

export default DependencyTree;
