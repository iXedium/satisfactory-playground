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