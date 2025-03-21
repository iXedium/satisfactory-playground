# Global State Management Refactoring

## Current State Analysis

The current state management system in the Satisfactory Production Planner has several issues:

1. **Fragmented State**: Data is split across Redux store and local component state (useState).
2. **Inconsistent Persistence**: Some state is saved to localStorage directly from components, while other state is saved via Redux slices.
3. **Duplicated Logic**: Similar state management logic is duplicated across multiple components.
4. **Mixed Responsibilities**: The DependencyTester component handles too many responsibilities including state loading/saving.
5. **Lack of Type Safety**: Some parts of the state lack proper TypeScript interfaces.
6. **Poor Modularity**: State slices don't follow consistent patterns or have clear boundaries.

## Refactoring Goals

1. **Centralize State Management**: Move all application state to Redux where appropriate
2. **Improve Data Persistence**: Create a consistent pattern for data persistence
3. **Enhance Type Safety**: Strengthen typing across the entire state
4. **Create Better Abstractions**: Clear, well-defined state slices with minimal overlap
5. **Improve Performance**: Optimize state updates and selectors
6. **Simplify Components**: Remove state management from presentational components

## Refactoring Strategy

### 1. Define State Architecture

The global state will be organized into the following slices:

1. **dataSlice**: Core game data (items, recipes, machines)
2. **uiSlice**: UI state (expanded nodes, selected views, sidebar state)
3. **dependencySlice**: Dependency trees and accumulated node data
4. **recipeSelectionsSlice**: Selected recipes for nodes
5. **machineSlice**: Machine counts, multipliers, and efficiency
6. **settingsSlice**: User preferences and application settings
7. **importExportSlice**: Import/export state

### 2. Create Persistence Service

Create a dedicated service for state persistence that will:

1. Save state to localStorage in a consistent way
2. Handle versioning and migrations
3. Manage storage limits and error handling
4. Provide hooks for component usage

```typescript
// Example persistence service interface
export interface PersistenceService {
  saveState<T>(key: string, state: T): void;
  loadState<T>(key: string, defaultValue: T): T;
  clearState(key?: string): void;
  migrateState(migrations: Migration[]): void;
}
```

### 3. Refactor Redux Slices

Each slice will:
- Have a clear, well-defined responsibility
- Include proper TypeScript interfaces
- Use createSlice with proper reducers
- Export selectors for accessing state
- Include persistence logic where appropriate

#### Data Slice

```typescript
// Example refined dataSlice
export interface DataState {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  machines: Record<string, Machine>;
  isLoaded: boolean;
  version: number;
}
```

#### UI Slice

```typescript
// Example refined uiSlice
export interface UIState {
  expandedNodes: Record<string, boolean>;
  viewMode: 'tree' | 'accumulated' | 'power' | 'calculator';
  activeTabIndex: number;
  isSidebarOpen: boolean;
  searchTerm: string;
  sortOptions: {
    field: string;
    direction: 'asc' | 'desc';
  };
  filters: {
    showByproducts: boolean;
    showIntermediates: boolean;
    showRawMaterials: boolean;
  };
}
```

#### Machine Slice

```typescript
// Example refined machineSlice
export interface MachineState {
  machineCount: Record<string, number>;
  machineMultiplier: Record<string, number>;
  efficiency: Record<string, number>;
  extensions: Record<string, boolean>;
}
```

### 4. Create Dedicated Hooks

Provide dedicated hooks for each slice that:
- Access state via selectors
- Dispatch actions to update state
- Provide calculated values and utility functions
- Handle side effects and business logic

```typescript
// Example custom hook for UI state
export function useUIState() {
  // Access state
  const expandedNodes = useSelector(selectExpandedNodes);
  const viewMode = useSelector(selectViewMode);
  
  // Create action dispatchers
  const dispatch = useDispatch();
  const setViewMode = useCallback((mode) => {
    dispatch(actions.setViewMode(mode));
  }, [dispatch]);
  
  // Derived state and utilities
  const isNodeExpanded = useCallback((nodeId) => {
    return expandedNodes[nodeId] ?? true;
  }, [expandedNodes]);
  
  return {
    viewMode,
    expandedNodes,
    isNodeExpanded,
    setViewMode,
    // ...other actions and utilities
  };
}
```

### 5. Implement State Persistence

Add persistence to each slice:

```typescript
// Example middleware approach
const persistenceMiddleware = createMiddleware((getState, dispatch) => next => action => {
  const result = next(action);
  const state = getState();
  
  // Persist specific slices when they change
  if (isSettingsAction(action)) {
    persistenceService.saveState('settings', state.settings);
  }
  
  return result;
});
```

### 6. Refactor Component State

1. Move local state to Redux where appropriate
2. Use existing state where possible to avoid duplication
3. Keep ephemeral UI state local to components
4. Ensure consistent patterns for all components

### 7. Update Documentation

Create comprehensive documentation for:
1. State architecture overview
2. State slice responsibilities
3. Usage guidelines for hooks
4. State persistence patterns
5. Migration strategy for future changes

## Implementation Plan

### Phase 1: Core Infrastructure

1. Create the `PersistenceService`
2. Define interfaces for state slices
3. Create selector utility functions
4. Set up Redux middleware for persistence

### Phase 2: Slice Refactoring

1. Refactor `dataSlice` to handle all game data
2. Create or improve `uiSlice` for UI state
3. Refactor `dependencySlice` for cleaner tree management
4. Update `recipeSelectionsSlice` with improved selectors
5. Create `machineSlice` for machine-related state
6. Update `settingsSlice` selectors and actions
7. Refine `importExportSlice` for better integration

### Phase 3: Hook Implementation

1. Create or update hooks for each slice
2. Migrate component usage to new hooks
3. Ensure proper memoization and optimization
4. Add documentation for each hook

### Phase 4: Component Updates

1. Update DependencyTester to use new state management
2. Refactor tree components to use centralized state
3. Update accumulated view components
4. Update UI components to use centralized state

### Phase 5: Testing and Validation

1. Test state persistence across application restarts
2. Validate proper state synchronization
3. Check for performance regressions
4. Ensure all components render correctly

## Benefits

1. **Improved Maintainability**: Clear state structure makes code easier to understand and maintain
2. **Better Performance**: Optimized selectors and reduced re-renders
3. **Enhanced Developer Experience**: Consistent patterns make working with state easier
4. **Simplified Components**: Components focus on rendering, not state management
5. **Future-Proof Architecture**: Well-structured state enables easier feature additions
6. **Better Error Handling**: Centralized error handling and recovery
7. **Improved Testing**: Isolated state logic is easier to test

## Migration Support

For backward compatibility during migration:
1. Support both old and new state formats where needed
2. Add migrations for existing localStorage data
3. Use wrapper components/HOCs where necessary
4. Provide clear upgrade path for component state usage 