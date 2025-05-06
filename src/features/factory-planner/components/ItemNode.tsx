import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { Recipe, Item, DependencyNode } from "../../../types";
import { theme } from "../../../styles/theme";
import { getItemById, getMachineForRecipe } from "../../../data";
import { IconSize } from "../../../components";
import ItemNodeButtons from "../../../components/shared/ItemNodeButtons";
import ItemDetails from "../../../components/shared/ItemDetails";
import MachineDetails from "../../../components/shared/MachineDetails";
import EfficiencySection from "../../../components/shared/EfficiencySection";
import { useItemNodeCalculations } from '../hooks/useItemNodeCalculations';
import { ViewDensity } from '../hooks/usePlannerDisplayOptions';
import { toggleNodeSelected, toggleNodeCompleted } from '../store/dependencySlice';
import { RootState } from '../../../store';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import './ItemNode.css';

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
  onOptimizeAllMachines?: () => void;
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
  onOptimizeAllMachines,
}) => {
  const dispatch = useDispatch();

  const nodeData = useSelector((state: RootState) => {
    const tree = state.dependencies.dependencyTrees[treeId];
    if (!tree) return null;
    
    const findNode = (node: DependencyNode): DependencyNode | null => {
      if (node.uniqueId === uniqueId) {
        return node;
      }
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };

    return findNode(tree);
  });

  const isSelected = nodeData?.isSelected ?? false;
  const isCompleted = nodeData?.isCompleted ?? false;

  const [item, setItem] = useState<Item | null>(null);
  const [localExcess, setLocalExcess] = useState(excess);
  const [localMachineCount, setLocalMachineCount] = useState(machineCount);
  const [localMachineMultiplier, setLocalMachineMultiplier] = useState(machineMultiplier);
  const [machine, setMachine] = useState<Machine | null>(null);

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

  useEffect(() => {
    console.log(`[ItemNode ${uniqueId} (${itemId})] Calculated nominalRate: ${nominalRate}`);
  }, [nominalRate, uniqueId, itemId]);

  useEffect(() => {
    setLocalExcess(excess);
  }, [excess]);

  useEffect(() => {
    getItemById(itemId).then((item) => setItem(item || null));
  }, [itemId]);

  useEffect(() => {
    if (selectedRecipeId) {
      getMachineForRecipe(selectedRecipeId).then((machineData) => {
        console.log(`[ItemNode ${uniqueId} (${itemId})] Machine data for recipe ${selectedRecipeId}:`, machineData);
        if (machineData) {
          setMachine(machineData);
        } else {
           setMachine(null);
        }
      });
    } else {
      console.log(`[ItemNode ${uniqueId} (${itemId})] No selected recipe, setting machine to null.`);
      setMachine(null);
    }
  }, [selectedRecipeId, uniqueId, itemId]);

  useEffect(() => {
    setLocalMachineCount(machineCount);
  }, [machineCount]);

  useEffect(() => {
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
        const totalCapacity =
          localMachineCount * localMachineMultiplier * nominalRate;

        const excessNeeded = totalCapacity - amount;
        const preciseValue = Math.max(0, excessNeeded);
        
        setLocalExcess(preciseValue);
        onExcessChange?.(preciseValue);
      }
    }
  };

  const handleOptimizeMachines = () => {
    if (machine && selectedRecipeId && recipes && nominalRate > 0) {
      const recipe = recipes.find((r) => r.id === selectedRecipeId);
      if (recipe) {
        const neededAmount = amount + localExcess;
        const exactMachines = neededAmount / (nominalRate * localMachineMultiplier);

        const optimalMachines = Math.max(1, Math.ceil(exactMachines)); 

        setLocalMachineCount(optimalMachines);
        onMachineCountChange?.(optimalMachines);
      } else {
         console.warn('[Optimize Error] Recipe not found inside if block.');
      }
    } else {
      console.warn('[Optimize Check Fail] Condition not met.');
    }
  };

  if (!item || !nodeData) return null;

  const densityClass = `item-node--${viewDensity}`;

  const handleToggleSelected = () => {
      dispatch(toggleNodeSelected({ treeId, nodeId: uniqueId }));
  };

  const handleToggleCompleted = () => {
      dispatch(toggleNodeCompleted({ treeId, nodeId: uniqueId }));
  };

   return (
    <div
      className={`item-node ${densityClass}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "8px 2px",
        borderRadius: theme.border.radius,
        position: 'relative',
        ...style,
      }}
    >
      <ItemNodeButtons
        isRoot={isRoot}
        isImport={isImport}
        itemId={uniqueId}
        onDelete={onDelete}
        onImport={onImport}
        onUnimport={onUnimport}
      />

      <div
        className="item-section-container"
        style={{
          display: "flex",
          gap: "4px",
          backgroundColor: index % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent",
          borderRadius: theme.border.radius,
          padding: "4px",
          flexGrow: 1,
          overflow: "hidden",
          minWidth: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
          viewDensity={viewDensity}
        />

        {machine && !isByproduct && !isImport && showMachines && (
          <div 
             className={`machine-details-wrapper ${!showMachineMultiplier ? 'no-multiplier' : ''}`.trim()}
          >
            <MachineDetails
              machine={machine}
              machineCount={localMachineCount}
              onMachineCountChange={onMachineCountChange || (() => {}) }
              machineMultiplier={localMachineMultiplier}
              onMachineMultiplierChange={onMachineMultiplierChange}
              showMachineMultiplier={showMachineMultiplier}
              onOptimizeMachines={handleOptimizeMachines}
              onOptimizeAllMachines={onOptimizeAllMachines}
              size={size}
            />
          </div>
        )}

        <EfficiencySection
          efficiency={efficiency}
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
          containerStyle={{
             borderLeft: `4px solid ${getEfficiencyColor()}` 
          }}
        />
      </div>

      <div className="item-node-status-buttons">
          <button
              className={`status-button status-button--select ${isSelected ? 'active' : ''}`}
              onClick={handleToggleSelected}
              title={isSelected ? "Unmark as Selected" : "Mark as Selected"}
          >
              {isSelected ? <BookmarkAddedIcon fontSize="inherit" /> : <BookmarkAddOutlinedIcon fontSize="inherit" />}
          </button>
          <button
              className={`status-button status-button--complete ${isCompleted ? 'active' : ''}`}
              onClick={handleToggleCompleted}
              title={isCompleted ? "Unmark as Completed" : "Mark as Completed"}
          >
              {isCompleted ? <TaskAltIcon fontSize="inherit" /> : <TaskAltOutlinedIcon fontSize="inherit" />}
          </button>
      </div>
    </div>
  );
};

export default ItemNode;
