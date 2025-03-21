import React, { useState, useEffect } from 'react';
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
  expandedNodes?: Record<string, boolean>;
  onNodeExpandChange?: (nodeId: string, expanded: boolean) => void;
  showMachineSection?: boolean;
  showMachineMultiplier?: boolean;
  isRoot?: boolean;
  onDelete?: (treeId: string) => void;
  onImport?: (nodeId: string) => void;
  onUnimport?: (nodeId: string, treeId: string) => void;
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
  onMachineMultiplierChange,
  expandedNodes = {},
  onNodeExpandChange,
  showMachineSection = true,
  showMachineMultiplier = false,
  isRoot = false,
  onDelete,
  onImport,
  onUnimport
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  // Update isExpanded when expandedNodes changes
  useEffect(() => {
    if (node.uniqueId in expandedNodes) {
      setIsExpanded(expandedNodes[node.uniqueId]);
    }
  }, [expandedNodes, node.uniqueId]);
  
  const handleToggle = () => {
    if (hasChildren) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      if (onNodeExpandChange) {
        onNodeExpandChange(node.uniqueId, newExpanded);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(node.uniqueId);
    }
  };

  const handleUnimport = () => {
    if (node.isImport && onUnimport) {
      // For unimport, we need to pass the node's uniqueId and the current tree's ID
      
      // The issue is that we're extracting only part of the tree ID
      // For example, from "iron-plate-1742573847978-iron-ingot-1", 
      // we need to get "iron-plate-1742573847978" as the full tree ID
      
      // Look for the timestamp pattern which is part of the tree ID
      const matches = node.uniqueId.match(/^(.*-\d+)-/);
      if (matches && matches[1]) {
        const treeId = matches[1];
        console.log(`Extracted tree ID from uniqueId: ${treeId}`);
        onUnimport(node.uniqueId, treeId);
      } else {
        console.error("Could not determine tree ID from uniqueId:", node.uniqueId);
      }
    }
  };

  // Calculate background color based on depth
  const getBackgroundColor = (depth: number) => {
    // Start with a lighter base and make subtle changes with depth
    const baseRGB = [90, 100, 110];  // Slightly lighter base color
    const darkenStep = 10;  // More subtle darkening per level
    
    // Calculate darkened RGB values based on depth
    const r = Math.max(baseRGB[0] - (depth * darkenStep), 10);  // Don't go darker than 30
    const g = Math.max(baseRGB[1] - (depth * darkenStep), 20);  // Don't go darker than 40
    const b = Math.max(baseRGB[2] - (depth * darkenStep), 35);  // Don't go darker than 55
    
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
          paddingLeft: `${depth * 32}px`,
          borderRadius: theme.border.radius,
          position: 'relative',
          zIndex: 0
        }}
        data-node-id={node.uniqueId}
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
            isImport={node.isImport}
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
            showMachines={showMachineSection}
            showMachineMultiplier={showMachineMultiplier}
            onDelete={isRoot && onDelete ? () => onDelete(node.uniqueId) : undefined}
            onImport={!isRoot && onImport ? () => onImport(node.uniqueId) : undefined}
            onUnimport={node.isImport && onUnimport ? handleUnimport : undefined}
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
              expandedNodes={expandedNodes}
              onNodeExpandChange={onNodeExpandChange}
              showMachineSection={showMachineSection}
              showMachineMultiplier={showMachineMultiplier}
              isRoot={false}
              onDelete={onDelete}
              onImport={onImport}
              onUnimport={onUnimport}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
