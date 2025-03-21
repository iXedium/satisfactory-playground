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

### Settings Interface

The Settings interface provides a comprehensive system for managing application preferences and configurations:

- **index.ts**: Exports all settings components for easier imports.
- **Settings.tsx**: Main component serving as composition root for all settings functionality.
- **SettingsHeader.tsx**: Header component with title and action buttons.
- **GeneralSettings.tsx**: Manages general application settings like theme and production rate.
- **DisplaySettings.tsx**: Controls display options for items, trees, machines, etc.
- **RecipeSettings.tsx**: Manages default recipes for items with multiple production methods.
- **AdvancedSettings.tsx**: Provides advanced options like resetting settings and data management.
- **SettingsModal.tsx**: Modal wrapper for displaying settings in a dialog.

This component is designed with a modular structure to enhance maintainability and allow for easy extension with new settings categories. The settings are stored in Redux via a dedicated `settingsSlice` and persist across sessions using localStorage.

## Import/Export System

The Import/Export system enables users to save and load application data, facilitating backup, sharing, and migration of their work.

### Structure

- **Services**:
  - `services/importExport/index.ts`: Contains the core logic for data export and import operations
  
- **State Management**:
  - `features/importExportSlice.ts`: Redux slice for managing import/export state
  - `hooks/useImportExport.ts`: Hook that provides a clean interface to import/export functionality
  
- **Components**:
  - `ImportExportSection.tsx`: Main component for the import/export controls
  - `ImportExportModal.tsx`: Modal dialog for accessing import/export functionality
  
### Data Flow

1. **Export Flow**:
   - User triggers export through UI
   - Redux thunk `startExport` is dispatched
   - Current application state is collected from Redux store
   - Data is formatted, serialized to JSON, and downloaded as a file
   - UI displays confirmation and updates last export date

2. **Import Flow**:
   - User selects a file through the UI
   - File is read and parsed from JSON
   - Data validation ensures format compatibility
   - Redux actions are dispatched to update application state
   - UI displays confirmation and updates last import date

### Integration Points

- **CommandBar**: Quick access button for the import/export modal
- **AdvancedSettings**: Embedded import/export section in the settings panel
- **Redux Store**: Integration with the global state management system

## State Management

The application uses a centralized state management approach combining Redux and React's state management hooks with a custom persistence layer. This architecture provides a consistent, type-safe way to manage state across components.

### Core Principles

1. **Single Source of Truth**: Global state lives in Redux, with clearly defined slices for different domains.
2. **Type Safety**: All state interactions are fully typed, providing IDE autocompletion and compile-time error detection.
3. **Persistence**: State is automatically persisted to localStorage with versioning and migration support.
4. **Encapsulation**: State access is encapsulated in custom hooks that provide business logic and access patterns.

### Architecture Components

#### State Store

- **Redux Store Configuration** (`src/store/configureStore.ts`): Central configuration for Redux with persistence.
- **Root State and Dispatch Types** (`src/store/index.ts`): Type definitions for the global state.

#### State Slices

- **UI Slice** (`src/features/uiSlice.ts`): Manages global UI state such as active tabs, modals, and theme.
- **Settings Slice** (`src/features/settingsSlice.ts`): User preferences and application settings.
- **Dependencies Slice** (`src/features/dependencySlice.ts`): Core dependency tree and calculation state.
- **Data Slice** (`src/features/dataSlice.ts`): Application data models and definitions.
- **Import/Export Slice** (`src/features/importExportSlice.ts`): State for data import and export functions.

#### Persistence Layer

- **Persistence Service** (`src/services/persistence/index.ts`): Service for storing and retrieving state with versioning.

#### Access Patterns

- **Store Hooks** (`src/hooks/useStore.ts`): Typed hooks for accessing the Redux store.
- **Persistent State Hooks** (`src/hooks/usePersistentState.ts`): Hooks for state with automatic persistence.
- **Domain-Specific Hooks**: 
  - `useUI.ts`: UI-specific state and actions
  - `useSettings.ts`: Application settings
  - `useCalculator.ts`: Calculator state and operations
  - `useTreeOperations.ts`: Tree manipulation operations

### Data Flow

```
┌────────────────┐     ┌───────────────┐     ┌─────────────────┐
│                │     │               │     │                 │
│  Components    │────▶│  Custom Hooks │────▶│   Redux Store   │
│                │◀────│               │◀────│                 │
└────────────────┘     └───────────────┘     └─────────────────┘
                                                     │
                                                     ▼
                                             ┌─────────────────┐
                                             │                 │
                                             │ Persistence     │
                                             │ Service         │
                                             │                 │
                                             └─────────────────┘
                                                     │
                                                     ▼
                                             ┌─────────────────┐
                                             │                 │
                                             │  localStorage   │
                                             │                 │
                                             └─────────────────┘
```

### Best Practices

1. **Use Custom Hooks**: Always access state through domain-specific hooks rather than direct store access.
2. **Keep Components Pure**: Components should be presentational where possible, with state logic in hooks.
3. **Minimize State Updates**: Batch state updates and avoid unnecessary renders.
4. **Follow Type Patterns**: Maintain type consistency across state interfaces.
5. **Handle Migrations**: Use the persistence service's migration capabilities for breaking changes.

### Example Usage

```tsx
// Component using the state management system
import { useUI } from '../hooks/useUI';
import { useSettings } from '../hooks/useSettings';

function MyComponent() {
  // Access UI state and actions
  const { 
    theme, 
    showModal, 
    isModalOpen 
  } = useUI();
  
  // Access settings
  const { 
    showMachines, 
    toggleBooleanSetting 
  } = useSettings();
  
  // Component logic using state management
  return (
    <div className={theme === 'dark' ? 'dark-theme' : 'light-theme'}>
      {showMachines && <MachineList />}
      <button onClick={() => toggleBooleanSetting('showMachines')}>
        Toggle Machines
      </button>
      <button onClick={() => showModal('settings')}>
        Open Settings
      </button>
    </div>
  );
}
```

## Component Integration

The application uses a layered integration approach to connect disparate components and features into a cohesive system.

### Integration Architecture

```
┌────────────────────────────────────────────────────────┐
│                  AppStateProvider                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌──────────┐   │
│   │ Redux Store │    │ Persistence │    │ Settings │   │
│   └─────────────┘    └─────────────┘    └──────────┘   │
│                                                        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               Integration Layer (Hooks)                │
├────────────────────────────────────────────────────────┤
│                                                        │
│    ┌────────────────┐  ┌─────────────────────────┐     │
│    │ useUI          │  │ useComponentIntegration │     │
│    └────────────────┘  └─────────────────────────┘     │
│                                                        │
│    ┌────────────────┐  ┌─────────────────────────┐     │
│    │ useSettings    │  │ usePersistentState      │     │
│    └────────────────┘  └─────────────────────────┘     │
│                                                        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                Feature Components                      │
├────────────┬─────────────┬────────────┬───────────────┤
│            │             │            │               │
│ Dashboard  │ Calculator  │ TreeView   │ Settings      │
│            │             │            │               │
└────────────┴─────────────┴────────────┴───────────────┘
```

### Integration Components

#### 1. AppStateProvider

The `AppStateProvider` serves as the central integration point for the application, providing:

- Redux state access via React-Redux's Provider
- Theme management with system preference detection
- Settings access through a unified context
- Persistence service for state management

It wraps the entire application and establishes the foundation for all cross-component communication.

#### 2. Integration Hooks

The application uses several integration hooks to bridge functionality between components:

- **useComponentIntegration**: Connects different features like opening settings from calculator, tracking recent items, etc.
- **useUI**: Provides consistent UI state management across components
- **useSettings**: Gives access to application settings from any component
- **usePersistentState**: Enables persistent state with localStorage backing

#### 3. Cross-Component Features

Several features work across component boundaries:

- **Theme System**: Consistent theming applied through CSS variables and context
- **Recent Items Tracking**: Tracking and displaying recently used items across features
- **Settings Access**: Common settings that affect multiple components
- **Dashboard**: A central hub for accessing all features

### Integration Patterns

The application employs several patterns for component integration:

#### Provider Pattern

React context providers deliver shared state and utilities to components:

```tsx
// Provider usage
<AppStateProvider>
  <App />
</AppStateProvider>
```

#### Central Hooks

Hooks encapsulate cross-component logic and provide clean interfaces:

```tsx
// Hook usage
const { selectRecipeAndShowCalculator, openSettingsToTab } = useComponentIntegration();
```

#### Shared Services

Common services are accessible across components via hooks:

```tsx
// Service access
const { persistence } = useAppState();
persistence.save('key', data);
```

### Benefits

This integration architecture provides several benefits:

1. **Decoupling**: Components remain decoupled while still able to communicate effectively
2. **Testability**: Integration points can be easily mocked for testing
3. **Consistency**: Unified patterns for cross-component communication
4. **Extensibility**: New features can leverage existing integration points
5. **State Isolation**: Components can focus on their internal state, with integration handled separately

## Error Handling and Accessibility

The application implements comprehensive error handling and accessibility features to ensure reliability and usability for all users.

### Error Handling Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Error Boundary                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────┐        ┌───────────────────┐    │
│  │ Error Display │        │ Recovery Actions  │    │
│  └───────────────┘        └───────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────┐
│               Application Content                 │
└─────────────────────────────────────────────────┬─┘
                                                  │
                            ┌─────────────────────▼──────────────────────┐
                            │  Component-Level Try/Catch & Error States  │
                            └───────────────────────────────────────────┬┘
                                                                        │
                                        ┌───────────────────────────────▼───────┐
                                        │   Service-Level Error Handling        │
                                        └─────────────────────────────┬─────────┘
                                                                      │
                                                    ┌─────────────────▼─────────────┐
                                                    │      API Error Handling       │
                                                    └───────────────────────────────┘
```

#### Error Handling Components

1. **Application-Level Error Boundary**
   - **ErrorBoundary.tsx**: Class component using React's error boundary API
   - Catches JavaScript errors anywhere in the component tree
   - Displays fallback UI when errors occur
   - Provides error details and recovery options

2. **Component-Level Error States**
   - Components manage their own error states for operations
   - Consistent display of error messages with retry options
   - Granular error handling without affecting the entire application

3. **Service-Level Error Handling**
   - All service functions use try/catch blocks
   - Services return error objects with typed error codes
   - Detailed error information for debugging

4. **API Error Handling**
   - Standardized error response structure
   - HTTP status code mapping to application error types
   - Retry logic for transient errors

### Accessibility Architecture

The application follows Web Content Accessibility Guidelines (WCAG) 2.1 level AA standards through a comprehensive accessibility architecture.

```
┌──────────────────────────────────────────────────────┐
│            Accessibility Provider                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────┐     ┌────────────────────────┐   │
│  │ Keyboard       │     │ High Contrast &        │   │
│  │ Shortcuts      │     │ Focus Modes            │   │
│  └────────────────┘     └────────────────────────┘   │
│                                                      │
└────────────────────────────┬─────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────┐
│                 Skip Navigation                      │
└────────────────────────────┬─────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────┐
│          Semantic HTML & ARIA Attributes             │
└────────────────────────────┬─────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────┐
│        Focus Management & Keyboard Navigation        │
└───────────────────────────────────────────────────┬──┘
                                                    │
                              ┌────────────────────▼─────────────────┐
                              │    Motion & Animation Controls       │
                              └─────────────────────────────────────┬┘
                                                                    │
                                      ┌────────────────────────────▼────────────┐
                                      │    Color Contrast & Text Sizing         │
                                      └───────────────────────────────────────┬─┘
                                                                             │
                                           ┌────────────────────────────────▼─────┐
                                           │    Screen Reader Announcements       │
                                           └──────────────────────────────────────┘
```

#### Accessibility Components

1. **AccessibilityProvider**
   - Central provider for accessibility features
   - Manages keyboard shortcuts system
   - Controls high contrast and focus modes
   - Handles reduced motion preferences

2. **SkipToContent**
   - Allows keyboard users to bypass navigation
   - Appears on first tab press
   - Targets main content area

3. **Semantic Structure**
   - Proper heading hierarchy
   - Semantic HTML elements
   - ARIA landmarks for screen readers
   - Meaningful alt text for images

4. **Keyboard Navigation**
   - All interactive elements are keyboard accessible
   - Visible focus indicators
   - Logical tab order
   - Custom keyboard shortcuts

5. **Visual Accommodations**
   - High contrast mode
   - Focus mode for reduced visual complexity
   - Respect for user's motion preferences
   - Sufficient color contrast

### Implementation Principles

1. **Progressive Enhancement**
   - Core functionality works without JavaScript
   - Enhanced experience with JavaScript enabled

2. **Device Independence**
   - All functionality usable with keyboard only
   - Touch-friendly targets for mobile
   - Support for screen readers and other assistive technologies

3. **User Preferences**
   - Respect system preferences (dark mode, reduced motion)
   - User control over interface density and contrast
   - Persistent accessibility settings

4. **Testing**
   - Accessibility testing part of development process
   - Automated tests using axe-core
   - Manual testing with screen readers and keyboard navigation

This comprehensive approach to error handling and accessibility ensures that the application is robust and usable for all users, regardless of abilities or device constraints.