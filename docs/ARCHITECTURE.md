# Satisfactory Production Planner Architecture

This document outlines the architecture of the Satisfactory Production Planner application.

## Overview

The application is designed to help players of Satisfactory plan their production chains. It allows users to calculate resource requirements, machine counts, and power consumption for complex production chains.

## Architecture Layers

The application follows a layered architecture:

1. **UI Layer**
   - React components that render the user interface
   - Organized by feature and responsibility
   - Uses custom hooks to access application state and logic

2. **State Management Layer**
   - Redux for global state management
   - Custom hooks for component-level state and business logic
   - Slice-based organization for Redux store

3. **Services Layer**
   - Pure TypeScript modules for business logic
   - No UI or state management dependencies
   - Responsible for calculations, data manipulations, and algorithms

4. **Data Layer**
   - Static game data (items, recipes, machines, etc.)
   - Data access functions (queries, filters, etc.)
   - Cache mechanisms for improved performance

## Major Components

- **Dependency Tree**: Visualizes production chains as trees
- **Accumulated View**: Shows total resources across all trees
- **Power Overview**: Displays power consumption statistics
- **Settings**: Allows customization of the application

## Data Flow

1. User interacts with UI components
2. Components use custom hooks to execute business logic
3. Hooks call services to perform calculations and manipulations
4. Services return data to hooks, which update state
5. UI components re-render with updated state

## Refactoring Plan

Our refactoring is organized into three phases:

### Phase 1: Infrastructure Setup (Complete)
- Set up testing infrastructure (Jest, React Testing Library)
- Create basic tests for critical functionality
- Document current architecture
- Define new architecture and interfaces
- Create folder structure for new architecture
- Create examples of modular approach

### Phase 2: Core Logic Extraction (Complete)
- Move tree calculation logic to services
- Separate caching logic from business logic
- Create proper hooks for data management
- Refactor Redux store for better organization
- Move machine calculation logic to services
- Implement import/export logic as services
- Create accumulated view calculation service

### Phase 3: Component Refactoring (In Progress)
- Break down large components into smaller, focused components
- Use custom hooks in components for data access and logic
- Implement consistent styling across components
- Create reusable UI components for common patterns
- Refactor tree visualization components
- Implement new UI for accumulated view
- Create modular power consumption view
- Update settings and configuration components
- Ensure proper separation of concerns in all components
- Implement accessibility improvements
- Add thorough error handling in the UI layer

## File Structure

```
src/
├── components/
│   ├── accumulated/    # Accumulated view components
│   ├── common/         # Shared, reusable components
│   ├── nodes/          # Tree node components
│   ├── power/          # Power consumption components
│   ├── settings/       # Settings components
│   └── tree/           # Tree visualization components
├── features/           # Redux slices
├── hooks/              # Custom React hooks
├── services/           # Business logic services
│   ├── calculation/    # Calculation services
│   ├── cache/          # Caching mechanisms
│   └── import/         # Import/export services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── data/               # Game data and queries
```

## Design Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **DRY (Don't Repeat Yourself)**: Avoid duplication by using shared services and hooks
3. **SOLID Principles**: Follow SOLID principles for maintainable code
4. **Type Safety**: Use TypeScript to ensure type safety throughout the application
5. **Testing**: Write tests for critical functionality
6. **Performance**: Optimize for performance with caching and memoization

## Future Improvements

1. Add ability to save and load production plans
2. Implement alternative visualization modes
3. Add integration with game mods for custom items and recipes
4. Create a mobile-friendly version
5. Add localization support

## UI Components

### Common Components

The application uses a set of reusable common components that provide consistent UI patterns across the application.

- **Button**: A flexible button component with various styles, sizes, and states.
- **Input**: A reusable input component for text entry with validation support.
- **Select**: A dropdown selection component for choosing from a list of options.
- **Card**: A container component for grouping related content with customizable headers and footers.
- **Modal**: A dialog component that appears above the page content for focused interactions.
- **Tooltip**: A component for displaying additional information when hovering over elements.
- **Dropdown**: A flexible dropdown menu component for selecting from a list of options with icons.
- **TabGroup**: A component for organizing content into tabs with different style variants.

These components are located in the `src/components/common` directory and are designed to be:

- **Reusable**: Components can be used in multiple places with consistent behavior
- **Customizable**: Props allow customizing appearance and behavior
- **Accessible**: Components follow accessibility best practices
- **Type-safe**: Full TypeScript support with comprehensive interfaces

### Feature Components

#### Component Breakdown Approach

For large, complex components, we follow a component breakdown approach to improve maintainability and reusability:

1. **Composition Root Pattern**: Parent components act as composition roots that assemble smaller, focused child components.
2. **Single Responsibility**: Each component has a single, well-defined responsibility.
3. **Container/Presentational Split**: We separate data handling from presentation concerns.
4. **Custom Hooks for Logic**: Business logic and data fetching are extracted into custom hooks.
5. **Memoization**: Components use React.memo to prevent unnecessary re-renders.

## Component Structure

### ItemNode Component
The `ItemNode` component has been refactored into a modular structure:

- `index.tsx`: Composition root
- `ItemHeader.tsx`: Header with icon, name, and amount
- `RecipeSection.tsx`: Recipe selection dropdown
- `MachineSection.tsx`: Machine count and efficiency
- `ExcessSection.tsx`: Excess production controls
- `ItemFooter.tsx`: Action buttons in footer

### TreeView Component
The `TreeView` component has been refactored into a modular structure:

- `index.ts`: Exports all tree components
- `TreeView.tsx`: Composition root
- `TreeContainer.tsx`: Container for a single tree
- `TreeNodeList.tsx`: Handles list of tree nodes
- `TreeNodeItem.tsx`: Renders a single tree node

### RecipeSelector Component

The RecipeSelector component is designed as a modular system for selecting recipes for items. It follows the same pattern of breaking down complex functionality into smaller, focused components.

#### Structure:

- `index.ts`: Exports all recipe selection components for easier imports
- `RecipeSelector.tsx`: Main component that manages recipe selection state
- `RecipeDropdown.tsx`: The dropdown component for selecting recipes
- `RecipeOption.tsx`: Individual recipe option item for the dropdown
- `RecipeDetails.tsx`: Component for displaying recipe details

This modular design provides several benefits:
- Each component has a single responsibility
- Components can be tested independently
- The implementation is more maintainable
- Styles and behavior can be modified more easily
- Clear separation of concerns between selection UI and recipe details

### PowerView Component

The PowerView component is designed to display power statistics for machines in the production network. It's built as a modular system with clean separation of concerns.

#### Structure:

- `index.ts`: Exports all power view components
- `PowerView.tsx`: Main component that manages the display of power statistics
- `PowerViewHeader.tsx`: Contains search and sorting controls
- `PowerViewFilters.tsx`: Provides filtering options for the power view
- `PowerViewItem.tsx`: Renders individual machine items with power information
- `PowerViewSummary.tsx`: Displays aggregate statistics about power consumption

This modular approach provides better maintainability, easier testing, and clearer separation of concerns between different aspects of the power view functionality.

### AccumulatedView Component

The AccumulatedView component is designed to show an aggregated view of all items in the production network. It follows the modular component architecture pattern.

#### Structure:

- `index.ts`: Exports all accumulated view components
- `AccumulatedView.tsx`: Main component that processes dependency trees and manages state
- `AccumulatedViewHeader.tsx`: Provides search and sorting controls for items
- `AccumulatedViewFilters.tsx`: Displays filter options for different item types
- `AccumulatedViewSummary.tsx`: Shows summary statistics of resources across all trees
- `AccumulatedViewItem.tsx`: Renders individual items with recipe and machine details

This modular design makes the component more maintainable and testable, with each subcomponent having a single responsibility within the accumulated view system.

### Calculator Component

The Calculator component provides a dedicated interface for performing production calculations without creating full dependency trees. It allows users to quickly calculate resource requirements, machine counts, and power consumption for specific recipes.

#### Structure:

- `index.ts`: Exports all calculator components for easier imports
- `Calculator.tsx`: Main component that manages calculator state and coordinates subcomponents
- `CalculatorHeader.tsx`: Contains the header with title and action buttons
- `RecipeSelection.tsx`: Allows users to select an item and recipe for calculations
- `ProductionInput.tsx`: Input controls for specifying desired production rate
- `RequirementsOutput.tsx`: Displays calculated resource requirements
- `MachineRequirements.tsx`: Shows required machines and their efficiency
- `PowerRequirements.tsx`: Displays power consumption statistics

The Calculator component leverages the `useCalculator` hook for state management and calculations. This modular design ensures each component has a single responsibility, making the calculator system maintainable and extensible.