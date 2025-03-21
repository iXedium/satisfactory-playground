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

The `TreeView` component has been broken down into the following smaller components:

1. **TreeView (composition root)**: Acts as a composition root for tree visualization, managing multiple trees.
2. **TreeContainer**: Container for a single dependency tree, using the Card component for visual structure.
3. **TreeNodeList**: Handles rendering a list of tree nodes, managing recursion for nested nodes.
4. **TreeNodeItem**: Renders a single node in the tree with styling based on depth and other properties.
5. **useTreeState**: Custom hook that manages tree state like expanded/collapsed nodes.

Each component:
- Has a clear, single responsibility
- Is properly typed with TypeScript
- Uses our common component library where appropriate
- Is memoized with React.memo for performance optimization

The refactoring has improved the codebase by:
1. Making the tree rendering logic more maintainable
2. Extracting state management to a custom hook
3. Making each component focused on a specific task
4. Allowing for easier testing of individual components
5. Creating a more reusable tree visualization system

### Benefits of the Refactoring

1. **Improved readability**: Each component has a focused purpose
2. **Better maintainability**: Changes to one feature won't affect others
3. **Enhanced testability**: Smaller components are easier to test in isolation
4. **Reduced complexity**: Simplified control flow and state management
5. **Better performance**: Memoization prevents unnecessary re-renders
6. **Reusable building blocks**: Components can be reused in other contexts

## Next Steps

We'll continue breaking down other large components:

1. TreeView component
2. RecipeSelector component  
3. AccumulatedView component
4. PowerView component

## Progress Tracking

### Phase 1
- [x] Testing Infrastructure (100%)
- [x] Architecture Documentation (100%)
- [x] Project Structure (100%)

### Phase 2
- [x] Services (100%)
- [x] Custom Hooks (100%)
- [x] Utilities (100%)

### Phase 3
- [x] Common Components (100%)
- [ ] Tree Visualization Components (0%)
- [ ] Item Node Components (0%)
- [ ] Accumulated View Components (0%)
- [ ] Power View Components (0%)
- [ ] Settings Components (0%)
- [ ] Layout Components (0%)

### Phase 4
- [x] ItemNode Refactoring (100%)
- [x] TreeView Refactoring (100%)
- [ ] RecipeSelector Refactoring (0%)
- [ ] AccumulatedView Refactoring (0%)
- [ ] PowerView Refactoring (0%) 