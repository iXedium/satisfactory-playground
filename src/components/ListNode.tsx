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
  totalAmount: number;
  nodeIds: string[];
  itemName?: string;
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
}

const ListNode: React.FC<ListNodeProps> = ({
  itemId,
  amount,
  isRoot = false,
  isByproduct = false,
  recipes,
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
}) => {
  const [expanded, setExpanded] = useState(true);
  const [item, setItem] = useState<Item | null>(null);
  const [consumers, setConsumers] = useState<ConsumptionDetail[]>([]);
  const [accumulatedConsumers, setAccumulatedConsumers] = useState<AccumulatedConsumption[]>([]);
  const dependencyTree = useSelector((state: RootState) => state.dependencies.dependencyTree);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Update expanded state when showExtensions changes
  useEffect(() => {
    setExpanded(showExtensions);
  }, [showExtensions]);

  // Fetch item data
  useEffect(() => {
    getItemById(itemId).then((item) => setItem(item || null));
  }, [itemId]);

  // Calculate consumption details
  useEffect(() => {
    if (!dependencyTree) return;

    const findConsumers = async (node: DependencyNode, consumers: ConsumptionDetail[] = []) => {
      if (node.children) {
        for (const child of node.children) {
          // If this child uses our item as input
          if (child.id === itemId) {
            const consumerItem = await getItemById(node.id);
            consumers.push({
              itemId: node.id,
              amount: Math.abs(child.amount),
              nodeId: child.uniqueId,
              itemName: consumerItem?.name
            });
          }
          
          // Continue searching in this branch
          await findConsumers(child, consumers);
        }
      }
      return consumers;
    };

    findConsumers(dependencyTree).then(foundConsumers => {
      setConsumers(foundConsumers);
      
      // Calculate accumulated consumers
      if (accumulateExtensions) {
        const accumulated: Record<string, AccumulatedConsumption> = {};
        
        foundConsumers.forEach(consumer => {
          if (!accumulated[consumer.itemId]) {
            accumulated[consumer.itemId] = {
              itemId: consumer.itemId,
              totalAmount: 0,
              nodeIds: [],
              itemName: consumer.itemName
            };
          }
          
          accumulated[consumer.itemId].totalAmount += consumer.amount;
          accumulated[consumer.itemId].nodeIds.push(consumer.nodeId);
        });
        
        // Convert to array and sort by amount (descending)
        const accumulatedArray = Object.values(accumulated).sort((a, b) => 
          b.totalAmount - a.totalAmount
        );
        
        setAccumulatedConsumers(accumulatedArray);
      }
    });
  }, [dependencyTree, itemId, accumulateExtensions]);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (!item) return null;

  // Determine which consumers to display
  const displayConsumers = accumulateExtensions ? accumulatedConsumers : consumers;
  const hasConsumers = displayConsumers.length > 0;

  return (
    <div ref={nodeRef}>
      {/* Main item node */}
      <div style={{ marginBottom: hasConsumers ? "4px" : "0" }}>
        <ItemNode
          itemId={itemId}
          amount={amount}
          isRoot={isRoot}
          isByproduct={isByproduct}
          recipes={recipes}
          selectedRecipeId={selectedRecipeId}
          onRecipeChange={onRecipeChange}
          excess={excess}
          onExcessChange={onExcessChange}
          index={index}
          machineCount={machineCount}
          onMachineCountChange={onMachineCountChange}
          machineMultiplier={machineMultiplier}
          onMachineMultiplierChange={onMachineMultiplierChange}
          onIconClick={hasConsumers ? toggleExpanded : undefined}
          showMachines={showMachines}
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
          marginLeft: "24px",
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
                  padding: "8px",
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
                  padding: "8px",
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