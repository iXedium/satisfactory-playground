import React, { useEffect, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem2 } from "@mui/x-tree-view/TreeItem2";
import { DependencyNode } from "../utils/calculateDependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import ItemWithIcon from "./ItemWithIcon";

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree }) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const getAllNodeIds = (node: DependencyNode, path: string): string[] => {
    const currentId = path;
    let ids = [currentId];
    if (node.children) {
      node.children.forEach((child, index) => {
        const childPath = `${path}-${index}`;
        ids = ids.concat(getAllNodeIds(child, childPath));
      });
    }
    return ids;
  };

  useEffect(() => {
    if (dependencyTree) {
      const allIds = getAllNodeIds(dependencyTree, dependencyTree.uniqueId);
      setExpandedIds(allIds);
    }
  }, [dependencyTree]);

  const renderTree = (node: DependencyNode, path: string, isRoot = false) => {
    const itemColor = isRoot
      ? dependencyStyles.rootColor
      : node.isByproduct
        ? dependencyStyles.byproductColor
        : dependencyStyles.defaultColor;

    return (
      <TreeItem2
        key={path}
        itemId={path}
        label={
          <div style={{ display: "flex", alignItems: "center" }}>
            <ItemWithIcon 
              itemId={node.id} 
              amount={node.amount}
              color={itemColor}
            />
          </div>
        }
      >
        {node.children &&
          node.children.map((child, index) =>
            renderTree(child, `${path}-${index}`)
          )}
      </TreeItem2>
    );
  };

  return (
    <div style={{ textAlign: "left" }}>
      <SimpleTreeView
        aria-label="dependency-tree"
        expandedItems={expandedIds}
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
