# Current Architecture and Pain Points

## Overview

The Satisfactory Production Planner is a React application using TypeScript that helps players calculate and visualize complex production chains for the game Satisfactory. The application calculates all required resources, intermediate products, and machines needed to achieve the desired output.

## Core Components

1. **DependencyTester.tsx** (789 lines)
   - The main orchestration component
   - Manages application state and UI interactions
   - Contains logic for calculating dependency trees
   - Handles node selection, recipe changes, and tree operations
   - **Pain Points**: Overly large component with too many responsibilities

2. **ItemNode.tsx** (996 lines)
   - Core visual component for displaying item information
   - Handles machine calculations, efficiency display, and user inputs
   - Contains complex state management for various interactions
   - **Pain Points**: Extremely large component with multiple concerns

3. **TreeNode.tsx** (179 lines)
   - Represents a node in the dependency tree
   - Manages node expansion state and rendering children
   - **Pain Points**: Tightly coupled with ItemNode logic

4. **calculateDependencyTree.ts** (182 lines)
   - Core calculation logic for dependency trees
   - Recursively builds the tree structure
   - **Pain Points**: Includes caching logic mixed with calculation logic

## State Management

### Redux Store Structure

1. **dependencySlice.ts**
   - Manages the state of dependency trees
   - Multiple dependency trees (map of trees)
   - Accumulated node data
   - **Pain Points**: Complex state structure with too many responsibilities

2. **recipeSelectionsSlice.ts**
   - Manages recipe selections for each node
   - **Pain Points**: Tightly coupled with dependency state

3. **uiSlice.ts**
   - Manages UI state (expanded/collapsed states, visibility toggles)
   - **Pain Points**: Mixed concerns between global and local UI state

### Local State Management

- Many components maintain their own complex local state
- Synchronization issues between local and global state
- **Pain Points**: Inconsistent state management patterns

## Core Features with Issues

### 1. Import/Export Functionality

**Current Implementation**:
- Nodes can import production from other trees
- Uses Redux to track import relationships
- Reference by unique node IDs

**Pain Points**:
- Circular dependency issues
- Updates to imported nodes don't properly propagate
- Imports break when trees are restructured

### 2. Machine Calculation

**Current Implementation**:
- Machine counts are calculated based on recipe time and item amount
- Uses machine multipliers to represent overclocking
- Calculates efficiency percentage

**Pain Points**:
- Recalculation performance issues with complex trees
- Machine count updates don't properly propagate through the tree
- Machine data is scattered across different components

### 3. Excess Production Handling

**Current Implementation**:
- Each node can have excess production specified
- Excess values affect child node calculations
- Stored in a global excessMap

**Pain Points**:
- Poor synchronization between UI and calculation
- Precision issues with floating-point calculations
- Complex cascading updates when values change

## Performance Issues

1. **Re-rendering Problems**:
   - Entire tree re-renders on small changes
   - No proper memoization or virtualization

2. **Calculation Performance**:
   - Recursive calculations cause performance bottlenecks
   - Inefficient caching strategy

3. **State Updates**:
   - Cascading state updates cause multiple renders
   - No batching of updates

## Code Organization Issues

1. **Large Components**:
   - Several components exceed 500 lines
   - Multiple concerns mixed within components

2. **Duplicated Logic**:
   - Similar calculation logic repeated in multiple places
   - UI patterns duplicated across components

3. **Tight Coupling**:
   - Components directly depend on implementation details of others
   - Dependencies not properly abstracted

## Type Definition Issues

1. **Incomplete Types**:
   - Some interfaces are missing properties
   - Inconsistent use of optional properties

2. **Type Safety Gaps**:
   - Any types used in several places
   - Implicit type conversions

## Proposed New Architecture

The proposed new architecture will address these issues by:

1. **Component Modularization**:
   - Breaking large components into smaller, focused ones
   - Using composition to build complex UI

2. **State Management Refactoring**:
   - Clearly separating UI and business logic
   - Using proper Redux patterns and selectors
   - Using context for UI-specific state

3. **Service Layer Introduction**:
   - Extracting calculation logic into services
   - Implementing proper caching and memoization
   - Creating clean APIs for component interaction

4. **Performance Optimization**:
   - Implementing proper memoization
   - Using virtualization for large trees
   - Batching state updates

5. **Type System Improvements**:
   - Completing and extending interfaces
   - Removing any types where possible
   - Using generics for reusable components 