// src/components/DependencyTree.tsx

import React, { useEffect, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem2 } from "@mui/x-tree-view/TreeItem2";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree }) => {
  // 🔥 Controlled expanded state
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // 🎉 NEW: Recursively compute a unique id (“path”) for each node.
  // The root node's id is its own uniqueId, and each child's id is the parent's id plus its index.
  const getAllNodeIds = (node: DependencyNode, path: string): string[] => {
    const currentId = path;
    let ids = [currentId];
    if (node.children) {
      node.children.forEach((child, index) => {
        // 🌟 NEW: Ensure a unique path by appending the child's index
        const childPath = `${path}-${index}`;
        ids = ids.concat(getAllNodeIds(child, childPath));
      });
    }
    return ids;
  };

  // 🔥 Automatically expand all nodes when the dependencyTree changes
  useEffect(() => {
    if (dependencyTree) {
      const allIds = getAllNodeIds(dependencyTree, dependencyTree.uniqueId);
      setExpandedIds(allIds);
    }
  }, [dependencyTree]);

  // 🎨 Render the dependency tree recursively using the unique "path" as both key and itemId
  const renderTree = (node: DependencyNode, path: string, isRoot = false) => {
    const itemColor = isRoot
      ? dependencyStyles.rootColor
      : node.isByproduct
        ? dependencyStyles.byproductColor
        : dependencyStyles.defaultColor;

    return (
      <TreeItem2
        key={path} // 🌟 NEW: Unique key based on computed path
        itemId={path} // 🌟 NEW: Unique itemId based on computed path
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
          node.children.map((child, index) =>
            renderTree(child, `${path}-${index}`) // 🌟 NEW: Update path for child nodes
          )}
      </TreeItem2>
    );
  };

  return (
    <div style={{ textAlign: "left" }}>
      <SimpleTreeView
        aria-label="dependency-tree"
        expandedItems={expandedIds}
        // 🎨 NEW: Use proper callback signature with type annotations (ignore event parameter)
        onExpandedItemsChange={(_event, newExpandedIds: string[]) =>
          setExpandedIds(newExpandedIds)
        }
        disableSelection
      >
        {renderTree(dependencyTree, dependencyTree.uniqueId, true)}
      </SimpleTreeView>
    </div>
  );
};

export default DependencyTree;
