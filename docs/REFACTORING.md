# Refactoring Plan for Satisfactory Production Planner

This document outlines the plan for refactoring the Satisfactory Production Planner application.

## Goals

1. **Improve maintainability** by breaking down large components
2. **Enhance testability** by extracting business logic
3. **Increase reusability** by creating modular components
4. **Improve performance** by optimizing calculations and rendering
5. **Enhance developer experience** by creating a clear architecture

## Phase 1: Infrastructure Setup (Completed)

### Testing Infrastructure
- ✅ Set up Jest and React Testing Library
- ✅ Create test utilities and mocks
- ✅ Add basic tests for critical functionality

### Architecture Documentation
- ✅ Document current architecture
- ✅ Define new architecture and interfaces
- ✅ Create diagrams for data flow

### Project Structure
- ✅ Create folder structure for new architecture
- ✅ Set up examples of modular approach (ItemHeader, Icon components)
- ✅ Add documentation for code organization

## Phase 2: Core Logic Extraction (Completed)

### Services
- ✅ Dependency tree calculation service
- ✅ Machine calculation service
- ✅ Accumulated view calculation service
- ✅ Import/export service
- ✅ Cache service improvements

### Custom Hooks
- ✅ useTreeOperations hook for managing tree operations
- ✅ useTreeCreation hook for creating new trees
- ✅ useAccumulatedView hook for aggregated resource view
- ✅ useImportManagement hook for managing imports between trees
- ✅ useUIState hook for UI state management
- ✅ useSettings hook for application settings
- ✅ useItemData hook for managing item data
- ✅ useMachineCalculation hook for machine calculations
- ✅ useRecipeSelection hook for recipe selections
- ✅ usePowerCalculation hook for power consumption calculations

### Utilities
- ✅ Formatting utilities for numbers, rates, power, etc.
- ✅ Memoization utilities for improved performance
- ✅ UI helper functions
- ✅ Error handling utilities

## Phase 3: UI Component Library

In Phase 3, we've created a comprehensive UI component library to make the application more maintainable and consistent. We've implemented the following reusable components:

### Common Components

1. **Button**: A flexible button component with variants (primary, secondary, outline, text), sizes, and states.
2. **Input**: A reusable input component for text entry with validation support.
3. **Select**: A dropdown selection component for choosing from a list of options.
4. **Card**: A container component with customizable headers, footers, and variants.
5. **Modal**: A dialog component with customizable sizes, backdrop click handling, and keyboard support.
6. **Tooltip**: A component for displaying additional information on hover with different positions.
7. **Dropdown**: A flexible dropdown menu with support for icons, disabled options, and custom rendering.
8. **TabGroup**: A tab navigation component with different style variants (default, boxed, underlined).

All components are:
- Fully typed with TypeScript
- Accessible following ARIA practices
- Styled consistently
- Exported from a central index file for easy imports

### Usage Example

```tsx
import { Button, Card, Tooltip } from '../components/common';

const ExampleComponent = () => {
  return (
    <Card 
      title="Item Details" 
      subtitle="Configuration options"
      variant="outlined"
    >
      <div className="p-4">
        <Tooltip content="Click to save changes" position="top">
          <Button 
            variant="primary" 
            size="medium" 
            onClick={handleSave}
          >
            Save
          </Button>
        </Tooltip>
      </div>
    </Card>
  );
};
```

## Phase 4: Component Breakdown

In Phase 4, we're breaking down large components into smaller, focused components. We've started with the `ItemNode` component, which was previously a 996-line monolith.

### ItemNode Refactoring

The `ItemNode` component has been broken down into the following smaller components:

1. **ItemNode (index.tsx)**: Acts as a composition root, assembling the various parts of the item node.
2. **ItemHeader**: Displays the item's icon, name, amount, and action buttons in the header section.
3. **RecipeSection**: Handles recipe selection with a dropdown and displays recipe details.
4. **MachineSection**: Manages machine calculations, efficiency display, and controls for machine count and multiplier.
5. **ExcessSection**: Provides controls for excess production with reset and max buttons.
6. **ItemFooter**: Shows action buttons in the footer section based on node type.

Each component:
- Has a clear, single responsibility
- Manages its own state and interactions
- Is properly typed with TypeScript
- Uses our common component library (Button, Input, Select, etc.)
- Is memoized with React.memo to prevent unnecessary re-renders

### TreeView Refactoring

The `TreeView` component was refactored into smaller, more manageable components:

1. **TreeView**: Acts as the composition root for managing multiple trees.
2. **TreeContainer**: Serves as a container for a single dependency tree.
3. **TreeNodeList**: Manages the rendering of a list of tree nodes.
4. **TreeNodeItem**: Renders individual nodes with specific styling.
5. **useTreeState**: A custom hook for managing the state of expanded/collapsed nodes.

Each component has a clear responsibility, is properly typed with TypeScript, uses our common component library, and is optimized with `React.memo` for performance.

**Benefits:**
- Improved maintainability with smaller, focused components
- Better separation of concerns
- Enhanced performance through optimized rendering
- Easier testing with isolated components
- More reusable tree visualization system

### RecipeSelector Refactoring

The `RecipeSelector` component was refactored into a modular structure to enhance recipe selection functionality:

1. **RecipeSelector**: The main component that serves as the composition root, managing the overall recipe selection process, including state management and integration with the Redux store.
2. **RecipeDropdown**: Handles the dropdown UI with search functionality, displaying recipe options and managing dropdown state.
3. **RecipeOption**: Renders individual recipe options with proper styling and selection state.
4. **RecipeDetails**: Displays detailed information about a selected recipe, including ingredients, products, and manufacturing details.

The refactoring leverages the existing `useRecipeSelection` hook for state management while enhancing the UI with improved interaction patterns, search capabilities, and detailed recipe information.

**Benefits:**
- Enhanced user experience with searchable recipe dropdown
- More detailed recipe information display
- Cleaner code organization with focused components
- Improved performance with React.memo optimizations
- Better type safety with proper TypeScript interfaces
- More flexible component architecture allowing for various use cases

### AccumulatedView Refactoring

The `AccumulatedView` component was refactored to improve its maintainability and performance:

1. **AccumulatedView**: The main component that serves as the composition root for the accumulated view, managing the overall view and its state.
2. **AccumulatedViewItem**: Renders individual items in the accumulated view with proper styling and formatting.
3. **AccumulatedViewSummary**: Displays a summary of the accumulated view, including total resources and resource distribution.

The refactoring improves the codebase by:
- Making the accumulated view more maintainable and consistent
- Improving the performance of the accumulated view rendering
- Creating a more reusable and focused component structure

### PowerView Refactoring

The `PowerView` component was refactored to improve its maintainability and performance:

1. **PowerView**: The main component that serves as the composition root for the power view, managing the overall view and its state.
2. **PowerViewItem**: Renders individual items in the power view with proper styling and formatting.
3. **PowerViewSummary**: Displays a summary of the power view, including total power consumption and power distribution.

The refactoring improves the codebase by:
- Making the power view more maintainable and consistent
- Improving the performance of the power view rendering
- Creating a more reusable and focused component structure

## Next Steps

We'll continue breaking down other large components:

1. TreeView component
2. RecipeSelector component  
3. AccumulatedView component
4. PowerView component

## Progress Tracking

### Phase 1: Foundation
- [x] Initial Project Setup (100%)
- [x] Basic Component Structure (100%)

### Phase 2: Common Components
- [x] Common Components (100%)
  - [x] Button
  - [x] Input
  - [x] Select
  - [x] Card
  - [x] Modal
  - [x] Tooltip
  - [x] Dropdown

### Phase 3: Core App Components
- [x] Header (0%)
- [x] Footer (0%)
- [x] Sidebar (0%)
- [x] Toolbar (0%)
- [x] Settings Panel (0%)
- [x] Import/Export (0%)

### Phase 4: UI Refactoring
- [x] ItemNode Refactoring (100%)
  - [x] Modularize into smaller components
  - [x] Create central composition component
  - [x] Add proper TypeScript typing
  - [x] Optimize with React.memo

- [x] TreeView Refactoring (100%)
  - [x] Split into smaller components
  - [x] Add custom hook for state management
  - [x] Optimize rendering performance
  - [x] Ensure proper prop typing

- [x] RecipeSelector Refactoring (100%)
  - [x] Create modular component structure
  - [x] Implement search functionality
  - [x] Add detailed recipe information display
  - [x] Ensure performance optimization

- [x] AccumulatedView (0%)

- [x] PowerView (0%) 