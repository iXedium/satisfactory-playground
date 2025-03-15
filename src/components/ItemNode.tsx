import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (machine && selectedRecipeId && recipes) {
      const recipe = recipes.find(r => r.id === selectedRecipeId);
      if (recipe) {
        const outputAmount = recipe.out[itemId] || 1;
        const cyclesPerMinute = 60 / recipe.time;
        const itemsPerMinute = outputAmount * cyclesPerMinute;
        
        const totalMachineCapacity = localMachineCount * localMachineMultiplier * machine.speed * itemsPerMinute;
        
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
    if (efficiency > 100) return theme.colors.nodeByproduct;
    if (efficiency < 100) return '#CCAA00';
    return theme.colors.nodeRoot;
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

  const handleOptimizeMachines = () => {
    if (machine && selectedRecipeId && recipes) {
      const recipe = recipes.find(r => r.id === selectedRecipeId);
      if (recipe) {
        const outputAmount = recipe.out[itemId] || 1;
        const cyclesPerMinute = 60 / recipe.time;
        const itemsPerMinute = outputAmount * cyclesPerMinute;
        
        const neededAmount = amount + localExcess;
        const optimalMachines = Math.ceil(neededAmount / (itemsPerMinute * machine.speed * localMachineMultiplier));
        
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

  if (!item) return null;

  const baseStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gridTemplateAreas: `
      "icon content rates"
    `,
    gap: '12px',
    padding: '8px 12px',
    color: getItemColor(),
    backgroundColor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: theme.border.radius,
    ...style
  };

  const buttonStyle: React.CSSProperties = {
    padding: '2px 6px',
    fontSize: '12px',
    backgroundColor: theme.colors.dark,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    cursor: 'pointer',
    marginLeft: '4px'
  };

  return (
    <div style={baseStyles}>
      <div 
        style={{ 
          gridArea: 'icon',
          cursor: onIconClick ? 'pointer' : 'default',
          pointerEvents: 'auto'
        }}
        onClick={onIconClick}
      >
        <Icon itemId={itemId} size={size} style={{ backgroundColor: theme.colors.dark }} />
      </div>

      <div style={{ 
        gridArea: 'content',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'auto'
      }}>
        <span>{item.name}</span>
        {recipes && recipes.length > 0 && onRecipeChange && (
          <StyledSelect
            value={selectedRecipeId || ''}
            onChange={onRecipeChange}
            options={recipes}
            variant="compact"
            style={{ width: '200px' }}
          />
        )}
        
        {machine && !isByproduct && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>Machines:</span>
              <StyledInput
                type="number"
                value={localMachineCount}
                onChange={(e) => handleMachineCountChange(e.target.value)}
                variant="compact"
                style={{ width: '60px', marginLeft: '4px' }}
                min={1}
              />
              <button 
                style={buttonStyle}
                onClick={handleOptimizeMachines}
                title="Set machine count for 100% efficiency"
              >
                Max
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>Multiplier:</span>
              <StyledInput
                type="number"
                value={localMachineMultiplier}
                onChange={(e) => handleMachineMultiplierChange(e.target.value)}
                variant="compact"
                style={{ width: '60px', marginLeft: '4px' }}
                min={1}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative'
            }}>
              <span>Efficiency:</span>
              <span 
                style={{ 
                  marginLeft: '4px', 
                  color: getEfficiencyColor(),
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={copyEfficiencyValue}
                title="Click to copy decimal value"
              >
                {efficiency.toFixed(2)}%
              </span>
              {showEfficiencyTooltip && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: theme.colors.dark,
                  padding: '4px 8px',
                  borderRadius: theme.border.radius,
                  fontSize: '12px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  zIndex: 10
                }}>
                  Copied!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        gridArea: 'rates',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: 'flex-end',
        pointerEvents: 'auto'
      }}>
        <span>{amount.toFixed(2)}/min</span>
        {onExcessChange && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', marginRight: '4px' }}>Excess:</span>
            <StyledInput
              type="number"
              value={localExcess}
              onChange={(e) => handleExcessChange(e.target.value)}
              variant="compact"
              style={{ width: '80px' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              style={buttonStyle}
              onClick={handleResetExcess}
              title="Reset excess to zero"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemNode;
