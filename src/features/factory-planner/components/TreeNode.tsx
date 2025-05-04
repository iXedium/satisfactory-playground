import React, { useState, useEffect } from "react";
import ItemNode from "./ItemNode";
import { DependencyNode } from "../../../types";
import { theme } from "../../../styles/theme";
import { toggleChildrenVisibility } from "../../../utils/nodeReferenceUtils";
import { TreeSortKey, SortDirection } from "../hooks/useFactoryPlanner";
import { ViewDensity } from "../hooks/usePlannerDisplayOptions";

interface TreeNodeProps {
  node: DependencyNode;
  depth: number;
  treeId: string;
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
  onUnimport?: (nodeId: string) => void;
  onNodeUpdate?: (nodeId: string, updatedNode: Partial<DependencyNode>) => void;
  treeSortKey: TreeSortKey;
  treeSortDirection: SortDirection;
  viewDensity: ViewDensity;
  isSelected?: boolean;
  isCompleted?: boolean;
  onOptimizeAllMachines?: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  treeId,
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
  onUnimport,
  onNodeUpdate,
  treeSortKey,
  treeSortDirection,
  viewDensity,
  isSelected = false,
  isCompleted = false,
  onOptimizeAllMachines,
}) => {
  // Default internal state to false (collapsed) initially
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  // Update isExpanded when expandedNodes changes, defaulting to false if not present
  useEffect(() => {
    // Check if the key exists and explicitly use the value from the map,
    // otherwise default to false (collapsed).
    const expandedStateFromMap = expandedNodes[node.uniqueId];
    setIsExpanded(
      expandedStateFromMap === undefined ? false : expandedStateFromMap
    );
  }, [expandedNodes, node.uniqueId]);

  const handleToggle = () => {
    if (hasChildren) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      if (onNodeExpandChange) {
        onNodeExpandChange(node.uniqueId, newExpanded);
      }

      // If this is an imported node, also toggle children visibility
      if (node.isImport && onNodeUpdate) {
        const updatedNode = toggleChildrenVisibility(node);
        onNodeUpdate(node.uniqueId, {
          childrenVisible: updatedNode.childrenVisible,
        });
      }
    }
  };

  // Calculate background color based on depth and status
  const getBackgroundColor = (
    depth: number,
    selected: boolean,
    completed: boolean
  ) => {
    if (completed) {
      return "rgba(76, 175, 80, 0.70)"; // Completed Green Highlight
    }
    if (selected) {
      return "rgba(255, 165, 0, 0.70)"; // Selected Orange Highlight
    }

    // Default depth-based background
    const baseRGB = [90, 100, 110];
    const darkenStep = 10;
    const r = Math.max(baseRGB[0] - depth * darkenStep, 10);
    const g = Math.max(baseRGB[1] - depth * darkenStep, 20);
    const b = Math.max(baseRGB[2] - depth * darkenStep, 35);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Check if children should be visible (use childrenVisible property if available)
  const shouldShowChildren =
    isExpanded && hasChildren && node.childrenVisible !== false; // If childrenVisible is undefined or true, show children

  // Sort children before rendering
  const sortedChildren = [...(node.children || [])].sort((a, b) => {
    // Implement sorting logic based on treeSortKey and treeSortDirection
    let compareResult = 0;
    if (treeSortKey === "name") {
      compareResult = (a.id || "").localeCompare(b.id || ""); // Assuming item name is in id for now
    } else if (treeSortKey === "amount") {
      compareResult = a.amount - b.amount;
    } else if (treeSortKey === "nominalRate") {
      // Need nominal rate data here - requires more prop drilling or lookup
      // Placeholder: sort by amount for now
      compareResult = a.amount - b.amount;
    } else {
      // Default to originalDepth (or depth if originalDepth isn't available)
      compareResult =
        (a.originalDepth ?? a.depth ?? 0) - (b.originalDepth ?? b.depth ?? 0);
    }
    return treeSortDirection === "asc" ? compareResult : -compareResult;
  });

  // Recursive rendering of child nodes
  const renderChildren = () => {
    if (!isExpanded || !node.children || node.childrenVisible === false) {
      return null;
    }

    return sortedChildren.map((child: DependencyNode, index: number) => (
      <TreeNode
        key={child.uniqueId || `${child.id}-${index}`}
        node={child}
        depth={depth + 1}
        treeId={treeId}
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
        onNodeUpdate={onNodeUpdate}
        treeSortKey={treeSortKey}
        treeSortDirection={treeSortDirection}
        viewDensity={viewDensity}
        isSelected={child.isSelected}
        isCompleted={child.isCompleted}
        onOptimizeAllMachines={onOptimizeAllMachines}
      />
    ));
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: getBackgroundColor(depth, isSelected, isCompleted),
          marginBottom: "8px",
          padding: "0 12px 0 0",
          paddingLeft: `${depth * 32}px`,
          borderRadius: theme.border.radius,
          position: "relative",
          zIndex: 0,
        }}
        data-node-id={node.uniqueId}
      >
        <div
          onClick={handleToggle}
          style={{
            padding: "8px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "30px",
            cursor: hasChildren ? "pointer" : "default",
            zIndex: 1,
          }}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : ""}
        </div>

        <div
          style={{
            flex: 1,
            position: "relative",
            zIndex: 2,
          }}
        >
          <ItemNode
            itemId={node.id}
            amount={node.amount}
            uniqueId={node.uniqueId}
            treeId={treeId}
            isRoot={node.isRoot}
            isByproduct={node.isByproduct}
            isImport={node.isImport}
            recipes={node.availableRecipes}
            selectedRecipeId={node.recipe?.id ?? undefined}
            onRecipeChange={(recipeId) =>
              onRecipeChange?.(node.uniqueId, recipeId)
            }
            style={{
              backgroundColor: "transparent",
            }}
            excess={excessMap[node.uniqueId] || 0}
            onExcessChange={(excess) => onExcessChange?.(node.uniqueId, excess)}
            onIconClick={hasChildren ? handleToggle : undefined}
            index={depth}
            machineCount={machineCountMap[node.uniqueId] || 1}
            onMachineCountChange={(count) =>
              onMachineCountChange?.(node.uniqueId, count)
            }
            machineMultiplier={machineMultiplierMap[node.uniqueId] || 1}
            onMachineMultiplierChange={(multiplier) =>
              onMachineMultiplierChange?.(node.uniqueId, multiplier)
            }
            showMachines={showMachineSection}
            showMachineMultiplier={showMachineMultiplier}
            onDelete={
              isRoot && onDelete ? () => onDelete(node.uniqueId) : undefined
            }
            onImport={
              !isRoot && onImport ? () => onImport(node.uniqueId) : undefined
            }
            onUnimport={
              !isRoot && onUnimport
                ? () => onUnimport(node.uniqueId)
                : undefined
            }
            viewDensity={viewDensity}
            size={viewDensity === "compact" ? "small" : "large"}
            onOptimizeAllMachines={onOptimizeAllMachines}
          />
        </div>
      </div>

      {shouldShowChildren && (
        <div style={{ position: "relative" }}>{renderChildren()}</div>
      )}
    </div>
  );
};

export default TreeNode;
