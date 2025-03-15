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
  
  // Calculate background color based on depth
  const getBackgroundColor = (depth: number) => {
    const baseColor = theme.colors.nodeBg;
    if (depth === 0) return baseColor;
    
    // Add a subtle darkening effect for each depth level
    const darkenAmount = Math.min(depth * 0.05, 0.3); // Cap at 30% darker
    return `linear-gradient(145deg, 
      rgba(45, 55, 68, ${0.5 + darkenAmount}), 
      rgba(58, 70, 84, ${0.5 + darkenAmount})
    )`;
  };

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '20px 1fr',
          alignItems: 'center',
          gap: '4px',
          background: getBackgroundColor(depth),
          marginBottom: '8px',
          padding: '0 12px 0 0',
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
