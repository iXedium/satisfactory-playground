# Software Design Document (SDD) - Satisfactory Playground

This document provides a detailed overview of the Satisfactory Playground application, including its purpose, functionality, features, and overall flow.

## 1. Purpose

Satisfactory Playground is a web-based tool designed to assist players of the game "Satisfactory" in planning and optimizing their factory production lines. Its primary goal is to provide a visual and interactive way to:

*   Calculate resource requirements for producing specific items at desired rates.
*   Visualize the complex dependency chains involved in production.
*   Manage and optimize production efficiency, including handling byproducts and resource allocation.
*   Save, load, and share factory plans.
*   **Restore complex unimport logic**, including recalculating affected chains and removing unused source roots.
*   **Optimize all machines** in a chain simultaneously (Shift+Click).

## 2. Functionality & Capabilities

The application provides the following core functionalities:

*   **Production Chain Calculation:** Users can select a desired output item and rate, and the application calculates the required input resources, intermediate products, and necessary buildings (Assemblers, Manufacturers, etc.) based on available recipes.
*   **Dependency Tree Visualization:** The calculated production chain is displayed as an interactive dependency tree, showing the flow of items from raw resources to the final product.
*   **Accumulated Resource Summary:** Aggregates all raw resource inputs and intermediate product requirements across the entire plan or specific sub-trees.
*   **Recipe Selection & Management:** Allows users to choose alternative recipes for items and updates the production plan accordingly.
*   **Machine Configuration:** Users can adjust machine settings (e.g., clock speed) to see the impact on resource consumption and production rates.
*   **Excess/Byproduct Handling:** Provides mechanisms to visualize and potentially manage excess production or byproducts.
*   **Data Persistence:** Saves user-created factory plans locally (using `localStorage` and potentially Dexie.js for more complex state) for later retrieval.
*   **Import/Export:** Allows users to import/export parts of or entire production trees, facilitating modular design and sharing (details might be in `import-export-redesign.md`).
*   **Customizable View Options:** Offers different ways to view the data, such as expanding/collapsing nodes, adjusting display settings (like showing machine details), sorting nodes, and using different view densities (**Compact view is now the default**). Compact view includes specific layout optimizations (e.g., horizontal recipe selector).

## 3. Implemented Features (Based on Project Structure)

*   **Core Calculation Engine:** (`src/utils/calculateDependencyTree.ts`, `src/utils/calculateAccumulatedFromTree.ts`) Logic for calculating dependencies and resource totals. Includes caching (`src/utils/treeCalculationCache.ts`).
*   **Data Management:** (`src/data/`) Loading game data (`data.json`), storing it locally using Dexie.js (`dexieDB.ts`, `dexieInit.ts`), and querying it (`dbQueries.ts`). Fix implemented to ensure `availableRecipes` are correctly fetched for auto-imported roots.
*   **State Management:** Uses Redux Toolkit (`src/store/`, `src/features/factory-planner/store/`) to manage application state, including dependency trees (`dependencySlice.ts`), recipe choices (`recipeSelectionsSlice.ts`), UI state (`treeUiSlice.ts`), and global data status (`dataSlice.ts`).
*   **UI Components:**
    *   Reusable base components (`src/components/shared/`, `src/components/`).
    *   Feature-specific components for the factory planner (`src/features/factory-planner/components/`), including the `DependencyTree`, `AccumulatedResourceView`, `ItemNode`, etc.
    *   Main application layout (`App.tsx`) and command bar (`CommandBar.tsx`).
*   **Feature Logic (Hooks):** Encapsulated logic for various planner aspects within custom React hooks (`src/features/factory-planner/hooks/`), promoting separation of concerns (e.g., `usePlannerTreeCalculation`, `usePlannerNodeInteractions`, `usePlannerPersistence`, `useGroupedAccumulatedItems`).
*   **Import/Export Infrastructure:** Specific logic (`importExportLogic.ts`, `usePlannerImportExport.ts`) including restored thunks for complex unimport actions (`unimportNodeThunk`, etc.).
*   **Persistence:** Saving core Redux state to `localStorage` (`usePlannerPersistence.ts`). UI state for nodes (`usePlannerNodeState`) and display options (`usePlannerDisplayOptions`) also persisted.
*   **Debugging Tools:** Exposed utilities for debugging (`usePlannerDebugTools.ts`).

## 4. Potential Future Implementations (Inferred)

*   **Advanced Optimization:** Features like automatically selecting the "best" recipes based on resource availability or power consumption.
*   **Power Grid Planning:** Calculating power requirements and potentially visualizing the power network.
*   **Multi-Factory Management:** Support for planning multiple independent factories or sites.
*   **Cloud Sync/Sharing:** Saving plans to a central server for access across devices or sharing with others.
*   **Enhanced Visualization:** More sophisticated graphical representations of the factory layout or item flow.
*   **Integration with Save Files:** Directly importing factory layouts or production stats from game save files.

## 5. Application Flow (High-Level)

1.  **Initialization:**
    *   The application loads (`main.tsx`, `App.tsx`).
    *   Game data is loaded from `public/data.json` and initialized into the Dexie.js database (`dexieInit.ts`).
    *   Global state (e.g., data loaded status) is managed in Redux (`dataSlice.ts`).
    *   Previously saved planner state (dependency trees, recipe selections, UI state including view density set to 'compact' by default) might be loaded from `localStorage` (`usePlannerPersistence.ts`, `useFactoryPlanner.ts`).
2.  **User Interaction (Planning):**
    *   The user interacts with the `CommandBar` or other UI elements (`ChainCreatorControls`, `ItemSelect`, `RecipeSelect`) to specify an item and desired rate to produce.
    *   An action is triggered (`usePlannerTreeCalculation.ts` -> `handleCreateNewTree`). This process now ensures `availableRecipes` are correctly populated for the new root node.
    *   The core calculation logic (`calculateDependencyTree.ts`) is invoked, using game data queried from Dexie (`dbQueries.ts`).
    *   The resulting dependency tree data structure is stored in the Redux state (`dependencySlice.ts`).
3.  **Visualization & Display:**
    *   React components subscribe to the Redux store.
    *   The `DependencyTree` component renders the tree structure based on the `dependencySlice` state.
    *   The `AccumulatedResourceView` component calculates and displays aggregated resource requirements using data from the store and helper hooks/utils (`useGroupedAccumulatedItems`, `calculateAccumulatedFromTree.ts`).
    *   Other components (`ItemNode`, `TreeNode`, etc.) render specific parts of the UI.
4.  **Modification & Refinement:**
    *   Users interact with nodes in the tree (e.g., changing recipes (`usePlannerRecipeManagement.ts`), adjusting machine counts/clockspeed (`usePlannerNodeInteractions.ts`), managing excess (`usePlannerExcessHandling.ts`), optimizing all machines (`useFactoryPlanner.ts` orchestrating calls via `usePlannerNodeInteractions.ts`), selecting/completing nodes (`usePlannerNodeState.ts`), unimporting nodes (`usePlannerImportExport.ts` dispatching `unimportNodeThunk`)).
    *   These interactions dispatch actions to update the Redux state (primarily `dependencySlice`, `recipeSelectionsSlice`, and potentially local state managed by `usePlannerNodeState.ts`).
    *   Updating the state triggers recalculations (potentially memoized/cached) and re-rendering of affected components.
5.  **Saving:**
    *   Changes to the core planner state in Redux (`dependencies`, `recipeSelections`) automatically trigger saving to `localStorage` via `usePlannerPersistence.ts`. UI state might be saved separately (`usePlannerNodeState`, `usePlannerDisplayOptions`).
6.  **Import/Export:**
    *   User initiates import/export actions (`usePlannerImportExport.ts`).
    *   Specific logic handles the serialization/deserialization and merging/extraction of node data. Unimporting now uses restored complex logic via `importExportLogic.ts`.

This flow involves continuous interaction between UI components, React hooks managing feature logic, Redux for state management, utility functions for calculations, and the data layer for accessing game data. 