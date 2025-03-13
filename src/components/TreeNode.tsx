import React, { useState } from 'react';
import ItemNode from './ItemNode';
import { DependencyNode } from '../utils/calculateDependencyTree';
import { theme } from '../styles/theme';

interface TreeNodeProps {
  node: DependencyNode;
  depth: number;
  onRecipeChange?: (nodeId: string, recipeId: string) => void;
  onExcessChange?: (nodeId: string, excess: number) => void;
  excessMap: Record<string, number>;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  depth, 
  onRecipeChange,
  onExcessChange,
  excessMap 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '20px 1fr',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: theme.colors.nodeBg,
          marginBottom: '8px',
          padding: '0 12px 0 0',  // Remove right padding to extend background
          paddingLeft: `${depth * 24}px`
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
          style={{ 
            cursor: hasChildren ? 'pointer' : 'default',
            padding: '8px 0 8px 8px',  // Add padding around caret
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : ""}
        </div>

        <ItemNode
          itemId={node.id}
          amount={node.amount}
          isRoot={node.isRoot}
          isByproduct={node.isByproduct}
          recipes={node.availableRecipes}
          selectedRecipeId={node.selectedRecipeId}
          onRecipeChange={(recipeId) => onRecipeChange?.(node.uniqueId, recipeId)}
          style={{ backgroundColor: 'transparent' }}  // Remove ItemNode background
          excess={excessMap[node.uniqueId] || 0}
          onExcessChange={(excess) => onExcessChange?.(node.uniqueId, excess)}
        />
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children?.map(child => (
            <TreeNode
              key={child.uniqueId}
              node={child}
              depth={depth + 1}
              onRecipeChange={onRecipeChange}
              onExcessChange={onExcessChange}
              excessMap={excessMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
