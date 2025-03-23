# Satisfactory Playground Project Handover

## Project Overview

The Satisfactory Playground is a TypeScript/React application designed to help calculate and visualize production chains for the game Satisfactory. It allows users to:

- Create dependency trees for items
- Calculate resource requirements
- Optimize machine usage and efficiency
- Visualize production in both tree and accumulated views
- Import/export production setups
- Manage recipes and machine configurations

The project uses React for the UI, Redux for state management, and TypeScript for type safety. The application uses a component-based architecture with hooks for business logic.

## Architecture

The codebase follows a typical React/Redux architecture:

- `/src/components`: UI components for the application
- `/src/hooks`: Custom React hooks for business logic
- `/src/services`: Service classes for calculations, imports/exports, etc.
- `/src/features`: Redux slices (using Redux Toolkit)
- `/src/store`: Redux store configuration
- `/src/types`: TypeScript type definitions
- `/src/utils`: Utility functions
- `/src/data`: Data access layer (using Dexie.js for IndexedDB)
- `/src/styles`: Styling utilities and theme definitions

## Completed Tasks

We've been working on refactoring and enhancing the codebase, with a focus on type safety and component structure. Specifically:

1. Updated the `AccumulatedNode` interface to include `item` and `primaryNodeId` properties
2. Added the `ImportRelationship` interface to core.ts
3. Fixed the `nodeId` property in the `TreeNodeItem` component to properly pass it to the `ItemNode` component
4. Updated the `Item` interface to include the `icon` property
5. Added the `efficiency` property to the `Machine` interface
6. Added the `name` property to the `MachineCalculationResult` interface
7. Added the `description` property to the `Item` interface
8. Fixed the UIState interface to match what's being used in components
9. Created `nodeHelpers.ts` utility file with functions for safe tree traversal and manipulation, handling undefined children correctly
10. Fixed type compatibility issues in hooks that use DependencyNode
11. Fixed the createImportNode function parameters
12. Added the AppThunk type in the store/index.ts file
13. Fixed the TS errors in RecentItems.tsx related to items typing
14. Fixed the RequirementsOutput.tsx icon access issue
15. Fixed the MachineSection.tsx optimalCount issue
16. Created UI component exports for Modal and other UI components

## Remaining Tasks

There are still several TypeScript errors and issues that need to be addressed:

1. Fix power calculation in the usePowerCalculation.ts hook by updating the getAllNodesInTree function to use the safe node helpers
2. Resolve issues with the RecipeSelection component not using the correct SelectOption type
3. Ensure the card title issue is resolved
4. Fix remaining Redux state structure inconsistencies
5. Address the remaining 64 TypeScript errors across 18 files
6. Ensure compatibility between different versions of the DependencyNode interface
7. Resolve issues with the import/export functionality
8. Fix UI theme properties used by components but not defined in the theme

## Key Files

Here are the most important files to understand:

1. `src/types/core.ts`: Contains all the core type definitions for the application
2. `src/features/*Slice.ts`: Redux slices for state management
3. `src/components/tree/TreeNodeItem.tsx`: Component for rendering tree nodes
4. `src/components/accumulated/AccumulatedView.tsx`: Component for the accumulated view
5. `src/hooks/useAccumulatedView.ts`: Hook for managing the accumulated view
6. `src/hooks/useImportManagement.ts`: Hook for managing imports between trees
7. `src/services/import/importService.ts`: Service for handling import operations
8. `src/services/calculation/accumulatedViewService.ts`: Service for calculating the accumulated view
9. `src/utils/nodeHelpers.ts`: Utility functions for safely working with tree nodes (handling undefined children)
10. `src/utils/uiHelpers.ts`: UI utility functions
11. `src/styles/theme.ts`: Theme definitions for the application

## New Utility: nodeHelpers.ts

We've created a new utility file `src/utils/nodeHelpers.ts` that provides safe operations for working with dependency tree nodes. This is crucial because the `children` property can be undefined in some cases. The utility includes functions for:

- Safely checking if a node has children (`hasChildren`)
- Safely getting node children as an array, handling undefined (`getNodeChildren`)
- Mapping over node children safely (`mapNodeChildren`)
- Iterating over node children safely (`forEachNodeChild`)
- Finding nodes by ID in a tree (`findNodeInTree`)
- Getting all nodes in a tree (`getAllNodesInTree`)
- Cloning node trees (`cloneNodeTree`)

These utilities should be used consistently throughout the codebase instead of directly accessing `node.children` to prevent TypeScript errors and potential runtime issues.

## Important Type Definitions

The following interfaces are central to understanding the application:

1. `DependencyNode`: Represents a node in the dependency tree
2. `AccumulatedNode`: Represents a node in the accumulated view
3. `Item`: Represents an item in the game
4. `Recipe`: Represents a crafting recipe
5. `Machine`: Represents a machine in the game
6. `ImportRelationship`: Represents an import relationship between trees
7. `RootState`: The overall Redux state structure

## Known Issues

1. Inconsistent typing of the `DependencyNode` interface - sometimes it's imported from `../types/core` and sometimes from `../utils/calculateDependencyTree`
2. The `children` property of `DependencyNode` needs to be optional (`children?: DependencyNode[]`) in some places but is required in others
3. Redux state structure doesn't match what components expect, particularly with `recipeSelections` and `machines`
4. Theme colors referenced in components don't all exist in the theme definition
5. Shell commands via the terminal seem to be failing in the current session

## Next Steps

1. Fix remaining TypeScript errors by updating the usePowerCalculation.ts file to use the new nodeHelpers functions
2. Update the DependencyNode interface consistently across the codebase to have optional children
3. Update the Redux store to include all required slices
4. Add missing theme properties
5. Test the application to ensure all functionality works as expected

## Referenced Documents

Make sure to reference the following files to understand the project better:

1. `docs/ARCHITECTURE.md` - Contains information about the project architecture
2. `docs/REFACTORING.md` - Details about the refactoring process
3. `docs/MIGRATION_PLAN.md` - Plan for migrating to the new architecture
4. `docs/GLOBAL_STATE_REFACTORING.md` - Information about the Redux state refactoring

## Build and Development

The project uses:
- TypeScript for type checking
- Vite for building and development
- React for UI components
- Redux/Redux Toolkit for state management
- Dexie.js for IndexedDB access

To build the project, use:
```
yarn build
```

For development, user uses - but ai should not run that since user is using Vite and has app always running and hot updating: 
```
yarn dev
```

## Summary

This project is a complex React/TypeScript application for calculating and visualizing production chains in Satisfactory. The main focus has been on improving type safety, component structure, and overall code quality. There are still several TypeScript errors that need to be fixed, particularly around the DependencyNode interface and Redux state structure.

The application uses a component-based architecture with hooks for business logic, services for calculations, and Redux for state management. The main views are the tree view and accumulated view, which provide different ways to visualize production chains.

Going forward, the focus should be on fixing the remaining TypeScript errors, ensuring consistent interface usage, and testing the application to ensure functionality works as expected. 