import React from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem2 } from "@mui/x-tree-view/TreeItem2";
import { DependencyNode } from "../utils/calculateDependencies";
import { dependencyStyles } from "../styles/dependencyStyles";

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

  const renderTree = (node: DependencyNode, isRoot = false) => {
    const itemColor = isRoot
      ? dependencyStyles.rootColor
      : node.isByproduct
      ? dependencyStyles.byproductColor
      : dependencyStyles.defaultColor; // ✅ Only root is blue

    return (
      <TreeItem2
        key={node.uniqueId}
        itemId={node.uniqueId}
        label={
          <span
            style={{
              display: "block",
              textAlign: "left",
              paddingLeft: "10px",
              color: itemColor,
            }}
          >
            {node.id}: {node.amount.toFixed(2)}
          </span>
        }
      >
        {node.children &&
          node.children.map((child) => renderTree(child, false))}{" "}
        {/* ✅ Mark children as non-root */}
      </TreeItem2>
    );
  };

  return (
    <div style={{ textAlign: "left" }}>
      {" "}
      {/* ✅ Ensures left alignment */}
      <SimpleTreeView defaultExpandedItems={expandedIds}>
        {renderTree(dependencyTree, true)}{" "}
        {/* ✅ Pass "true" only for the root */}
      </SimpleTreeView>
    </div>
  );
};

export default DependencyTree;
