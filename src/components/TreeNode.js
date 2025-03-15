import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import ItemNode from './ItemNode';
import { theme } from '../styles/theme';
const TreeNode = ({ node, depth, onRecipeChange, onExcessChange, excessMap, machineCountMap = {}, onMachineCountChange, machineMultiplierMap = {}, onMachineMultiplierChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const handleToggle = () => {
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };
    // Calculate background color based on depth
    const getBackgroundColor = (depth) => {
        // Start with a lighter base and make subtle changes with depth
        const baseRGB = [50, 60, 75]; // Slightly lighter base color
        const darkenStep = 5; // More subtle darkening per level
        // Calculate darkened RGB values based on depth
        const r = Math.max(baseRGB[0] - (depth * darkenStep), 30); // Don't go darker than 30
        const g = Math.max(baseRGB[1] - (depth * darkenStep), 40); // Don't go darker than 40
        const b = Math.max(baseRGB[2] - (depth * darkenStep), 55); // Don't go darker than 55
        return `rgb(${r}, ${g}, ${b})`;
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: '0px 1fr',
                    alignItems: 'center',
                    gap: '1px',
                    background: getBackgroundColor(depth),
                    marginBottom: '8px',
                    padding: '0 12px 0 0',
                    paddingLeft: `${depth * 16}px`,
                    borderRadius: theme.border.radius
                }, children: [_jsx("div", { onClick: handleToggle, style: {
                            padding: '8px 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            cursor: hasChildren ? 'pointer' : 'default',
                            zIndex: 1 // Ensure chevron is above other elements
                        }, children: hasChildren ? (isExpanded ? "▼" : "▶") : "" }), _jsx(ItemNode, { itemId: node.id, amount: node.amount, isRoot: node.isRoot, isByproduct: node.isByproduct, recipes: node.availableRecipes, selectedRecipeId: node.selectedRecipeId, onRecipeChange: (recipeId) => onRecipeChange?.(node.uniqueId, recipeId), style: {
                            backgroundColor: 'transparent',
                            pointerEvents: 'none',
                            paddingLeft: '14px' // Add padding to prevent content from overlapping chevron
                        }, excess: excessMap[node.uniqueId] || 0, onExcessChange: (excess) => onExcessChange?.(node.uniqueId, excess), onIconClick: hasChildren ? handleToggle : undefined, index: depth, machineCount: machineCountMap[node.uniqueId] || 1, onMachineCountChange: (count) => onMachineCountChange?.(node.uniqueId, count), machineMultiplier: machineMultiplierMap[node.uniqueId] || 1, onMachineMultiplierChange: (multiplier) => onMachineMultiplierChange?.(node.uniqueId, multiplier) })] }), isExpanded && hasChildren && (_jsx("div", { children: node.children?.map(child => (_jsx(TreeNode, { node: child, depth: depth + 1, onRecipeChange: onRecipeChange, onExcessChange: onExcessChange, excessMap: excessMap, machineCountMap: machineCountMap, onMachineCountChange: onMachineCountChange, machineMultiplierMap: machineMultiplierMap, onMachineMultiplierChange: onMachineMultiplierChange }, child.uniqueId))) }))] }));
};
export default TreeNode;
