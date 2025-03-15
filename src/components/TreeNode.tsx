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
    // Start with a lighter base and make subtle changes with depth
    const baseRGB = [50, 60, 75];  // Slightly lighter base color
    const darkenStep = 5;  // More subtle darkening per level
    
    // Calculate darkened RGB values based on depth
    const r = Math.max(baseRGB[0] - (depth * darkenStep), 30);  // Don't go darker than 30
    const g = Math.max(baseRGB[1] - (depth * darkenStep), 40);  // Don't go darker than 40
    const b = Math.max(baseRGB[2] - (depth * darkenStep), 55);  // Don't go darker than 55
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '16px 1fr',
          alignItems: 'center',
          gap: '2px',
          background: getBackgroundColor(depth),
          marginBottom: '8px',
          padding: '0 12px 0 0',
          paddingLeft: `${depth * 20}px`,
          borderRadius: theme.border.radius
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
          style={{ 
            cursor: hasChildren ? 'pointer' : 'default',
            padding: '8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px'
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
