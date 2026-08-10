import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { Recipe, Item, DependencyNode, NodeComparisonResult, NodeSnapshot } from "../../../types";
import { theme } from "../../../styles/theme";
import { getItemById, getMachineForRecipe } from "../../../data";
import { IconSize } from "../../../components";
import ItemNodeButtons from "../../../components/shared/ItemNodeButtons";
import ItemDetails from "../../../components/shared/ItemDetails";
import MachineDetails from "../../../components/shared/MachineDetails";
import EfficiencySection from "../../../components/shared/EfficiencySection";
import { useItemNodeCalculations } from '../hooks/useItemNodeCalculations';
import { ViewDensity } from '../hooks/usePlannerDisplayOptions';
import { toggleNodeSelected, toggleNodeCompleted, toggleNodeHidden, setHighlightedNode } from '../store/dependencySlice';
import { selectActiveSnapshot, selectShowComparison } from '../store/comparisonSlice';
import { setImportAmountThunk, resetImportAmountThunk, maxImportAmountThunk } from '../store/importExportLogic';
import { RootState, AppDispatch } from '../../../store';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { logger } from '../../../utils/logger';
import './ItemNode.css';

interface ItemNodeProps {
  itemId: string;
  amount: number;
  uniqueId: string;
  treeId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  isImport?: boolean;
  parentNodeId?: string;         // Parent node ID (for import controls)
  hasMultipleImportSources?: boolean;  // True if multiple sources for same item
  importSourceRecipeName?: string;     // Recipe name of the source being imported from
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
  onDeleteAllTrees?: () => void;
  onToggleAllHidden?: (targetHidden: boolean) => void;
  onResetAllExcess?: () => void;
  onMaxAllExcess?: () => void;
  onToggleAllSelected?: (targetSelected: boolean) => void;
  onToggleAllCompleted?: (targetCompleted: boolean) => void;
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
  parentNodeId,
  hasMultipleImportSources = false,
  importSourceRecipeName,
  recipes = [],
  selectedRecipeId,
  onRecipeChange,
  size = "small",
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
  onDeleteAllTrees,
  onToggleAllHidden,
  onResetAllExcess,
  onMaxAllExcess,
  onToggleAllSelected,
  onToggleAllCompleted,
}) => {
  const dispatch = useDispatch<AppDispatch>();

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
  const isExternal = nodeData?.isExternal ?? false;

  // Comparison state - get from Redux
  const showComparison = useSelector(selectShowComparison);
  const activeSnapshot = useSelector(selectActiveSnapshot);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);

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

  // Calculate comparison result
  const comparisonResult: NodeComparisonResult = useMemo(() => {
    // Skip for byproducts and imports - they don't have their own production metrics
    if (isByproduct || isImport || !showComparison || !activeSnapshot) {
      return {
        hasSnapshot: false,
        changes: {
          machineCount: 'unchanged',
          machineMultiplier: 'unchanged',
          excess: 'unchanged',
          amount: 'unchanged',
          efficiency: 'unchanged',
          recipe: 'unchanged',
          isNew: false,
          isRemoved: false,
        },
      };
    }

    const treeSnapshot = activeSnapshot.trees[treeId];
    if (!treeSnapshot) {
      return {
        hasSnapshot: true,
        changes: {
          machineCount: 'unchanged',
          machineMultiplier: 'unchanged',
          excess: 'unchanged',
          amount: 'unchanged',
          efficiency: 'unchanged',
          recipe: 'unchanged',
          isNew: true,
          isRemoved: false,
        },
      };
    }

    const nodeSnapshot = treeSnapshot.nodes[uniqueId];
    if (!nodeSnapshot) {
      return {
        hasSnapshot: true,
        changes: {
          machineCount: 'unchanged',
          machineMultiplier: 'unchanged',
          excess: 'unchanged',
          amount: 'unchanged',
          efficiency: 'unchanged',
          recipe: 'unchanged',
          isNew: true,
          isRemoved: false,
        },
      };
    }

    // Helper to compare values
    const compare = (current: number, snapshot: number): 'increased' | 'decreased' | 'unchanged' => {
      if (current > snapshot) return 'increased';
      if (current < snapshot) return 'decreased';
      return 'unchanged';
    };

    // Get current recipe from selections or node data
    const currentRecipeId = recipeSelections[uniqueId] || selectedRecipeId;

    return {
      hasSnapshot: true,
      snapshotValues: nodeSnapshot,
      changes: {
        machineCount: compare(localMachineCount, nodeSnapshot.machineCount),
        machineMultiplier: compare(localMachineMultiplier, nodeSnapshot.machineMultiplier),
        excess: compare(localExcess, nodeSnapshot.excess),
        amount: compare(amount, nodeSnapshot.amount),
        efficiency: compare(efficiency, nodeSnapshot.efficiency || 0),
        recipe: currentRecipeId !== nodeSnapshot.recipeId ? 'changed' : 'unchanged',
        isNew: false,
        isRemoved: false,
      },
    };
  }, [showComparison, activeSnapshot, treeId, uniqueId, isByproduct, isImport, 
      localMachineCount, localMachineMultiplier, localExcess, amount, efficiency, 
      recipeSelections, selectedRecipeId]);

  useEffect(() => {
    logger.verbose(`[ItemNode ${uniqueId} (${itemId})] Calculated nominalRate: ${nominalRate}`);
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
        logger.verbose(`[ItemNode ${uniqueId} (${itemId})] Machine data for recipe ${selectedRecipeId}:`, machineData);
        if (machineData) {
          setMachine(machineData);
        } else {
           setMachine(null);
        }
      });
    } else {
      logger.verbose(`[ItemNode ${uniqueId} (${itemId})] No selected recipe, setting machine to null.`);
      setMachine(null);
    }
  }, [selectedRecipeId, uniqueId, itemId]);

  useEffect(() => {
    setLocalMachineCount(machineCount);
  }, [machineCount]);

  useEffect(() => {
    setLocalMachineMultiplier(machineMultiplier); 
  }, [machineMultiplier]);

  // Get import reference for highlighting source node on hover
  const importTargetId = nodeData?.importReference?.targetTreeId || nodeData?.importedFrom || null;
  
  // Handle mouse enter/leave for import nodes to highlight source
  const handleImportMouseEnter = useCallback(() => {
    if (isImport && importTargetId) {
      dispatch(setHighlightedNode(importTargetId));
    }
  }, [isImport, importTargetId, dispatch]);
  
  const handleImportMouseLeave = useCallback(() => {
    if (isImport && importTargetId) {
      dispatch(setHighlightedNode(null));
    }
  }, [isImport, importTargetId, dispatch]);

  // Handle click on import node to scroll to source and highlight it
  const handleImportClick = useCallback(() => {
    if (!isImport || !importTargetId) return;
    
    // Find the source node element using data-node-id attribute
    const sourceElement = document.querySelector(`[data-node-id="${importTargetId}"]`);
    if (sourceElement) {
      // Scroll to the element smoothly
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the source for a moment
      dispatch(setHighlightedNode(importTargetId));
      
      // Clear the highlight after 1.5 seconds
      setTimeout(() => {
        dispatch(setHighlightedNode(null));
      }, 1500);
    }
  }, [isImport, importTargetId, dispatch]);

  // Import amount control handlers for multi-source imports
  const handleImportAmountChange = useCallback((newAmount: number) => {
    if (!parentNodeId || !isImport) return;
    dispatch(setImportAmountThunk({
      treeId,
      importNodeId: uniqueId,
      parentNodeId,
      newAmount
    }));
  }, [dispatch, treeId, uniqueId, parentNodeId, isImport]);

  const handleResetImportAmount = useCallback(() => {
    if (!parentNodeId || !isImport) return;
    dispatch(resetImportAmountThunk({
      treeId,
      importNodeId: uniqueId,
      parentNodeId
    }));
  }, [dispatch, treeId, uniqueId, parentNodeId, isImport]);

  const handleMaxImportAmount = useCallback(() => {
    if (!parentNodeId || !isImport) return;
    // Machine counts are now synced to Redux, thunk reads directly from node
    dispatch(maxImportAmountThunk({
      treeId,
      importNodeId: uniqueId,
      parentNodeId
    }));
  }, [dispatch, treeId, uniqueId, parentNodeId, isImport]);

  // Handle toggling hidden state for root nodes
  const handleToggleHidden = useCallback(() => {
    dispatch(toggleNodeHidden({ treeId, nodeId: uniqueId }));
  }, [dispatch, treeId, uniqueId]);

  const getItemColor = () => {
    if (isRoot) return theme.colors.nodeRoot;
    if (isByproduct) return theme.colors.nodeByproduct;
    if (isExternal) return theme.colors.nodeExternalImport;
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
         logger.warn('[Optimize Error] Recipe not found inside if block.');
      }
    } else {
      logger.debug('[Optimize Check Fail] Condition not met.');
    }
  };

  if (!item || !nodeData) return null;

  const densityClass = `item-node--${viewDensity}`;

  const handleToggleSelected = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e?.shiftKey && onToggleAllSelected) {
      // Shift+Click: toggle this node and set all nodes to the result (single undo)
      onToggleAllSelected(!isSelected);
      return;
    }
    dispatch(toggleNodeSelected({ treeId, nodeId: uniqueId }));
  };

  const handleToggleCompleted = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e?.shiftKey && onToggleAllCompleted) {
      // Shift+Click: toggle this node and set all nodes to the result (single undo)
      onToggleAllCompleted(!isCompleted);
      return;
    }
    dispatch(toggleNodeCompleted({ treeId, nodeId: uniqueId }));
  };

   return (
    <div
      className={`item-node ${densityClass}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0px",
        padding: "2px 0px",
        borderRadius: theme.border.radius,
        position: 'relative',
        cursor: isImport ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={isImport ? handleImportMouseEnter : undefined}
      onMouseLeave={isImport ? handleImportMouseLeave : undefined}
      onClick={isImport ? handleImportClick : undefined}
    >
      {/* Main content row */}
      <div className="item-node-main-row">
        <ItemNodeButtons
          isRoot={isRoot}
          isImport={isImport}
          isHidden={nodeData?.isHidden}
          itemId={uniqueId}
          onDelete={onDelete}
          onDeleteAll={onDeleteAllTrees}
          onImport={onImport}
          onUnimport={onUnimport}
          onToggleHidden={isRoot ? handleToggleHidden : undefined}
          onToggleHiddenAll={isRoot && onToggleAllHidden ? onToggleAllHidden : undefined}
        />

        <div
          className="item-section-container"
          style={{
            display: "flex",
            gap: "4px",
            backgroundColor: index % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent",
            borderRadius: theme.border.radius,
            // padding: "4px",
            flexGrow: 1,
            overflow: "hidden",
            minWidth: 0,
            cursor: isImport ? 'pointer' : undefined,
          }}
          onClick={(e) => {
            e.stopPropagation();
            // For imports, clicking anywhere in the container should scroll to source
            if (isImport) {
              handleImportClick();
            }
          }}
        >
          <ItemDetails
            item={item}
            itemId={itemId}
            amount={amount}
            size={size}
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            onRecipeChange={onRecipeChange}
            onIconClick={isImport ? handleImportClick : onIconClick}
            nominalRate={nominalRate}
            isByproduct={isByproduct}
            isImport={isImport}
            importSourceRecipeName={importSourceRecipeName}
            getItemColor={getItemColor}
            viewDensity={viewDensity}
          />

          {machine && !isByproduct && !isImport && !isExternal && showMachines && (
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
                showBaseline={showComparison && comparisonResult.hasSnapshot}
                baselineValues={comparisonResult.snapshotValues ? {
                  machineCount: comparisonResult.snapshotValues.machineCount,
                  machineMultiplier: comparisonResult.snapshotValues.machineMultiplier,
                } : null}
                changes={{
                  machineCount: comparisonResult.changes.machineCount,
                  machineMultiplier: comparisonResult.changes.machineMultiplier,
                }}
                isNew={comparisonResult.changes.isNew}
              />
            </div>
          )}

          <EfficiencySection
            efficiency={efficiency}
            amount={amount}
            isByproduct={isByproduct}
            isImport={isImport}
            isExternal={isExternal}
            parentNodeId={parentNodeId}
            hasMultipleImportSources={hasMultipleImportSources}
            excess={localExcess}
            nodeId={uniqueId}
            treeId={treeId}
            itemName={item?.name ?? itemId}
            onExcessChange={onExcessChange ? handleExcessChange : undefined}
            onMaxExcess={onExcessChange ? handleMaxExcess : undefined}
            onResetExcess={onExcessChange ? handleResetExcess : undefined}
            onMaxExcessAll={onMaxAllExcess}
            onResetExcessAll={onResetAllExcess}
            onImportAmountChange={isImport && hasMultipleImportSources ? handleImportAmountChange : undefined}
            onMaxImport={isImport && hasMultipleImportSources ? handleMaxImportAmount : undefined}
            onResetImport={isImport && hasMultipleImportSources ? handleResetImportAmount : undefined}
            containerStyle={{
               borderLeft: `4px solid ${getEfficiencyColor()}` 
            }}
            showBaseline={showComparison && comparisonResult.hasSnapshot}
            baselineValues={comparisonResult.snapshotValues ? {
              excess: comparisonResult.snapshotValues.excess,
              amount: comparisonResult.snapshotValues.amount,
              efficiency: comparisonResult.snapshotValues.efficiency/100.0,
            } : null}
            changes={{
              excess: comparisonResult.changes.excess,
              amount: comparisonResult.changes.amount,
              efficiency: comparisonResult.changes.efficiency,
            }}
            isNew={comparisonResult.changes.isNew}
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
    </div>
  );
};

export default ItemNode;
