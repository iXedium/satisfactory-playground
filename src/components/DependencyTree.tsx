import React, { useEffect, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem2 } from "@mui/x-tree-view/TreeItem2";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree }) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);


  // ✅ Automatically expand all nodes when dependencyTree changes
  useEffect(() => {
    const getAllNodeIds = (node: DependencyNode, ids: string[] = []): string[] => {
      ids.push(node.uniqueId);
      node.children?.forEach((child) => getAllNodeIds(child, ids));
      return ids;
    };

    if (dependencyTree) {
      const allNodeIds = getAllNodeIds(dependencyTree);
      setExpandedIds(allNodeIds);
    }
  }, [dependencyTree]);


  const getAllNodeIds = (
    node: DependencyNode,
    ids: string[] = []
  ): string[] => {
    ids.push(node.uniqueId);
    node.children?.forEach((child) => getAllNodeIds(child, ids));
    return ids;
  };

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
        {Array.isArray(node.children)
          ? node.children.map((child) => renderTree(child))
          : null}
      </TreeItem2>
    );
  };

  return (
    <div style={{ textAlign: "left" }}>
      <SimpleTreeView aria-label="dependency-tree"
        // expandedItems={expandedIds}
        disableSelection>
        {renderTree(dependencyTree, true)}
      </SimpleTreeView>
    </div>
  );
};

export default DependencyTree;
