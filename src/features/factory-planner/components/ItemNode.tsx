import React, { useEffect, useState } from "react";
import { Recipe, Item } from "../../../types";
import { theme } from "../../../styles/theme";
import { getItemById, getMachineForRecipe } from "../../../data";
import { IconSize } from "../../../components";
import ItemNodeButtons from "../../../components/shared/ItemNodeButtons";
import ItemDetails from "../../../components/shared/ItemDetails";
import MachineDetails from "../../../components/shared/MachineDetails";
import EfficiencySection from "../../../components/shared/EfficiencySection";
import { useItemNodeCalculations } from '../hooks/useItemNodeCalculations';
import { ViewDensity } from '../hooks/usePlannerDisplayOptions';

interface ItemNodeProps {
  itemId: string;
  amount: number;
  uniqueId: string;
  treeId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  isImport?: boolean;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  size?: IconSize;
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
  onImport?: (nodeId: string) => void;
  onUnimport?: (nodeId: string) => void;
  viewDensity: ViewDensity;
}

interface Machine {
  id: string;
  name: string;
  speed: number;
  type: string;
  usage: number;
  modules?: number;
}

const ItemNode: React.FC<ItemNodeProps> = ({
  itemId,
  amount,
  uniqueId,
  treeId,
  isRoot = false,
  isByproduct = false,
  isImport = false,
  recipes = [],
  selectedRecipeId,
  onRecipeChange,
  size = "large",
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
  onUnimport,
  viewDensity,
}) => {
  // Log received props for byproducts
  if (isByproduct) {
    //
  }
  
  const [item, setItem] = useState<Item | null>(null);
  const [localExcess, setLocalExcess] = useState(excess);
  const [localMachineCount, setLocalMachineCount] = useState(machineCount);
  const [localMachineMultiplier, setLocalMachineMultiplier] = useState(machineMultiplier);
  const [machine, setMachine] = useState<Machine | null>(null);

  // Use the new hook to get calculated values
  const { efficiency, nominalRate } = useItemNodeCalculations({
    itemId,
    amount,
    excess: localExcess,
    machineCount: localMachineCount,
    machineMultiplier: localMachineMultiplier,
    machine,
    selectedRecipeId,
    recipes,
  });

  // Restore useEffect to sync localExcess with excess prop
  useEffect(() => {
    // console.debug(`[EXCESS DEBUG] ItemNode ${itemId} received new excess prop: ${excess}`); // Keep commented for now
    setLocalExcess(excess);
  }, [excess]); // Only depend on excess prop

  useEffect(() => {
    getItemById(itemId).then((item) => setItem(item || null));
  }, [itemId]);

  useEffect(() => {
    if (selectedRecipeId) {
      getMachineForRecipe(selectedRecipeId).then((machineData) => {
        if (machineData) {
          setMachine(machineData);
        } else {
           // Handle case where machine data isn't found for the recipe
           setMachine(null);
        }
      });
    } else {
      // Clear machine if no recipe is selected
      setMachine(null);
    }
  }, [selectedRecipeId]);

  useEffect(() => {
    setLocalMachineCount(machineCount);
  }, [machineCount]);

  useEffect(() => {
    // Update local state when the multiplier prop changes
    setLocalMachineMultiplier(machineMultiplier); 
  }, [machineMultiplier]);

  const getItemColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    if (isImport) return theme.colors.nodeImport;
    return theme.colors.nodeDefault;
  };

  const getEfficiencyColor = () => {
    if (efficiency > 100) return theme.colors.efficiency.over;
    if (efficiency < 100) return theme.colors.efficiency.under;
    return theme.colors.efficiency.perfect;
  };

  const handleExcessChange = (value: number) => {
    // console.debug(`[EXCESS DEBUG] ItemNode ${itemId} handleExcessChange called with: ${value}`);
    setLocalExcess(value);
    onExcessChange?.(value);
  };

  const handleResetExcess = () => {
    setLocalExcess(0);
    onExcessChange?.(0);
  };

  const handleMaxExcess = () => {
    if (machine && selectedRecipeId && recipes) {
      const recipe = recipes.find((r) => r.id === selectedRecipeId);
      if (recipe) {
        // Calculate the total production capacity
        const totalCapacity =
          localMachineCount * localMachineMultiplier * nominalRate;

        // Calculate excess needed for 100% efficiency - keep full precision
        const excessNeeded = totalCapacity - amount;
        // Store the precise value without rounding
        const preciseValue = Math.max(0, excessNeeded);
        
        setLocalExcess(preciseValue);
        onExcessChange?.(preciseValue);
      }
    }
  };

  const handleOptimizeMachines = () => {
    // Removed detailed logging

    if (machine && selectedRecipeId && recipes && nominalRate > 0) {
      const recipe = recipes.find((r) => r.id === selectedRecipeId);
      if (recipe) {
        // Calculate the exact machine count needed for 100% efficiency (can be decimal)
        const neededAmount = amount + localExcess;
        const exactMachines = neededAmount / (nominalRate * localMachineMultiplier);

        // Use ceil to get the lowest integer count that is >= 100% efficiency
        // This ensures the calculated efficiency is <= 100%
        const optimalMachines = Math.max(1, Math.ceil(exactMachines)); 

        // Removed calculation log

        setLocalMachineCount(optimalMachines);
        onMachineCountChange?.(optimalMachines);
      } else {
         // This case should technically not be reachable if the outer 'if' passed
         // console.warn('[Optimize Error] Recipe not found inside if block.'); // Keep this warn
         console.warn('[Optimize Error] Recipe not found inside if block.');
      }
    } else {
      // Keep the failure log
      // console.warn('[Optimize Check Fail] Condition not met. Values:', { 
      //     machine: !!machine, 
      //     selectedRecipeId: !!selectedRecipeId, 
      //     recipes: recipes && recipes.length > 0, 
      //     nominalRatePositive: nominalRate > 0 
      // });
      console.warn('[Optimize Check Fail] Condition not met.');
    }
  };

  if (!item) return null;

  const densityClass = `item-node--${viewDensity}`;

   return (
    <div
      className={`item-node ${densityClass}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "8px 2px",
        borderRadius: theme.border.radius,
        ...style,
      }}
    >
      {/* Button Section */}
      <ItemNodeButtons
        isRoot={isRoot}
        isImport={isImport}
        itemId={uniqueId}
        onDelete={onDelete}
        onImport={onImport}
        onUnimport={onUnimport}
      />

      {/* Item Section Container */}
      <div
        className="item-section-container"
        style={{
          display: "flex",
          gap: "4px",
          backgroundColor: index % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent",
          borderRadius: theme.border.radius,
          padding: "4px",
          flex: 1,
          minWidth: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left section - Item info */}
        <ItemDetails
          item={item}
          itemId={itemId}
          amount={amount}
          size={size}
          recipes={recipes}
          selectedRecipeId={selectedRecipeId}
          onRecipeChange={onRecipeChange}
          onIconClick={onIconClick}
          nominalRate={nominalRate}
          isByproduct={isByproduct}
          isImport={isImport}
          getItemColor={getItemColor}
        />

        {/* Middle section - Machine info */}
        {machine && !isByproduct && !isImport && showMachines && (
          <MachineDetails
            machine={machine}
            machineCount={localMachineCount}
            onMachineCountChange={onMachineCountChange || (() => {}) }
            machineMultiplier={localMachineMultiplier}
            onMachineMultiplierChange={onMachineMultiplierChange}
            showMachineMultiplier={showMachineMultiplier}
            onOptimizeMachines={handleOptimizeMachines}
            size={size}
          />
        )}

        {/* Right section - Efficiency and rate */}
        <EfficiencySection
          efficiency={Math.round(efficiency * 100) / 100}
          amount={amount}
          isByproduct={isByproduct}
          isImport={isImport}
          excess={localExcess}
          nodeId={uniqueId}
          treeId={treeId}
          itemName={item?.name ?? itemId}
          onExcessChange={onExcessChange ? handleExcessChange : undefined}
          onMaxExcess={onExcessChange ? handleMaxExcess : undefined}
          onResetExcess={onExcessChange ? handleResetExcess : undefined}
          getEfficiencyColor={getEfficiencyColor}
        />
      </div>
    </div>
  );
};

export default ItemNode;
