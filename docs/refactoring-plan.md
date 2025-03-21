# Refactoring Plan

## Overview

This document outlines the step-by-step refactoring plan for the Satisfactory Production Planner application. The goal is to improve code organization, performance, and maintainability while ensuring existing functionality remains intact.

## Phase 1: Preparation (Current Phase)

### 1.1 Testing Infrastructure

- ✅ Setup Jest and React Testing Library
- ✅ Create basic tests for core functionality
- ✅ Document current architecture and pain points

### 1.2 Define New Architecture

- ✅ Define folder structure and module boundaries
- Create interfaces for core data structures and services
- Document expected component responsibilities

### 1.3 Identify Key Refactoring Targets

Priority components to refactor:
1. ItemNode.tsx (996 lines)
2. DependencyTester.tsx (789 lines)
3. calculateDependencyTree.ts (182 lines)

## Phase 2: Core Logic Extraction

### 2.1 Create Service Layer

Create the following services:

```
src/services/
├── calculation/
│   ├── dependencyTreeService.ts       # Tree calculation logic
│   ├── machineCalculationService.ts   # Machine calculation logic
│   └── accumulatedViewService.ts      # Accumulated view calculations
├── import/
│   └── importService.ts               # Import/export logic
└── cache/
    └── cacheService.ts                # Caching mechanisms
```

### 2.2 Extract Calculation Logic

- Move tree calculation logic from calculateDependencyTree.ts to dependencyTreeService.ts
- Separate caching logic into cacheService.ts
- Create proper interfaces for all service methods

### 2.3 Create Hooks Layer

Create the following custom hooks:

```
src/hooks/
├── useItemData.ts            # Item data fetching
├── useRecipeSelection.ts     # Recipe selection logic
├── useMachineCalculation.ts  # Machine calculations
├── useTreeOperations.ts      # Tree manipulation
└── useTreeState.ts           # Tree state management
```

### 2.4 Refactor Redux Store

- Split dependencySlice.ts into smaller, focused slices
- Create proper selectors for all state access
- Implement normalized state where appropriate

## Phase 3: Component Modularization

### 3.1 Break Down ItemNode Component

Refactor ItemNode.tsx into multiple smaller components:

```
src/components/nodes/ItemNode/
├── index.tsx               # Main component & composition
├── ItemHeader.tsx          # Item display & info
├── MachineSection.tsx      # Machine-related UI & logic
├── RecipeSection.tsx       # Recipe selection UI & logic
├── ExcessSection.tsx       # Excess production UI & logic
└── ItemFooter.tsx          # Actions & additional info
```

### 3.2 Break Down DependencyTester Component

Refactor DependencyTester.tsx into multiple smaller components:

```
src/components/
├── DependencyTester/
│   ├── index.tsx               # Main component & composition
│   ├── ItemSelector.tsx        # Item selection form
│   ├── CommandBarContainer.tsx # Command bar container
│   └── ViewModeSelector.tsx    # View mode toggle
├── TreeView/
│   └── index.tsx               # Tree view container
└── AccumulatedView/
    └── index.tsx               # Accumulated view container
```

### 3.3 Implement Component Composition

- Use composition instead of prop drilling
- Create context providers where appropriate
- Implement proper component memoization

## Phase 4: Feature Improvements

### 4.1 Fix Import/Export Functionality

- Redesign import/export data flow
- Implement proper validation and circular dependency detection
- Create clear visual indicators for imported nodes

### 4.2 Improve Machine Calculation

- Create a unified machine calculation system
- Implement proper propagation of machine changes
- Add optimization options for machine efficiency

### 4.3 Implement Tree View Enhancements

- Add list view features to tree view
- Implement virtualization for large trees
- Add collapsible sections for better organization

## Phase 5: Performance Optimization

### 5.1 Minimize Re-renders

- Implement React.memo with proper equality checks
- Use useMemo for expensive calculations
- Create stable callback references with useCallback

### 5.2 Optimize State Updates

- Batch related state updates
- Use immer for immutable updates
- Implement selective re-rendering

### 5.3 Implement Virtualization

- Use react-window for virtualized lists
- Implement tree virtualization
- Optimize large data set handling

## Implementation Strategy

### Incremental Approach

1. Start with core services and hooks
2. Refactor small, isolated components first
3. Gradually replace large components with modular alternatives
4. Maintain test coverage throughout the process

### Testing Strategy

1. Write tests before refactoring
2. Ensure tests pass during and after refactoring
3. Add integration tests for component interactions
4. Test edge cases and performance scenarios

### Deployment Strategy

1. Develop refactoring in feature branches
2. Create frequent checkpoints with working code
3. Use feature flags to control rollout of changes
4. Monitor performance metrics during implementation 