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
  machineCountMap?: Record<string, number>;
  onMachineCountChange?: (nodeId: string, count: number) => void;
  machineMultiplierMap?: Record<string, number>;
  onMachineMultiplierChange?: (nodeId: string, multiplier: number) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  depth, 
  onRecipeChange,
  onExcessChange,
  excessMap,
  machineCountMap = {},
  onMachineCountChange,
  machineMultiplierMap = {},
  onMachineMultiplierChange
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

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
          display: 'flex',
          alignItems: 'center',
          background: getBackgroundColor(depth),
          marginBottom: '8px',
          padding: '0 12px 0 0',
          paddingLeft: `${depth * 16}px`,
          borderRadius: theme.border.radius,
          position: 'relative',
          zIndex: 0
        }}
      >
        <div
          onClick={handleToggle}
          style={{ 
            padding: '8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            cursor: hasChildren ? 'pointer' : 'default',
            zIndex: 1
          }}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : ""}
        </div>

        <div style={{ 
          flex: 1,
          position: 'relative',
          zIndex: 2
        }}>
          <ItemNode
            itemId={node.id}
            amount={node.amount}
            isRoot={node.isRoot}
            isByproduct={node.isByproduct}
            recipes={node.availableRecipes}
            selectedRecipeId={node.selectedRecipeId}
            onRecipeChange={(recipeId) => onRecipeChange?.(node.uniqueId, recipeId)}
            style={{ 
              backgroundColor: 'transparent'
            }}
            excess={excessMap[node.uniqueId] || 0}
            onExcessChange={(excess) => onExcessChange?.(node.uniqueId, excess)}
            onIconClick={hasChildren ? handleToggle : undefined}
            index={depth}
            machineCount={machineCountMap[node.uniqueId] || 1}
            onMachineCountChange={(count) => onMachineCountChange?.(node.uniqueId, count)}
            machineMultiplier={machineMultiplierMap[node.uniqueId] || 1}
            onMachineMultiplierChange={(multiplier) => onMachineMultiplierChange?.(node.uniqueId, multiplier)}
          />
        </div>
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
              machineCountMap={machineCountMap}
              onMachineCountChange={onMachineCountChange}
              machineMultiplierMap={machineMultiplierMap}
              onMachineMultiplierChange={onMachineMultiplierChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
