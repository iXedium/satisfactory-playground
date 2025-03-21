/**
 * Calculator Component
 * 
 * Main component for performing resource and machine calculations.
 */

import React from "react";
import { Card } from "../../components/common";
import { theme } from "../../styles/theme";
import useCalculator from "../../hooks/useCalculator";

import CalculatorHeader from "./CalculatorHeader";
import RecipeSelection from "./RecipeSelection";
import ProductionInput from "./ProductionInput";
import RequirementsOutput from "./RequirementsOutput";
import MachineRequirements from "./MachineRequirements";
import PowerRequirements from "./PowerRequirements";

export interface CalculatorProps {
  /**
   * Callback fired when a recipe is selected
   */
  onRecipeSelect?: (itemId: string, recipeId: string) => void;
  
  /**
   * Callback fired when production rate changes
   */
  onProductionRateChange?: (rate: number) => void;
  
  /**
   * Initial item ID to select
   */
  initialItemId?: string;
  
  /**
   * Initial recipe ID to select
   */
  initialRecipeId?: string;
  
  /**
   * Initial production rate
   */
  initialProductionRate?: number;
}

/**
 * Calculator component for resource and machine calculations
 */
const Calculator: React.FC<CalculatorProps> = ({
  onRecipeSelect,
  onProductionRateChange,
  initialItemId = "",
  initialRecipeId = "",
  initialProductionRate = 0,
}) => {
  // Use calculator hook for state management and calculations
  const {
    itemId,
    recipeId,
    productionRate,
    item,
    recipe,
    availableRecipes,
    resourceRequirements,
    machineRequirements,
    totalPower,
    isLoading,
    error,
    setItemId,
    setRecipeId,
    setProductionRate,
  } = useCalculator({
    itemId: initialItemId,
    recipeId: initialRecipeId,
    productionRate: initialProductionRate,
  });
  
  // Handle recipe selection
  const handleRecipeSelect = (newRecipeId: string) => {
    setRecipeId(newRecipeId);
    
    if (onRecipeSelect) {
      onRecipeSelect(itemId, newRecipeId);
    }
  };
  
  // Handle production rate change
  const handleProductionRateChange = (newRate: number) => {
    setProductionRate(newRate);
    
    if (onProductionRateChange) {
      onProductionRateChange(newRate);
    }
  };
  
  return (
    <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
      <Card title="Production Calculator">
        <div style={{ padding: "16px" }}>
          {/* Header with title and actions */}
          <CalculatorHeader />
          
          {/* Input section */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            gap: "16px",
            marginBottom: "24px" 
          }}>
            {/* Recipe selection */}
            <RecipeSelection
              selectedItemId={itemId}
              selectedRecipeId={recipeId}
              onItemSelect={setItemId}
              onRecipeSelect={handleRecipeSelect}
              availableRecipes={availableRecipes}
              isLoading={isLoading}
            />
            
            {/* Production input */}
            <ProductionInput
              productionRate={productionRate}
              onProductionRateChange={handleProductionRateChange}
              unitLabel={item ? `${item.name}/min` : "items/min"}
              disabled={!recipe}
            />
          </div>
          
          {/* Results section */}
          {recipe && productionRate > 0 && (
            <div style={{ 
              display: "flex", 
              flexDirection: "column",
              gap: "24px" 
            }}>
              {/* Resource requirements */}
              <Card title="Resource Requirements" variant="outlined">
                <RequirementsOutput
                  requirements={resourceRequirements}
                  isLoading={isLoading}
                />
              </Card>
              
              {/* Machine requirements */}
              <Card title="Machine Requirements" variant="outlined">
                <MachineRequirements
                  requirements={machineRequirements}
                  isLoading={isLoading}
                />
              </Card>
              
              {/* Power requirements */}
              <Card title="Power Requirements" variant="outlined">
                <PowerRequirements
                  totalPower={totalPower}
                  requirements={machineRequirements}
                  isLoading={isLoading}
                />
              </Card>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div style={{ 
              color: theme.colors.error,
              padding: "16px",
              marginTop: "16px",
              backgroundColor: `${theme.colors.error}10`,
              borderRadius: theme.border.radius,
            }}>
              {error}
            </div>
          )}
          
          {/* No data message */}
          {!error && !isLoading && (!recipe || productionRate <= 0) && (
            <div style={{ 
              color: theme.colors.textSecondary,
              padding: "32px 16px",
              textAlign: "center",
              backgroundColor: theme.colors.backgroundAlt,
              borderRadius: theme.border.radius,
            }}>
              {!recipe 
                ? "Select an item and recipe to calculate requirements" 
                : "Enter a production rate to see requirements"}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default React.memo(Calculator); 