import React, { useEffect, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem2 } from "@mui/x-tree-view/TreeItem2";
import { DependencyNode } from "../utils/calculateDependencyTree";
import ItemNode from "./ItemNode";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { setExpandedNodes } from "../features/treeUiSlice";

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
  onRecipeChange?: (nodeId: string, recipeId: string) => void;
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree, onRecipeChange }) => {
  const dispatch = useDispatch();
  const expandedIds = useSelector((state: RootState) => state.treeUi.expandedNodes);

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
      const allNewIds = getAllNodeIds(dependencyTree, dependencyTree.uniqueId);
      
      // Only auto-expand nodes that haven't been explicitly collapsed
      // and nodes that are completely new
      const newExpandedIds = allNewIds.filter(id => {
        const wasCollapsed = !expandedIds.includes(id);
        const isNewNode = !expandedIds.some(oldId => oldId.startsWith(id) || id.startsWith(oldId));
        return !wasCollapsed || isNewNode;
      });

      dispatch(setExpandedNodes(newExpandedIds));
    }
  }, [dependencyTree, dispatch]);

  const renderTree = (node: DependencyNode, path: string, isRoot = false) => {
    return (
      <TreeItem2
        key={path}
        itemId={path}
        label={
          <ItemNode
            itemId={node.id}
            amount={node.amount}
            isRoot={isRoot}
            isByproduct={node.isByproduct}
            recipes={node.availableRecipes}
            selectedRecipeId={node.selectedRecipeId}
            onRecipeChange={(recipeId) => {
              // Only trigger if the recipe actually changed
              if (recipeId !== node.selectedRecipeId) {
                onRecipeChange?.(node.uniqueId, recipeId);
              }
            }}
          />
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
          dispatch(setExpandedNodes(newExpandedIds))
        }
        disableSelection
      >
        {renderTree(dependencyTree, dependencyTree.uniqueId, true)}
      </SimpleTreeView>
    </div>
  );
};

export default DependencyTree;
