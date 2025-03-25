import React, { useEffect, useState } from "react";
import { Recipe, Item } from "../data/dexieDB";
import { theme } from "../styles/theme";
import { getItemById, getMachineForRecipe } from "../data/dbQueries";
import { IconSize } from "./Icon";
import ItemNodeButtons from "./shared/ItemNodeButtons";
import ItemDetails from "./shared/ItemDetails";
import MachineDetails from "./shared/MachineDetails";
import EfficiencySection from "./shared/EfficiencySection";

interface ItemNodeProps {
  itemId: string;
  amount: number;
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
}) => {
  const [item, setItem] = useState<Item | null>(null);
  const [localExcess, setLocalExcess] = useState(excess);
  const [localMachineCount, setLocalMachineCount] = useState(machineCount);
  const [localMachineMultiplier] = useState(machineMultiplier);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [efficiency, setEfficiency] = useState(100);
  const [nominalRate, setNominalRate] = useState(0);

  useEffect(() => {
    console.debug(`[EXCESS DEBUG] ItemNode ${itemId} received new excess prop: ${excess}`);
    setLocalExcess(excess);
  }, [excess, itemId]);

  useEffect(() => {
    getItemById(itemId).then((item) => setItem(item || null));
  }, [itemId]);

  useEffect(() => {
    if (selectedRecipeId) {
      getMachineForRecipe(selectedRecipeId).then((machineData) => {
        if (machineData) {
          setMachine(machineData);
        }
      });
    }
  }, [selectedRecipeId]);

  // Calculate efficiency and nominal rate whenever relevant values change
  useEffect(() => {
    if (machine && selectedRecipeId && recipes) {
      const recipe = recipes.find((r) => r.id === selectedRecipeId);
      if (recipe) {
        const outputAmount = recipe.out[itemId] || 1;
        const cyclesPerMinute = 60 / recipe.time;
        const itemsPerMinute = outputAmount * cyclesPerMinute;

        // Calculate nominal production rate (per machine)
        const nominalRatePerMachine = itemsPerMinute * machine.speed;
        setNominalRate(nominalRatePerMachine);

        // Calculate total production capacity with all machines
        // Always use localMachineMultiplier value even when the control is hidden
        const totalMachineCapacity =
          localMachineCount * localMachineMultiplier * nominalRatePerMachine;

        // Calculate efficiency (actual needed / total capacity)
        // Use precise excess value for accurate calculations
        const neededAmount = amount + localExcess;
        const newEfficiency = (neededAmount / totalMachineCapacity) * 100;
        
        console.debug(`[EXCESS DEBUG] ItemNode ${itemId} calculating efficiency:
          amount: ${amount}
          localExcess: ${localExcess}
          totalMachineCapacity: ${totalMachineCapacity}
          neededAmount: ${neededAmount}
          efficiency: ${Math.round(newEfficiency * 100) / 100}%`);
        
        setEfficiency(Math.round(newEfficiency * 100) / 100);
      }
    }
  }, [
    amount,
    localExcess,
    localMachineCount,
    localMachineMultiplier,
    machine,
    selectedRecipeId,
    recipes,
    itemId,
  ]);

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
    console.debug(`[EXCESS DEBUG] ItemNode ${itemId} handleExcessChange called with: ${value}`);
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
    if (machine && selectedRecipeId && recipes) {
      const recipe = recipes.find((r) => r.id === selectedRecipeId);
      if (recipe) {
        // Calculate optimal machine count for 100% efficiency
        const neededAmount = amount + localExcess;
        const optimalMachines = Math.ceil(
          neededAmount / (nominalRate * localMachineMultiplier)
        );

        setLocalMachineCount(optimalMachines);
        onMachineCountChange?.(optimalMachines);
      }
    }
  };

  if (!item) return null;

  // Development mode test button
  const showTestButton = process.env.NODE_ENV === 'development';
  
  const testExcessCascade = () => {
    console.debug(`[EXCESS TEST] Testing excess cascade for node ${itemId}`);
    const testExcess = localExcess + 5; // Add 5 to current excess
    console.debug(`[EXCESS TEST] Changing excess from ${localExcess} to ${testExcess}`);
    handleExcessChange(testExcess);
  };

  return (
    <div
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
        itemId={itemId}
        onDelete={onDelete}
        onImport={onImport}
      />

      {/* Item Section */}
      <div
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
            onMachineCountChange={onMachineCountChange || (() => {})}
            machineMultiplier={localMachineMultiplier}
            onMachineMultiplierChange={onMachineMultiplierChange}
            showMachineMultiplier={showMachineMultiplier}
            onOptimizeMachines={handleOptimizeMachines}
            size={size}
          />
        )}

        {/* Right section - Efficiency and rate */}
        <EfficiencySection
          efficiency={efficiency}
          amount={amount}
          isByproduct={isByproduct}
          isImport={isImport}
          excess={localExcess}
          onExcessChange={onExcessChange ? handleExcessChange : undefined}
          onMaxExcess={onExcessChange ? handleMaxExcess : undefined}
          onResetExcess={onExcessChange ? handleResetExcess : undefined}
          getEfficiencyColor={getEfficiencyColor}
        />
      </div>

      {/* Debug test button - only in development */}
      {showTestButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            testExcessCascade();
          }}
          style={{
            padding: "2px 4px",
            fontSize: "10px",
            backgroundColor: "#ff5722",
            color: "white",
            border: "none",
            borderRadius: "2px",
            cursor: "pointer",
            marginLeft: "4px"
          }}
          title="Test Excess Cascade (Debug)"
        >
          Test
        </button>
      )}
    </div>
  );
};

export default ItemNode;
