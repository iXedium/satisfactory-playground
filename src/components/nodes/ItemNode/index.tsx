/**
 * ItemNode Component
 * 
 * Core component for displaying item information in the dependency tree.
 * This is a modularized version of the original ItemNode.tsx.
 */

import React, { useEffect, useState } from "react";
import ItemHeader from "./ItemHeader";
import RecipeSection from "./RecipeSection";
import MachineSection from "./MachineSection";
import ExcessSection from "./ExcessSection";
import ItemFooter from "./ItemFooter";
import { Recipe } from "../../../types/core";
import useItemData from "../../../hooks/useItemData";
import { theme } from "../../../styles/theme";

export interface ItemNodeProps {
  itemId: string;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
  isImport?: boolean;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  excess?: number;
  onExcessChange?: (excess: number) => void;
  style?: React.CSSProperties;
  index?: number;
  onIconClick?: () => void;
  machineCount?: number;
  onMachineCountChange?: (count: number) => void;
  machineMultiplier?: number;
  onMachineMultiplierChange?: (multiplier: number) => void;
  showMachines?: boolean;
  showMachineMultiplier?: boolean;
  onDelete?: () => void;
  onImport?: () => void;
}

/**
 * ItemNode component for displaying item information
 * This serves as a composition root for the various parts of the item node
 */
const ItemNode: React.FC<ItemNodeProps> = ({
  itemId,
  amount,
  isRoot = false,
  isByproduct = false,
  isImport = false,
  recipes = [],
  selectedRecipeId,
  onRecipeChange,
  excess = 0,
  onExcessChange,
  style,
  index = 0,
  onIconClick,
  machineCount = 1,
  onMachineCountChange,
  machineMultiplier = 1,
  onMachineMultiplierChange,
  showMachines = true,
  showMachineMultiplier = false,
  onDelete,
  onImport,
}) => {
  // Use custom hook to fetch item data
  const { item, isLoading } = useItemData(itemId);
  
  // Node type color
  const getItemColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    if (isImport) return theme.colors.nodeImport;
    return theme.colors.nodeDefault;
  };

  const backgroundColor = getItemColor();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor,
        borderRadius: theme.border.radius,
        width: "100%",
        ...(style || {}),
      }}
    >
      {/* Item header with icon, name, and amount */}
      <ItemHeader
        item={item}
        amount={amount}
        isRoot={isRoot}
        isByproduct={isByproduct}
        isImport={isImport}
        onIconClick={onIconClick}
        onDelete={onDelete}
        onImport={onImport}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "8px 12px",
        }}
      >
        {/* Recipe selection dropdown */}
        {recipes && recipes.length > 0 && (
          <RecipeSection
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            onRecipeChange={onRecipeChange}
          />
        )}

        {/* Machine calculation section */}
        {showMachines && selectedRecipeId && (
          <MachineSection
            itemId={itemId}
            amount={amount}
            excess={excess}
            recipeId={selectedRecipeId}
            machineCount={machineCount}
            onMachineCountChange={onMachineCountChange}
            machineMultiplier={machineMultiplier}
            onMachineMultiplierChange={onMachineMultiplierChange}
            showMachineMultiplier={showMachineMultiplier}
          />
        )}

        {/* Excess production input */}
        {selectedRecipeId && (
          <ExcessSection
            excess={excess}
            onExcessChange={onExcessChange}
            amount={amount}
            itemId={itemId}
            recipeId={selectedRecipeId}
            machineCount={machineCount}
            machineMultiplier={machineMultiplier}
          />
        )}
      </div>

      {/* Footer with additional actions */}
      <ItemFooter
        isRoot={isRoot}
        isImport={isImport}
        onDelete={onDelete}
        onImport={onImport}
      />
    </div>
  );
};

export default React.memo(ItemNode);