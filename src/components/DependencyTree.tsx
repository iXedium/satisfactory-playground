import React, { useMemo, useEffect, useRef } from "react";
import { Tree, NodeRendererProps, NodeApi, TreeApi } from "react-arborist";  // Add NodeApi import
import { DependencyNode } from "../utils/calculateDependencyTree";
import ItemNode from "./ItemNode";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { setExpandedNodes } from "../features/treeUiSlice";

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
  onRecipeChange?: (nodeId: string, recipeId: string) => void;
}

// Renamed interface for clarity
interface TreeNodeData {
  id: string;
  name: string;
  children?: TreeNodeData[];
  itemData: DependencyNode;  // Renamed from 'data' to 'itemData' for clarity
}

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree, onRecipeChange }) => {
  const dispatch = useDispatch();
  const expandedIds = useSelector((state: RootState) => state.treeUi.expandedNodes);
  const treeRef = useRef<TreeApi<TreeNodeData>>(null);
  const isInitialMount = useRef(true);

  const data = useMemo(() => {
    console.log('Converting dependency tree:', dependencyTree);
    
    const convertNode = (node: DependencyNode): TreeNodeData => {
      const converted = {
        id: node.uniqueId,
        name: node.id,
        children: node.children?.map(convertNode),
        itemData: node
      };
      console.log('Converted node:', converted);
      return converted;
    };

    const result = [convertNode(dependencyTree)];
    console.log('Final tree data:', result);
    return result;
  }, [dependencyTree]);

  const handleRecipeChange = (nodeId: string, recipeId: string) => {
    onRecipeChange?.(nodeId, recipeId);
  };

  // Calculate total height needed for a node
  const NODE_HEIGHT = 84;  // 64px min-height + 12px padding + 8px gap

  const NodeRenderer: React.FC<NodeRendererProps<TreeNodeData>> = ({ node, style }) => {
    console.log('Rendering node:', {
      nodeApi: node,
      nodeData: node.data,
      itemData: node.data.itemData
    });

    return (
      <div style={{
        ...style,
        paddingBottom: '8px',  // Add spacing between nodes
      }}>
        <ItemNode
          itemId={node.data.itemData.id}
          amount={node.data.itemData.amount}
          isRoot={node.data.itemData.isRoot}
          isByproduct={node.data.itemData.isByproduct}
          recipes={node.data.itemData.availableRecipes}
          selectedRecipeId={node.data.itemData.selectedRecipeId}
          onRecipeChange={(recipeId) => handleRecipeChange(node.data.itemData.uniqueId, recipeId)}
        />
      </div>
    );
  };

  // Add back node ID collection
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

  // Simplified expansion state handler - only runs once
  useEffect(() => {
    if (!dependencyTree || !isInitialMount.current) return;
    isInitialMount.current = false;

    const allNewIds = getAllNodeIds(dependencyTree, dependencyTree.uniqueId);
    dispatch(setExpandedNodes(allNewIds));
  }, [dependencyTree]); // Only depend on tree structure changes

  return (
    <div style={{ textAlign: "left", position: 'relative', overflow: 'visible' }}>
      <Tree<TreeNodeData>
        ref={treeRef}
        data={data}
        openByDefault={true}  // Changed to true for debugging
        width={800}
        height={600}
        indent={24}           // Add proper indentation
        rowHeight={NODE_HEIGHT}  // Set consistent row height
        padding={8}           // Add padding around the tree
        // defaultOpen={expandedIds}  // Changed from initialOpenNodes to defaultOpen
        onToggle={(nodeId: string) => {
          // Only update Redux when user explicitly toggles nodes
          const newIds = expandedIds.includes(nodeId)
            ? expandedIds.filter(id => id !== nodeId)
            : [...expandedIds, nodeId];
          dispatch(setExpandedNodes(newIds));
        }}
      >
        {NodeRenderer}
      </Tree>
    </div>
  );
};

export default DependencyTree;
