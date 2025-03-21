# Calculator Component Implementation Plan

## Overview

The Calculator component will be a dedicated interface for performing production calculations without creating full dependency trees. It will allow users to quickly calculate resource requirements, machine counts, and power consumption for specific recipes.

## Component Structure

Following the established pattern of modular components, the Calculator will be broken down into several focused components:

1. **Calculator (index.ts)**: Acts as the composition root, exporting all calculator components.
2. **Calculator.tsx**: The main Calculator component that manages state and coordinates subcomponents.
3. **CalculatorHeader.tsx**: Contains the header with title and action buttons.
4. **RecipeSelection.tsx**: Allows users to select an item and recipe.
5. **ProductionInput.tsx**: Input controls for specifying desired production rate.
6. **RequirementsOutput.tsx**: Displays calculated resource requirements.
7. **MachineRequirements.tsx**: Shows required machines and their efficiency.
8. **PowerRequirements.tsx**: Displays power consumption statistics.

## Implementation Steps

1. **Create Directory Structure**
   ```
   src/components/calculator/
   ├── index.ts
   ├── Calculator.tsx
   ├── CalculatorHeader.tsx
   ├── RecipeSelection.tsx
   ├── ProductionInput.tsx
   ├── RequirementsOutput.tsx
   ├── MachineRequirements.tsx
   └── PowerRequirements.tsx
   ```

2. **Create Custom Hooks**
   - `useCalculator.ts`: Main hook for calculation logic and state management
   - `useResourceRequirements.ts`: Hook for calculating resource requirements
   - `useMachineRequirements.ts`: Hook for calculating machine requirements
   - `usePowerRequirements.ts`: Hook for calculating power consumption

3. **Create Utility Services**
   - `calculationService.ts`: Service for performing production calculations
   - `efficiencyService.ts`: Service for calculating machine efficiency

4. **Integration into Main Application**
   - Add Calculator tab to the main application
   - Create navigation between Dependency Planner and Calculator

## Component Interfaces

### Calculator Component Props
```typescript
interface CalculatorProps {
  onRecipeSelect?: (itemId: string, recipeId: string) => void;
  onProductionRateChange?: (rate: number) => void;
  initialItemId?: string;
  initialRecipeId?: string;
  initialProductionRate?: number;
}
```

### RecipeSelection Component Props
```typescript
interface RecipeSelectionProps {
  selectedItemId: string;
  selectedRecipeId: string;
  onItemSelect: (itemId: string) => void;
  onRecipeSelect: (recipeId: string) => void;
}
```

### ProductionInput Component Props
```typescript
interface ProductionInputProps {
  productionRate: number;
  onProductionRateChange: (rate: number) => void;
  unitLabel: string;
}
```

### RequirementsOutput Component Props
```typescript
interface RequirementsOutputProps {
  requirements: {
    itemId: string;
    amount: number;
    isRawMaterial: boolean;
  }[];
  isLoading: boolean;
}
```

## Functionality

The Calculator component will:

1. Allow users to select an item and recipe
2. Let users input desired production rate
3. Calculate and display resource requirements
4. Show machine requirements and efficiency
5. Display power consumption
6. Allow users to adjust inputs and see real-time updates
7. Provide the ability to save/load calculations
8. Allow toggling between different units (items/min, items/sec)

## UI Design

The Calculator will use the same UI components and styling as the rest of the application, including:
- Card component for sections
- Input component for numeric inputs
- Select components for dropdowns
- Button components for actions
- Typography components for consistent text styling

## Integration with Existing Systems

The Calculator will leverage existing systems:
- Recipe database from the main application
- Machine data from the machine calculation service
- Common calculation functions from utility services
- State management for saving/loading calculations

## Testing Strategy

Each component and hook will have dedicated unit tests:
- Test calculation accuracy with known values
- Test UI interactions and state updates
- Test edge cases like invalid inputs
- Test responsiveness and layout

## Accessibility Considerations

The Calculator will be designed with accessibility in mind:
- Proper keyboard navigation
- Screen reader support
- High contrast mode
- Responsive layout for different screen sizes

## Performance Optimization

To ensure good performance:
- Use React.memo for pure components
- Implement useMemo and useCallback for expensive calculations
- Optimize renders with proper dependency arrays
- Implement debouncing for rapid input changes 