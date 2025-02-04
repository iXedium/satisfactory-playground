import React from 'react';
import { Tree, NodeRendererProps } from "react-arborist";
import { DependencyNode } from '../utils/calculateDependencyTree';
import ItemNode from './ItemNode';

// Type for Arborist's expected data structure
interface ArboristNode {
  id: string;
  name: string;
  children?: ArboristNode[];
  data: DependencyNode;  // Our original data
}

interface ArboristTreeProps {
  dependencyTree: DependencyNode;
  onRecipeChange?: (nodeId: string, recipeId: string) => void;
  expandedIds: string[];
  onExpandedChange: (ids: string[]) => void;
}

// Convert our tree structure to Arborist's format
const convertToArboristData = (node: DependencyNode): ArboristNode[] => {
  const convertNode = (n: DependencyNode): ArboristNode => ({
    id: n.uniqueId,
    name: n.id,
    children: n.children?.map(convertNode),
    data: n
  });

  return [convertNode(node)];  // Return as array with single root node
};

const NodeRenderer: React.FC<NodeRendererProps<ArboristNode>> = ({ node, style }) => {
  const data = node.data.data; // Original DependencyNode data
  
  return (
    <div style={style}>
      <ItemNode
        itemId={data.id}
        amount={data.amount}
        isRoot={data.isRoot}
        isByproduct={data.isByproduct}
        recipes={data.availableRecipes}
        selectedRecipeId={data.selectedRecipeId}
        onRecipeChange={(recipeId) => {
          // Implementation coming in next step
        }}
      />
    </div>
  );
};

const ArboristTree: React.FC<ArboristTreeProps> = ({
  dependencyTree,
  onRecipeChange,
  expandedIds,
  onExpandedChange
}) => {
  const data = React.useMemo(() => 
    convertToArboristData(dependencyTree), 
    [dependencyTree]
  );

  return (
    <Tree<ArboristNode>
      data={data}
      openByDefault={false}
      width={800}
      height={600}
    >
      {NodeRenderer}
    </Tree>
  );
};

export default ArboristTree;
