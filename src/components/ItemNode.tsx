import React, { useEffect, useState } from "react";
import Icon, { IconSize } from "./Icon";
import { Recipe, Item } from "../data/dexieDB";
import { theme } from "../styles/theme";
import { getItemById, getMachineForRecipe } from "../data/dbQueries";
import StyledSelect from "./shared/StyledSelect";
import EfficiencyIndicator from "./shared/EfficiencyIndicator";
import RateDisplay from "./shared/RateDisplay";
import ExcessControls from "./shared/ExcessControls";
import MachineControls from "./shared/MachineControls";

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
  const [localMachineMultiplier, setLocalMachineMultiplier] =
    useState(machineMultiplier);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [efficiency, setEfficiency] = useState(100);
  const [nominalRate, setNominalRate] = useState(0);

  useEffect(() => {
    setLocalExcess(excess);
  }, [excess]);

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

  // Section container styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: `${theme.colors.dark}`,
    borderRadius: theme.border.radius,
    border: `1px solid ${theme.colors.dropdown.border}`,
    padding: "6px 4px",
    display: "flex",
    alignItems: "center",
    height: "100%",
  };

  if (!item) return null;

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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '4px 0',
        marginRight: '2px',
        width: '24px',
        flex: '0 0 24px',
        alignItems: 'center'
      }}>
        {/* Delete button for root nodes */}
        {isRoot && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              color: '#ff3333',
              cursor: 'pointer',
              padding: '0px 6px',
              borderRadius: theme.border.radius,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              lineHeight: '18px',
              height: '20px',
              width: '20px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
              e.currentTarget.style.color = '#ff0000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
              e.currentTarget.style.color = '#ff3333';
            }}
            title="Delete chain"
          >
            ×
          </button>
        )}
        
        {/* Import/Revert import button for child nodes */}
        {!isRoot && onImport && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImport(itemId);
            }}
            style={{
              background: isImport 
                ? 'rgba(255, 50, 50, 0.1)' 
                : 'rgba(0, 150, 255, 0.1)',
              border: isImport 
                ? '1px solid rgba(255, 50, 50, 0.3)' 
                : '1px solid rgba(0, 150, 255, 0.3)',
              color: isImport ? '#ff3333' : '#0096ff',
              cursor: 'pointer',
              padding: '0px 6px',
              borderRadius: theme.border.radius,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              lineHeight: '18px',
              height: '20px',
              width: '20px',
            }}
            onMouseEnter={(e) => {
              if (isImport) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 50, 50, 0.2)';
                e.currentTarget.style.color = '#ff0000';
              } else {
                e.currentTarget.style.backgroundColor = 'rgba(0, 150, 255, 0.2)';
                e.currentTarget.style.color = '#0077ff';
              }
            }}
            onMouseLeave={(e) => {
              if (isImport) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 50, 50, 0.1)';
                e.currentTarget.style.color = '#ff3333';
              } else {
                e.currentTarget.style.backgroundColor = 'rgba(0, 150, 255, 0.1)';
                e.currentTarget.style.color = '#0096ff';
              }
            }}
            title={isImport ? "Revert import" : "Import from other chain"}
          >
            {isImport ? "↑" : "↓"}
          </button>
        )}
      </div>

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
        <div
          style={{
            ...sectionStyle,
            borderLeft: `4px solid ${getItemColor()}`,
            flex: showMachines ? 2 : 3,
            minWidth: "200px",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Item icon */}
          <div
            style={{
              cursor: onIconClick ? "pointer" : "default",
              marginRight: "8px",
              alignSelf: "flex-start",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onIconClick) onIconClick();
            }}
          >
            <Icon itemId={itemId} size={size} />
          </div>

          {/* Item info and recipe */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "space-between",
              height: "100%",
              position: "relative",
              zIndex: 1,
              gap: "10px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Item name and nominal rate */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: "bold",
                color: theme.colors.text,
                fontSize: "16px",
              }}
            >
              <span>{item.name}</span>
              {nominalRate > 0 && !isByproduct && !isImport && (
                <span style={{ fontSize: "14px", opacity: 0.8 }}>
                  {nominalRate.toFixed(2)}
                </span>
              )}
            </div>

            {/* Recipe selector - aligned to bottom */}
            <div
              style={{ marginTop: "auto", position: "relative", zIndex: 2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {recipes && recipes.length > 0 && onRecipeChange && !isByproduct && !isImport && (
                <StyledSelect
                  value={selectedRecipeId || ""}
                  onChange={onRecipeChange}
                  options={recipes}
                  variant="compact"
                  style={{ width: "100%" }}
                  renderOption={(option, isInDropdown) => (
                    <div 
                    style={{
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '4px 8px',
                        backgroundColor: isInDropdown && option.id === selectedRecipeId ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
                        borderRadius: theme.border.radius,
                    }}
                  >
                      <span style={{ fontWeight: 'bold' }}>{option.name}</span>
                    </div>
                  )}
                />
              )}
            </div>
          </div>
        </div>

        {/* Middle section - Machine info */}
        {machine && !isByproduct && !isImport && showMachines && (
          <div
            style={{
              ...sectionStyle,
              borderLeft: `4px solid ${theme.colors.secondary}`,
              flex: 1,
              maxWidth: "265px",
              position: "relative",
              zIndex: 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Machine icon - same size as item icon */}
            <div style={{ marginRight: "8px" }}>
              <Icon itemId={machine.id} size={size} />
            </div>

            {/* Machine details in column layout */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: "10px",
                position: "relative",
                zIndex: 1,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Machine name */}
              <div
                style={{
                  fontWeight: "bold",
                  color: theme.colors.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "16px",
                }}
              >
                {machine.name}
              </div>

              {/* Machine controls in row */}
              <div
                style={{
                  display: "flex",
                  gap: "0px",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 2,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <MachineControls
                  machineCount={localMachineCount}
                  onMachineCountChange={onMachineCountChange || (() => {})}
                  machineMultiplier={localMachineMultiplier}
                  onMachineMultiplierChange={onMachineMultiplierChange}
                  showMachineMultiplier={showMachineMultiplier}
                  onOptimizeMachines={handleOptimizeMachines}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right section - Efficiency and rate */}
        <div
          style={{
            ...sectionStyle,
            borderLeft: `4px solid ${!isByproduct && !isImport ? getEfficiencyColor() : isByproduct ? theme.colors.nodeByproduct : theme.colors.nodeImport}`,
            flex: 1,
            minWidth: "140px",
            maxWidth: "180px",
            position: "relative",
            zIndex: 1,
            height: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: "10px",
              position: "relative",
              zIndex: 1,
              justifyContent: (isByproduct || isImport) ? "center" : "flex-start",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* First row: Efficiency and Rate */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              {/* Efficiency */}
              <EfficiencyIndicator 
                efficiency={efficiency} 
                isByproduct={isByproduct} 
                isImport={isImport} 
              />

              {/* Rate */}
              <RateDisplay 
                amount={amount}
                isByproduct={isByproduct}
                isImport={isImport}
              />
            </div>

            {/* Second row: Excess controls */}
            {onExcessChange && !isByproduct && !isImport && (
              <ExcessControls
                excess={localExcess}
                onExcessChange={handleExcessChange}
                onMaxExcess={handleMaxExcess}
                onResetExcess={handleResetExcess}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemNode;
