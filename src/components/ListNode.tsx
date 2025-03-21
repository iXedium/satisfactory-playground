import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import ItemNode from "./ItemNode";
import Icon from "./Icon";
import { theme } from "../styles/theme";
import { Recipe, Item } from "../data/dexieDB";
import { getItemById } from "../data/dbQueries";
import { DependencyNode } from "../utils/calculateDependencyTree";

interface ConsumptionDetail {
  itemId: string;
  amount: number;
  nodeId: string;
  itemName?: string;
}

interface AccumulatedConsumption {
  itemId: string;
  itemName?: string;
  totalAmount: number;
  nodeIds: string[];
  consumers?: Array<{
    nodeId: string;
    amount: number;
  }>;
}

interface ListNodeProps {
  itemId: string;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
  recipes?: Recipe[];
  selectedRecipeId?: string;
  onRecipeChange?: (recipeId: string) => void;
  excess?: number;
  onExcessChange?: (excess: number) => void;
  index?: number;
  machineCount?: number;
  onMachineCountChange?: (count: number) => void;
  machineMultiplier?: number;
  onMachineMultiplierChange?: (multiplier: number) => void;
  onConsumerClick?: (nodeId: string) => void;
  showExtensions?: boolean;
  accumulateExtensions?: boolean;
  showMachines?: boolean;
  showMachineMultiplier?: boolean;
  onDelete?: (nodeId: string) => void;
  onImport?: (nodeId: string) => void;
  isImport?: boolean;
  nodeExtensionOverrides?: Record<string, boolean>;
  onToggleNodeExtensions?: (nodeId: string) => void;
}

const ListNode: React.FC<ListNodeProps> = ({
  itemId,
  amount,
  isRoot = false,
  isByproduct = false,
  recipes: propsRecipes,
  selectedRecipeId,
  onRecipeChange,
  excess = 0,
  onExcessChange,
  index = 0,
  machineCount = 1,
  onMachineCountChange,
  machineMultiplier = 1,
  onMachineMultiplierChange,
  onConsumerClick,
  showExtensions = true,
  accumulateExtensions = false,
  showMachines = true,
  showMachineMultiplier = false,
  onDelete,
  onImport,
  isImport,
  nodeExtensionOverrides,
  onToggleNodeExtensions,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [item, setItem] = useState<Item | null>(null);
  const [consumers, setConsumers] = useState<ConsumptionDetail[]>([]);
  const [accumulatedConsumers, setAccumulatedConsumers] = useState<AccumulatedConsumption[]>([]);
  const recipes = useSelector((state: RootState) => state.recipeSelections.selections);
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Update expanded state when showExtensions changes
  useEffect(() => {
    // If this node has an override, use that instead of the global setting
    const nodeOverride = nodeExtensionOverrides?.[itemId];
    setExpanded(nodeOverride !== undefined ? nodeOverride : showExtensions);
  }, [showExtensions, itemId, nodeExtensionOverrides]);

  // Fetch item data
  useEffect(() => {
    getItemById(itemId).then((item) => setItem(item || null));
  }, [itemId]);

  // Calculate consumption details
  useEffect(() => {
    if (!dependencies.dependencyTrees || Object.keys(dependencies.dependencyTrees).length === 0) return;

    const findConsumers = async (node: DependencyNode, consumers: ConsumptionDetail[] = []) => {
      if (node.children) {
        for (const child of node.children) {
          if (child.id === itemId) {
            const item = await getItemById(node.id);
            
            consumers.push({
              itemId: node.id,
              amount: child.amount,
              nodeId: child.uniqueId,
              itemName: item?.name
            });
          }
          
          // Don't search in byproducts (since they don't consume anything)
          if (!child.isByproduct) {
            await findConsumers(child, consumers);
          }
        }
      }
      
      return consumers;
    };

    // We need to search in all trees
    const allPromises = [];
    for (const treeId in dependencies.dependencyTrees) {
      allPromises.push(findConsumers(dependencies.dependencyTrees[treeId]));
    }

    Promise.all(allPromises).then(consumersArrays => {
      // Combine all consumer arrays
      const allConsumers = consumersArrays.flat();
      setConsumers(allConsumers);
      
      // Group consumers by item ID for the condensed view
      const accumulated: Record<string, AccumulatedConsumption> = {};
      
      // First pass: collect all consumers by item type
      allConsumers.forEach(consumer => {
        if (!accumulated[consumer.itemId]) {
          accumulated[consumer.itemId] = {
            itemId: consumer.itemId,
            itemName: consumer.itemName || 'Unknown',
            totalAmount: 0,
            nodeIds: [],
            consumers: []
          };
        }
        
        accumulated[consumer.itemId].totalAmount += consumer.amount;
        accumulated[consumer.itemId].nodeIds.push(consumer.nodeId);
        accumulated[consumer.itemId].consumers?.push({
          nodeId: consumer.nodeId,
          amount: consumer.amount
        });
      });
      
      // Convert to array
      setAccumulatedConsumers(Object.values(accumulated));
    });
  }, [dependencies.dependencyTrees, itemId, accumulateExtensions]);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (!item) return null;

  // Determine which consumers to display
  const displayConsumers = accumulateExtensions ? accumulatedConsumers : consumers;
  const hasConsumers = displayConsumers.length > 0;

  return (
    <div ref={nodeRef} style={{ position: "relative" }}>
      {/* Main item node */}
      <div style={{ marginBottom: hasConsumers ? "4px" : "0" }}>
        <ItemNode
          itemId={itemId}
          amount={amount}
          isRoot={isRoot}
          isByproduct={isByproduct}
          isImport={isImport}
          recipes={propsRecipes || []}
          selectedRecipeId={selectedRecipeId}
          onRecipeChange={onRecipeChange}
          excess={excess}
          onExcessChange={onExcessChange}
          index={index}
          machineCount={machineCount}
          onMachineCountChange={onMachineCountChange}
          machineMultiplier={machineMultiplier}
          onMachineMultiplierChange={onMachineMultiplierChange}
          showMachines={showMachines}
          showMachineMultiplier={showMachineMultiplier}
          onIconClick={() => {
            // If we have a toggle handler, use it
            if (onToggleNodeExtensions) {
              onToggleNodeExtensions(itemId);
            }
          }}
          onDelete={isRoot && onDelete ? () => {
            // Find tree ID for this root node
            for (const treeId in dependencies.dependencyTrees) {
              if (dependencies.dependencyTrees[treeId].uniqueId === itemId) {
                onDelete(treeId);
                break;
              }
            }
          } : undefined}
          onImport={!isRoot && onImport ? onImport : undefined}
        />
      </div>

      {/* Expandable indicator */}
      {hasConsumers && (
        <div 
          onClick={toggleExpanded}
          style={{ 
            cursor: "pointer",
            borderBottom: `3px solid ${theme.colors.dropdown.border}`,
            marginLeft: "12px",
            marginTop: "-4px",
            marginBottom: expanded ? "8px" : "8px",
            width: "90%",
            transition: "all 0.2s ease"
          }}
        />
      )}

      {/* Consumption details section */}
      {expanded && hasConsumers && (
        <div style={{ 
          marginLeft: "16px",
          backgroundColor: theme.colors.dark,
          borderRadius: theme.border.radius,
          border: `1px solid ${theme.colors.dropdown.border}`,
          overflow: "hidden",
          marginBottom: "8px"
        }}>
          {accumulateExtensions ? (
            // Accumulated view
            accumulatedConsumers.map((consumer, idx) => (
              <div 
                key={`${consumer.itemId}-${idx}`}
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  padding: "6px 4px",
                  backgroundColor: idx % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent",
                  cursor: consumer.nodeIds.length === 1 ? "pointer" : "default",
                  transition: "background-color 0.2s"
                }}
                onClick={() => {
                  // If there's only one node, we can navigate to it
                  if (consumer.nodeIds.length === 1) {
                    onConsumerClick?.(consumer.nodeIds[0]);
                  }
                }}
                onMouseEnter={(e) => {
                  if (consumer.nodeIds.length === 1) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 122, 0, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (consumer.nodeIds.length === 1) {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Icon itemId={consumer.itemId} size="small" />
                  <span style={{ marginLeft: "8px", color: theme.colors.text }}>
                    {consumer.itemName || consumer.itemId}
                    {consumer.nodeIds.length > 1 && (
                      <span style={{ 
                        fontSize: "12px", 
                        opacity: 0.7, 
                        marginLeft: "6px" 
                      }}>
                        ({consumer.nodeIds.length} instances)
                      </span>
                    )}
                  </span>
                </div>
                <span style={{ color: theme.colors.text }}>
                  {consumer.totalAmount.toFixed(2)}/min
                </span>
              </div>
            ))
          ) : (
            // Detailed view
            consumers.map((consumer, idx) => (
              <div 
                key={`${consumer.itemId}-${idx}`}
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  padding: "6px 4px",
                  backgroundColor: idx % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
                onClick={() => onConsumerClick?.(consumer.nodeId)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 122, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "rgba(0, 0, 0, 0.1)" : "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Icon itemId={consumer.itemId} size="small" />
                  <span style={{ marginLeft: "8px", color: theme.colors.text }}>
                    {consumer.itemName || consumer.itemId}
                  </span>
                </div>
                <span style={{ color: theme.colors.text }}>
                  {consumer.amount.toFixed(2)}/min
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ListNode; 