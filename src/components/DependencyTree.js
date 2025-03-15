import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from "react";
import TreeNode from './TreeNode';
const DependencyTree = ({ dependencyTree, onRecipeChange, onExcessChange, excessMap, machineCountMap = {}, onMachineCountChange, machineMultiplierMap = {}, onMachineMultiplierChange }) => {
    const containerRef = useRef(null);
    return (_jsx("div", { ref: containerRef, style: {
            textAlign: "left",
            position: 'relative',
            overflow: 'visible',
            width: '100%',
            // Remove fixed height and minHeight to let content determine height
        }, children: _jsx(TreeNode, { node: dependencyTree, depth: 0, onRecipeChange: onRecipeChange, onExcessChange: onExcessChange, excessMap: excessMap, machineCountMap: machineCountMap, onMachineCountChange: onMachineCountChange, machineMultiplierMap: machineMultiplierMap, onMachineMultiplierChange: onMachineMultiplierChange }) }));
};
export default DependencyTree;
