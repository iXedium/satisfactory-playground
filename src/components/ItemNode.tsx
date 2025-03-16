import React, { useEffect, useState, useRef } from "react";
import Icon, { IconSize } from "./Icon";
import { Recipe, Item } from "../data/dexieDB";
import { theme } from "../styles/theme";
import { getItemById, getMachineForRecipe } from "../data/dbQueries";
import StyledSelect from "./shared/StyledSelect";
import StyledInput from "./shared/StyledInput";

interface ItemNodeProps {
  itemId: string;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
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
  recipes,
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
}) => {
  const [item, setItem] = useState<Item | null>(null);
  const [localExcess, setLocalExcess] = useState(excess);
  const [localMachineCount, setLocalMachineCount] = useState(machineCount);
  const [localMachineMultiplier, setLocalMachineMultiplier] =
    useState(machineMultiplier);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [efficiency, setEfficiency] = useState(100);
  const [showEfficiencyTooltip, setShowEfficiencyTooltip] = useState(false);
  const [nominalRate, setNominalRate] = useState(0);

  // Refs for input elements to handle selection
  const machineCountRef = useRef<HTMLInputElement>(null);
  const machineMultiplierRef = useRef<HTMLInputElement>(null);
  const excessRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalExcess(excess);
  }, [excess]);

  useEffect(() => {
    setLocalMachineCount(machineCount);
  }, [machineCount]);

  useEffect(() => {
    setLocalMachineMultiplier(machineMultiplier);
  }, [machineMultiplier]);

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
        const totalMachineCapacity =
          localMachineCount * localMachineMultiplier * nominalRatePerMachine;

        // Calculate efficiency (actual needed / total capacity)
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
    return theme.colors.nodeDefault;
  };

  const getEfficiencyColor = () => {
    if (efficiency > 100) return theme.colors.efficiency.over;
    if (efficiency < 100) return theme.colors.efficiency.under;
    return theme.colors.efficiency.perfect;
  };

  const handleExcessChange = (value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    setLocalExcess(numValue);
    onExcessChange?.(numValue);
  };

  const handleMachineCountChange = (value: string) => {
    const numValue = Math.max(1, value === "" ? 1 : Math.floor(Number(value)));
    setLocalMachineCount(numValue);
    onMachineCountChange?.(numValue);
  };

  const handleMachineMultiplierChange = (value: string) => {
    const numValue = Math.max(1, value === "" ? 1 : Math.floor(Number(value)));
    setLocalMachineMultiplier(numValue);
    onMachineMultiplierChange?.(numValue);
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

        // Calculate excess needed for 100% efficiency
        const excessNeeded = totalCapacity - amount;
        const roundedExcess = Math.max(0, Math.round(excessNeeded * 100) / 100);

        setLocalExcess(roundedExcess);
        onExcessChange?.(roundedExcess);
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

  const copyEfficiencyValue = () => {
    const decimalValue = efficiency / 100;
    navigator.clipboard.writeText(decimalValue.toString());
    setShowEfficiencyTooltip(true);
    setTimeout(() => setShowEfficiencyTooltip(false), 2000);
  };

  // Handle keyboard events for numeric inputs
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: number,
    setter: (value: number) => void,
    min: number = 0
  ) => {
    let step = 1;
    if (e.ctrlKey) step = 10;
    if (e.shiftKey) step = 100;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newValue = Math.max(min, currentValue + step);
      setter(newValue);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newValue = Math.max(min, currentValue - step);
      setter(newValue);
    }
  };

  // Handle mouse wheel events for numeric inputs
  const handleWheel = (
    e: React.WheelEvent<HTMLInputElement>,
    currentValue: number,
    setter: (value: number) => void,
    min: number = 0
  ) => {
    e.preventDefault(); // Prevent page scrolling
    
    let step = 1;
    if (e.ctrlKey) step = 10;
    if (e.shiftKey) step = 100;
    
    // Wheel delta is negative when scrolling down, positive when scrolling up
    const delta = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(min, currentValue + (delta * step));
    setter(newValue);
  };

  // Handle focus to select all content
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  if (!item) return null;

  // Button styles
  const buttonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "12px",
    backgroundColor: theme.colors.buttonDefault,
    color: theme.colors.text,
    border: "none",
    borderRadius: theme.border.radius,
    cursor: "pointer",
    fontWeight: "bold",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "30px",
  };

  // Input field styles
  const inputFieldStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: "4px 8px",
    height: "28px",
  };

  // Section container styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: `${theme.colors.dark}`,
    borderRadius: theme.border.radius,
    border: `1px solid ${theme.colors.dropdown.border}`,
    padding: "8px",
    display: "flex",
    alignItems: "center",
    height: "100%",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        backgroundColor: index % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent",
        borderRadius: theme.border.radius,
        padding: "4px",
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left section - Item info */}
      <div
        style={{
          ...sectionStyle,
          borderLeft: `4px solid ${getItemColor()}`,
          flex: 2,
          minWidth: "200px",
          position: "relative",
          zIndex: 1,
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
            {nominalRate > 0 && !isByproduct && (
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
            {recipes && recipes.length > 0 && onRecipeChange && !isByproduct && (
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
      {machine && !isByproduct && (
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
              {/* Machine count */}
              <StyledInput
                ref={machineCountRef}
                type="number"
                value={localMachineCount}
                onChange={(e) => {
                  e.stopPropagation();
                  handleMachineCountChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  handleKeyDown(
                    e,
                    localMachineCount,
                    (val) => {
                      setLocalMachineCount(val);
                      onMachineCountChange?.(val);
                    },
                    1
                  );
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                  if (document.activeElement === machineCountRef.current) {
                    handleWheel(
                      e,
                      localMachineCount,
                      (val) => {
                        setLocalMachineCount(val);
                        onMachineCountChange?.(val);
                      },
                      1
                    );
                  }
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  handleFocus(e);
                }}
                variant="compact"
                style={{
                  ...inputFieldStyle,
                  position: "relative",
                  zIndex: 2,
                  maxWidth: "40px",
                }}
                min={1}
                onClick={(e) => e.stopPropagation()}
              />

              {/* Max button */}
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: theme.colors.secondary,
                  position: "relative",
                  zIndex: 2,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptimizeMachines();
                }}
                title="Set machine count for 100% efficiency"
              >
                M
              </button>

              {/* Multiplier */}
              <StyledInput
                ref={machineMultiplierRef}
            type="number"
                value={localMachineMultiplier}
                onChange={(e) => {
                  e.stopPropagation();
                  handleMachineMultiplierChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  handleKeyDown(
                    e,
                    localMachineMultiplier,
                    (val) => {
                      setLocalMachineMultiplier(val);
                      onMachineMultiplierChange?.(val);
                    },
                    1
                  );
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                  if (document.activeElement === machineMultiplierRef.current) {
                    handleWheel(
                      e,
                      localMachineMultiplier,
                      (val) => {
                        setLocalMachineMultiplier(val);
                        onMachineMultiplierChange?.(val);
                      },
                      1
                    );
                  }
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  handleFocus(e);
                }}
                variant="compact"
                style={{
                  ...inputFieldStyle,
                  position: "relative",
                  zIndex: 2,
                  maxWidth: "40px",
                }}
                min={1}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Right section - Efficiency and rate */}
      <div
        style={{
          ...sectionStyle,
          borderLeft: `4px solid ${!isByproduct ? getEfficiencyColor() : theme.colors.nodeByproduct}`,
          flex: 1,
          minWidth: "160px",
          maxWidth: "200px",
          position: "relative",
          zIndex: 1,
          height: isByproduct ? "64px" : "auto", // Make byproduct section same height as others
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
            justifyContent: isByproduct ? "center" : "flex-start", // Center content for byproducts
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
            {!isByproduct && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    color: getEfficiencyColor(),
                    cursor: "pointer",
                    fontWeight: "bold",
                    position: "relative",
                    marginLeft: "0px",
                    zIndex: 2,
                    fontSize: "16px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyEfficiencyValue();
                  }}
                  title="Click to copy decimal value"
                >
                  {efficiency.toFixed(2)}%
                  {showEfficiencyTooltip && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        right: "0",
                        backgroundColor: theme.colors.dark,
                        padding: "4px 8px",
                        borderRadius: theme.border.radius,
                        fontSize: "12px",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                        zIndex: 10,
                      }}
                    >
                      Copied!
                    </div>
                  )}
                </span>
              </div>
            )}

            {/* Rate */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: "bold",
                color: isByproduct ? theme.colors.nodeByproduct : theme.colors.text,
                marginLeft: isByproduct ? "auto" : "4px",
                fontSize: "16px",
              }}
            >
              <span>{Math.abs(amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Second row: Excess controls */}
          {onExcessChange && !isByproduct && (
            <div
              style={{
                display: "flex",
                gap: "0px",
                alignItems: "center",
                width: "100%",
                justifyContent: "space-between",
                position: "relative",
                zIndex: 2,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                style={{
                  ...buttonStyle,
                  position: "relative",
                  zIndex: 2,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetExcess();
                }}
                title="Reset excess to zero"
              >
                R
              </button>

              <StyledInput
                ref={excessRef}
                type="number"
                value={localExcess}
                onChange={(e) => {
                  e.stopPropagation();
                  handleExcessChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  handleKeyDown(e, localExcess, (val) => {
                    setLocalExcess(val);
                    onExcessChange?.(val);
                  });
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                  if (document.activeElement === excessRef.current) {
                    handleWheel(
                      e,
                      localExcess,
                      (val) => {
                        setLocalExcess(val);
                        onExcessChange?.(val);
                      }
                    );
                  }
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  handleFocus(e);
                }}
                variant="compact"
                style={{ 
                  ...inputFieldStyle,
                  minWidth: "50px",
                  maxWidth: "120px",
                  position: "relative",
                  zIndex: 2,
                }}
                onClick={(e) => e.stopPropagation()}
              />

              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: theme.colors.secondary,
                  position: "relative",
                  zIndex: 2,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMaxExcess();
                }}
                title="Set excess for 100% efficiency"
              >
                M
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemNode;
