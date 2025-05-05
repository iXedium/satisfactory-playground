# Software Design Document (SDD) - Satisfactory Playground

This document provides a detailed overview of the Satisfactory Playground application, including its purpose, functionality, features, and overall flow.

## 1. Purpose

Satisfactory Playground is a web-based tool designed to assist players of the game "Satisfactory" in planning and optimizing their factory production lines. Its primary goal is to provide a visual and interactive way to:

*   Calculate resource requirements for producing specific items at desired rates.
*   Visualize the complex dependency chains involved in production.
*   Manage and optimize production efficiency, including handling byproducts and resource allocation.
*   **Save named factory plans**, **load** previously saved plans, and **share** factory plans.
*   **Automatically restore the previous session** state on reload.
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
*   **Data Persistence:** Supports two modes:
    *   **Named Setups:** Users can explicitly save the current planner state (trees, settings, selections) with a custom name via the UI. These named setups can be loaded or deleted later. This uses a dedicated key (`plannerSetups`) in `localStorage`.
    *   **Automatic Session Restore:** The application automatically saves the current state (Redux state, node state, display options, etc.) to `localStorage` under special keys (`lastSession_...`). When the application is reloaded, this last state is automatically restored.
*   **Import/Export:** Allows users to import/export parts of or entire production trees, facilitating modular design and sharing (details might be in `import-export-redesign.md`).
*   **Customizable View Options:** Offers different ways to view the data, such as expanding/collapsing nodes, adjusting display settings (like showing machine details), sorting nodes, and using different view densities (**Compact view is now the default**). Compact view includes specific layout optimizations (e.g., horizontal recipe selector).
*   **Unsaved Changes Indicator:** The UI indicates when the current state differs from the last explicitly saved or loaded named setup.

## 3. Implemented Features (Based on Project Structure)

*   **Core Calculation Engine:** (`src/utils/calculateDependencyTree.ts`, `src/utils/calculateAccumulatedFromTree.ts`) Logic for calculating dependencies and resource totals. Includes caching (`src/utils/treeCalculationCache.ts`).
*   **Data Management:** (`src/data/`) Loading game data (`data.json`), storing it locally using Dexie.js (`dexieDB.ts`, `dexieInit.ts`), and querying it (`dbQueries.ts`). Fix implemented to ensure `availableRecipes` are correctly fetched for auto-imported roots.
*   **State Management:** Uses Redux Toolkit (`src/store/`, `src/features/factory-planner/store/`) to manage application state, including dependency trees (`dependencySlice.ts`), recipe choices (`recipeSelectionsSlice.ts`), UI state (`treeUiSlice.ts`), and global data status (`dataSlice.ts`).
*   **UI Components:**
    *   Reusable base components (`src/components/shared/`, `src/components/`).
    *   Feature-specific components for the factory planner (`src/features/factory-planner/components/`), including the `DependencyTree`, `AccumulatedResourceView`, `ItemNode`, etc.
    *   Main application layout (`App.tsx`) and command bar (`CommandBar.tsx`) which includes Save/Load dropdowns (`PlannerActions.tsx`).
*   **Feature Logic (Hooks):** Encapsulated logic for various planner aspects within custom React hooks (`src/features/factory-planner/hooks/`), promoting separation of concerns (e.g., `usePlannerTreeCalculation`, `usePlannerNodeInteractions`, `usePlannerPersistence`, `useGroupedAccumulatedItems`).
*   **Import/Export Infrastructure:** Specific logic (`importExportLogic.ts`, `usePlannerImportExport.ts`) including restored thunks for complex unimport actions (`unimportNodeThunk`, etc.).
*   **Persistence:** 
    *   **Named Setups:** Managed by `usePlannerSaveLoad` hook, storing multiple named states in `localStorage` (`plannerSetups` key).
    *   **Automatic Session Restore:** Handled by `useEffect` hooks within relevant state management hooks (`useFactoryPlanner`, `usePlannerNodeState`, `usePlannerDisplayOptions`, `usePlannerItemSelection`) using `lastSession_` prefixed keys in `localStorage`.
    *   `usePlannerPersistence` hook is likely deprecated/unused for saving, potentially only for initial load (now handled elsewhere).
*   **Unsaved Changes Tracking:** Logic within `usePlannerSaveLoad` compares current state to the last explicitly saved/loaded state using `lodash/isEqual` and a debounce (`use-debounce`), providing an `isDirty` flag.
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
    *   **Automatic Session Restore:** State hooks (`useFactoryPlanner`, `usePlannerNodeState`, etc.) attempt to load their state from `lastSession_` keys in `localStorage`. Redux state is loaded via dispatch in `useFactoryPlanner`.
    *   **Named Setup State:** `usePlannerSaveLoad` loads the name of the last active *named* setup and its corresponding state into memory for dirty checking.
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
5.  **Saving (Two Modes):**
    *   **Automatic Session Save:** Changes to Redux state or local hook states trigger `useEffect` hooks which save the current state to the corresponding `lastSession_` key in `localStorage` (debounced for some states).
    *   **Explicit Named Save:** User interacts with the Save dropdown in the `CommandBar` (`PlannerActions`). This triggers `saveSetup` in `usePlannerSaveLoad`, which gathers the complete current state, stores it under the chosen name in the `plannerSetups` object in `localStorage`, updates the last active setup tracker, and resets the dirty flag.
6.  **Explicit Named Load:**
    *   User interacts with the Load dropdown in the `CommandBar` (`PlannerActions`).
    *   This triggers `loadSetup` in `usePlannerSaveLoad`.
    *   The chosen named state is retrieved from `localStorage`.
    *   Redux state is updated via `dispatch`, local hook states are updated via setters.
    *   The last active setup tracker is updated, and the dirty flag is reset.
7.  **Import/Export:**
    *   User initiates import/export actions (`usePlannerImportExport.ts`).
    *   Specific logic handles the serialization/deserialization and merging/extraction of node data. Unimporting now uses restored complex logic via `importExportLogic.ts`.
8.  **Clear Data:**
    *   User clicks the Clear Data button (`PlannerActions`).
    *   The `clearSavedData` function (from `usePlannerDataManagement`) is called.
    *   Redux state and local hook states are reset to empty/default values.
    *   All `lastSession_` keys are removed from `localStorage`.

This flow involves continuous interaction between UI components, React hooks managing feature logic, Redux for state management, utility functions for calculations, and the data layer for accessing game data. 