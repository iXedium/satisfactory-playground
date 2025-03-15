import React, { useEffect, useState, useRef } from 'react';
import Icon, { IconSize } from './Icon';
import { Recipe, Item } from '../data/dexieDB';
import { theme } from '../styles/theme';
import { getItemById, getMachineForRecipe } from "../data/dbQueries";
import StyledSelect from './shared/StyledSelect';
import StyledInput from './shared/StyledInput';

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
  onMachineMultiplierChange
}) => {
  const [item, setItem] = useState<Item | null>(null);
  const [localExcess, setLocalExcess] = useState(excess);
  const [localMachineCount, setLocalMachineCount] = useState(machineCount);
  const [localMachineMultiplier, setLocalMachineMultiplier] = useState(machineMultiplier);
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
    getItemById(itemId).then(item => setItem(item || null));
  }, [itemId]);

  useEffect(() => {
    if (selectedRecipeId) {
      getMachineForRecipe(selectedRecipeId).then(machineData => {
        if (machineData) {
          setMachine(machineData);
        }
      });
    }
  }, [selectedRecipeId]);

  // Calculate efficiency and nominal rate whenever relevant values change
  useEffect(() => {
    if (machine && selectedRecipeId && recipes) {
      const recipe = recipes.find(r => r.id === selectedRecipeId);
      if (recipe) {
        const outputAmount = recipe.out[itemId] || 1;
        const cyclesPerMinute = 60 / recipe.time;
        const itemsPerMinute = outputAmount * cyclesPerMinute;
        
        // Calculate nominal production rate (per machine)
        const nominalRatePerMachine = itemsPerMinute * machine.speed;
        setNominalRate(nominalRatePerMachine);
        
        // Calculate total production capacity with all machines
        const totalMachineCapacity = localMachineCount * localMachineMultiplier * nominalRatePerMachine;
        
        // Calculate efficiency (actual needed / total capacity)
        const neededAmount = amount + localExcess;
        const newEfficiency = (neededAmount / totalMachineCapacity) * 100;
        setEfficiency(Math.round(newEfficiency * 100) / 100);
      }
    }
  }, [amount, localExcess, localMachineCount, localMachineMultiplier, machine, selectedRecipeId, recipes, itemId]);

  const getItemColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    return theme.colors.nodeDefault;
  };

  const getEfficiencyColor = () => {
    if (efficiency > 100) return theme.colors.nodeByproduct; // Red for over 100%
    if (efficiency < 100) return '#CCAA00'; // Yellow for under 100%
    return theme.colors.nodeRoot; // Green for exactly 100%
  };

  const handleExcessChange = (value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setLocalExcess(numValue);
    onExcessChange?.(numValue);
  };

  const handleMachineCountChange = (value: string) => {
    const numValue = Math.max(1, value === '' ? 1 : Math.floor(Number(value)));
    setLocalMachineCount(numValue);
    onMachineCountChange?.(numValue);
  };

  const handleMachineMultiplierChange = (value: string) => {
    const numValue = Math.max(1, value === '' ? 1 : Math.floor(Number(value)));
    setLocalMachineMultiplier(numValue);
    onMachineMultiplierChange?.(numValue);
  };

  const handleResetExcess = () => {
    setLocalExcess(0);
    onExcessChange?.(0);
  };

  const handleMaxExcess = () => {
    if (machine && selectedRecipeId && recipes) {
      const recipe = recipes.find(r => r.id === selectedRecipeId);
      if (recipe) {
        // Calculate the total production capacity
        const totalCapacity = localMachineCount * localMachineMultiplier * nominalRate;
        
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
      const recipe = recipes.find(r => r.id === selectedRecipeId);
      if (recipe) {
        // Calculate optimal machine count for 100% efficiency
        const neededAmount = amount + localExcess;
        const optimalMachines = Math.ceil(neededAmount / (nominalRate * localMachineMultiplier));
        
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

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.max(min, currentValue + step);
      setter(newValue);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(min, currentValue - step);
      setter(newValue);
    }
  };

  // Handle focus to select all content
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  if (!item) return null;

  // Button styles
  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: theme.colors.buttonDefault,
    color: theme.colors.text,
    border: 'none',
    borderRadius: theme.border.radius,
    cursor: 'pointer',
    fontWeight: 'bold',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '50px',
  };

  // Input field styles
  const inputFieldStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: '4px 8px',
    width: '60px',
    height: '28px',
  };

  // Section container styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: `${theme.colors.dark}`,
    borderRadius: theme.border.radius,
    border: `1px solid ${theme.colors.dropdown.border}`,
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  };

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
      backgroundColor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
      borderRadius: theme.border.radius,
      padding: '8px',
      ...style
    }}>
      {/* Left section - Item info */}
      <div style={{
        ...sectionStyle,
        borderLeft: `4px solid ${getItemColor()}`,
        flex: 2,
        minWidth: '300px',
      }}>
        {/* Item icon */}
        <div 
          style={{ 
            cursor: onIconClick ? 'pointer' : 'default',
            marginRight: '8px',
            alignSelf: 'flex-start',
          }}
          onClick={onIconClick}
        >
          <Icon itemId={itemId} size={size} />
        </div>
        
        {/* Item info and recipe */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1,
          justifyContent: 'space-between',
          height: '100%',
        }}>
          {/* Item name and nominal rate */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold',
            color: getItemColor(),
          }}>
            <span>{item.name}</span>
            {nominalRate > 0 && (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>
                {nominalRate.toFixed(2)}/min
              </span>
            )}
          </div>
          
          {/* Recipe selector - aligned to bottom */}
          <div style={{ marginTop: 'auto' }}>
            {recipes && recipes.length > 0 && onRecipeChange && (
              <StyledSelect
                value={selectedRecipeId || ''}
                onChange={onRecipeChange}
                options={recipes}
                variant="compact"
                style={{ width: '100%' }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Middle section - Machine info */}
      {machine && !isByproduct && (
        <div style={{
          ...sectionStyle,
          borderLeft: `4px solid ${theme.colors.secondary}`,
          flex: 1,
          minWidth: '250px',
        }}>
          {/* Machine icon - same size as item icon */}
          <div style={{ marginRight: '8px' }}>
            <Icon itemId={machine.id} size={size} />
          </div>
          
          {/* Machine details in column layout */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            flex: 1,
            gap: '4px',
          }}>
            {/* Machine name */}
            <div style={{ 
              fontWeight: 'bold', 
              color: theme.colors.secondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {machine.name}
            </div>
            
            {/* Machine controls in row */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
            }}>
              {/* Machine count */}
              <StyledInput
                ref={machineCountRef}
                type="number"
                value={localMachineCount}
                onChange={(e) => handleMachineCountChange(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, localMachineCount, (val) => {
                  setLocalMachineCount(val);
                  onMachineCountChange?.(val);
                }, 1)}
                onFocus={handleFocus}
                variant="compact"
                style={inputFieldStyle}
                min={1}
              />
              
              {/* Max button */}
              <button 
                style={{
                  ...buttonStyle,
                  backgroundColor: theme.colors.secondary,
                }}
                onClick={handleOptimizeMachines}
                title="Set machine count for 100% efficiency"
              >
                MAX
              </button>
              
              {/* Multiplier */}
              <StyledInput
                ref={machineMultiplierRef}
                type="number"
                value={localMachineMultiplier}
                onChange={(e) => handleMachineMultiplierChange(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, localMachineMultiplier, (val) => {
                  setLocalMachineMultiplier(val);
                  onMachineMultiplierChange?.(val);
                }, 1)}
                onFocus={handleFocus}
                variant="compact"
                style={inputFieldStyle}
                min={1}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Right section - Efficiency and rate */}
      <div style={{
        ...sectionStyle,
        borderLeft: `4px solid ${getEfficiencyColor()}`,
        flex: 1,
        minWidth: '250px',
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          gap: '8px',
        }}>
          {/* First row: Efficiency and Rate */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}>
            {/* Efficiency */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
            }}>
              <span>Efficiency:</span>
              <span 
                style={{ 
                  color: getEfficiencyColor(),
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  position: 'relative',
                  marginLeft: '4px',
                }}
                onClick={copyEfficiencyValue}
                title="Click to copy decimal value"
              >
                {efficiency.toFixed(2)}%
                {showEfficiencyTooltip && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: '0',
                    backgroundColor: theme.colors.dark,
                    padding: '4px 8px',
                    borderRadius: theme.border.radius,
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    zIndex: 10,
                  }}>
                    Copied!
                  </div>
                )}
              </span>
            </div>
            
            {/* Rate */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              fontWeight: 'bold',
            }}>
              <span>Rate:</span>
              <span style={{ marginLeft: '4px' }}>{amount.toFixed(2)}/min</span>
            </div>
          </div>
          
          {/* Second row: Excess controls */}
          {onExcessChange && (
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              width: '100%',
              justifyContent: 'space-between',
            }}>
              <button 
                style={buttonStyle}
                onClick={handleResetExcess}
                title="Reset excess to zero"
              >
                RESET
              </button>
              
              <StyledInput
                ref={excessRef}
                type="number"
                value={localExcess}
                onChange={(e) => handleExcessChange(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, localExcess, (val) => {
                  setLocalExcess(val);
                  onExcessChange?.(val);
                })}
                onFocus={handleFocus}
                variant="compact"
                style={{ ...inputFieldStyle, width: '80px' }}
                onClick={(e) => e.stopPropagation()}
              />
              
              <button 
                style={{
                  ...buttonStyle,
                  backgroundColor: theme.colors.secondary,
                }}
                onClick={handleMaxExcess}
                title="Set excess for 100% efficiency"
              >
                MAX
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemNode;
