# Project Structure Documentation

This document outlines the structure of the Satisfactory Playground project.

## File Structure Schematic

```
.
├── docs/
│   ├── PROJECT_STRUCTURE.md
│   └── import-export-redesign.md
├── public/
│   ├── data.json
│   ├── icons.webp
│   └── vite.svg
├── src/
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── shared/
│   │   │   ├── ActionButtons.tsx
│   │   │   ├── AccumulatedViewControls.tsx
│   │   │   ├── CategorySection.tsx
│   │   │   ├── ChainCreatorControls.tsx
│   │   │   ├── DisplayOptions.tsx
│   │   │   ├── EfficiencyIndicator.tsx
│   │   │   ├── EfficiencySection.tsx
│   │   │   ├── ExcessControls.tsx
│   │   │   ├── FactoryPlannerLayout.tsx
│   │   │   ├── ImportExport.tsx
│   │   │   ├── ItemDetails.tsx
│   │   │   ├── ItemNodeButtons.tsx
│   │   │   ├── MachineControls.tsx
│   │   │   ├── MachineDetails.tsx
│   │   │   ├── PlannerActions.tsx
│   │   │   ├── PlannerContent.tsx
│   │   │   ├── RateDisplay.tsx
│   │   │   ├── ResourceSummary.tsx
│   │   │   ├── SearchSection.tsx
│   │   │   ├── SettingsMenu.tsx
│   │   │   ├── SortingControls.tsx
│   │   │   ├── StyledCheckbox.tsx
│   │   │   ├── StyledInput.tsx
│   │   │   ├── StyledSelect.tsx
│   │   │   ├── StyledSwitch.tsx
│   │   │   ├── SummarySidebar.tsx
│   │   │   ├── TreeNodeManager.tsx
│   │   │   ├── TreeViewContainer.tsx
│   │   │   ├── TreeViewManager.tsx
│   │   │   ├── ViewModeToggle.tsx
│   │   │   ├── ViewOptionsPanel.tsx
│   │   │   ├── ViewTreeControls.tsx
│   │   │   └── index.ts
│   │   ├── DropdownPortal.tsx
│   │   ├── Icon.tsx
│   │   ├── ItemSelect.tsx
│   │   ├── RecipeSelect.tsx
│   │   ├── CommandBar.tsx
│   │   ├── ViewModeSwitch.tsx
│   │   └── index.ts
│   ├── data/
│   │   ├── dataLoader.ts
│   │   ├── dbQueries.ts
│   │   ├── dexieDB.ts
│   │   ├── dexieInit.ts
│   │   └── index.ts
│   ├── features/
│   │   └── factory-planner/
│   │       ├── components/
│   │       │   ├── AccumulatedResourceView.tsx
│   │       │   ├── AccumulatedViewControls.tsx
│   │       │   ├── DependencyTree.tsx
│   │       │   ├── FactoryPlanner.tsx
│   │       │   ├── ItemNode.tsx
│   │       │   ├── ListNode.tsx
│   │       │   ├── TreeNode.tsx
│   │       │   └── index.ts
│   │       ├── hooks/
│   │       │   ├── useFactoryPlanner.ts
│   │       │   ├── useGroupedAccumulatedItems.ts
│   │       │   ├── useItemFilteringSorting.ts
│   │       │   ├── usePlannerDataManagement.ts
│   │       │   ├── usePlannerDebugTools.ts
│   │       │   ├── usePlannerDisplayOptions.ts
│   │       │   ├── usePlannerExcessHandling.ts
│   │       │   ├── usePlannerImportExport.ts
│   │       │   ├── usePlannerItemSelection.ts
│   │       │   ├── usePlannerNodeInteractions.ts
│   │       │   ├── usePlannerNodeState.ts
│   │       │   ├── usePlannerPersistence.ts
│   │       │   ├── usePlannerRecipeManagement.ts
│   │       │   └── usePlannerTreeCalculation.ts
│   │       └── store/
│   │           ├── dependencySlice.ts
│   │           ├── importExportLogic.ts
│   │           ├── productionUpdateLogic.ts
│   │           ├── recipeSelectionsSlice.ts
│   │           ├── treeUiSlice.ts
│   │           └── index.ts
│   ├── hooks/
│   │   └── (empty)
│   ├── store/
│   │   ├── dataSlice.ts
│   │   └── index.ts
│   ├── styles/
│   │   ├── App.css
│   │   ├── constants.ts
│   │   ├── iconStyles.ts
│   │   ├── itemSelectStyles.ts
│   │   ├── recipeSelectStyles.ts
│   │   └── theme.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── calculateAccumulatedFromTree.ts
│   │   ├── calculateDependencyTree.ts
│   │   ├── importNodeLogic.ts
│   │   ├── nodeReferenceUtils.ts
│   │   ├── treeCalculationCache.ts
│   │   ├── treeDiffing.ts
│   │   ├── treeUtils.ts
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .gitignore
├── eslint.config.js
├── index.html
├── jest.config.js
├── launch-app.bat
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── yarn.lock
```

## `src/`

The main source code directory.

### `src/assets/`

Contains static assets primarily used during development or build time.

- `react.svg`: Default React logo asset (can likely be removed if unused).

### `src/components/`

Contains **globally reusable UI components** forming the application's UI toolkit. These components are generally presentational and not tied to specific application features.

- **`src/components/shared/`**: Contains smaller, fundamental UI pieces often used to compose larger components within `src/components/`.
    - `AccumulatedViewControls.tsx`: **NEW** - Renders controls (search, sort, filters) for the Accumulated Resource View.
    - `ChainCreatorControls.tsx`: **NEW** - Renders item/recipe selectors and the "Add" button for creating new production chains.
    - `PlannerActions.tsx`: **NEW** - Renders search input, settings menu button, and clear data button for the main toolbar.
    - `SettingsMenu.tsx`: **NEW** - Renders the settings gear button and the dropdown menu with display options checkboxes.
    - `ViewTreeControls.tsx`: **UPDATED** - Renders expand/collapse buttons and sorting controls for the dependency tree view in the main toolbar.
    - `ActionButtons.tsx`: Buttons for primary actions within a section.
    - `CategorySection.tsx`: Component for displaying item/recipe categories.
    - `ChainCreator.tsx`: UI for initiating a new production chain.
    - `DisplayOptions.tsx`: Controls for adjusting display settings.
    - `EfficiencyIndicator.tsx`: Visual indicator for machine efficiency.
    - `EfficiencySection.tsx`: Section displaying efficiency controls/info.
    - `ExcessControls.tsx`: UI for managing excess production output.
    - `FactoryPlannerLayout.tsx`: Basic layout structure for the planner view.
    - `ImportExport.tsx`: Components related to importing/exporting planner state.
    - `ItemDetails.tsx`: Displays details for a selected item.
    - `ItemNodeButtons.tsx`: Action buttons specific to item nodes in the tree.
    - `MachineControls.tsx`: UI for controlling machine settings (clock speed, recipe).
    - `MachineDetails.tsx`: Displays details for selected machines.
    - `PlannerContent.tsx`: Main content area wrapper for the planner.
    - `RateDisplay.tsx`: Formats and displays item/resource rates.
    - `ResourceSummary.tsx`: Displays a summary of input/output resources.
    - `SearchSection.tsx`: UI for searching items/recipes.
    - `SettingsPanel.tsx`: Panel for application-level settings.
    - `SortingControls.tsx`: UI for controlling sorting options.
    - `StyledCheckbox.tsx`: Custom styled checkbox component.
    - `StyledInput.tsx`: Custom styled input field.
    - `StyledSelect.tsx`: Custom styled select dropdown (likely complex).
    - `StyledSwitch.tsx`: Custom styled switch/toggle component.
    - `SummarySidebar.tsx`: **NEW** - Right-hand sidebar displaying aggregated item totals.
    - `TreeNodeManager.tsx`: Manages interactions or state for tree nodes.
    - `TreeViewContainer.tsx`: Container for the tree visualization.
    - `TreeViewManager.tsx`: Manages the state or interactions of the tree view.
    - `ViewModeToggle.tsx`: **DEPRECATED/UNUSED** - Was previously used for List/Tree view toggle.
    - `ViewOptionsPanel.tsx`: Panel containing various view options.
    - `index.ts`: Bundles and exports components from this directory.
- `CommandBar.tsx`: **REFACTORED** - The main command bar interface for the application. Now acts primarily as a layout container, assembling smaller shared components (`ViewTreeControls`, `PlannerActions`, `ChainCreatorControls`).
- `DropdownPortal.tsx`: Utility component for rendering dropdowns in a portal.
- `Icon.tsx`: Displays item/recipe icons using the sprite sheet (`public/icons.webp`).
- `ItemSelect.tsx`: A reusable dropdown component for selecting items.
- `RecipeSelect.tsx`: A reusable dropdown component for selecting recipes.
- `ViewModeSwitch.tsx`: **DEPRECATED/UNUSED** - Was previously used for List/Tree view toggle.
- `index.ts`: Bundles and exports components from `src/components/` (including re-exporting from `shared/`).

### `src/data/`

Handles data fetching, storage (Dexie.js), and initial loading from static sources (`data.json`).

- `dataLoader.ts`: Loads initial raw game data from `public/data.json`.
- `dbQueries.ts`: Provides async functions for querying the Dexie database (items, recipes, etc.).
- `dexieDB.ts`: Defines the Dexie.js database schema and initializes the `db` instance.
- `dexieInit.ts`: Handles database creation, initialization, and population from `dataLoader`.
- `index.ts`: Bundles and exports functions and instances from this directory.

### `src/features/`

Contains code organized by application feature domain.

- **`src/features/factory-planner/`**: Houses the core logic and UI for the **factory planning feature**.
    - `components/`: Contains React components **specifically related to the factory planner feature**.
        - `AccumulatedResourceView.tsx`: Displays the aggregated list of required resources. Now utilizes `useGroupedAccumulatedItems` and `useItemFilteringSorting` hooks for data processing and filtering/sorting logic, and renders `AccumulatedViewControls`.
        - `DependencyTree.tsx`: Renders the main dependency tree structure.
        - `ItemNode.tsx`: Component representing a single item node within the tree.
        - `ListNode.tsx`: **DEPRECATED/UNUSED** - Was previously used for an alternative list view representation.
        - `FactoryPlanner.tsx`: Main orchestrating component for the factory planner UI and logic.
        - `TreeNode.tsx`: Component representing a generic node in the tree view (wraps `ItemNode`).
        - `index.ts`: Bundles and exports components from this directory.
    - `hooks/`: Contains React hooks specific to the factory planner logic.
        - `useFactoryPlanner.ts`: **REFACTORED** - The primary hook for the factory planner feature. Now acts mainly as an **integrator**, assembling state and handlers from Redux and numerous specialized hooks. Manages loading/saving of core Redux state.
        - `useGroupedAccumulatedItems.ts`: **NEW** - Hook responsible for processing `accumulatedDependencies` from Redux, fetching related item/recipe data, and grouping items for display in the `AccumulatedResourceView`.
        - `useItemFilteringSorting.ts`: **NEW** - Hook managing state and logic for searching, sorting, and filtering items displayed in the `AccumulatedResourceView`.
        - `usePlannerDataManagement.ts`: **NEW** - Hook containing handlers for direct data manipulation (deleting trees, updating node properties, clearing saved data).
        - `usePlannerDebugTools.ts`: **NEW** - Hook containing utility and test functions previously in `useFactoryPlanner`, exposed via the `window` object for debugging.
        - `usePlannerDisplayOptions.ts`: **UPDATED** - Hook managing state and persistence for UI display options (show machines, etc.). No longer manages the old List/Tree view mode.
        - `usePlannerExcessHandling.ts`: **NEW** - Hook managing the complex logic for handling changes to node excess production, including dispatching updates and potentially managing UI refresh triggers.
        - `usePlannerImportExport.ts`: **NEW** - Hook containing handlers related to importing and exporting nodes between production trees.
        - `usePlannerItemSelection.ts`: **NEW** - Hook managing state related to selecting items/recipes for creating new production chains (item list, selections, recent items).
        - `usePlannerNodeInteractions.ts`: **NEW** - Hook containing handlers for simple UI interactions with nodes (expand/collapse, machine count/multiplier changes, toggle extensions).
        - `usePlannerNodeState.ts`: **NEW** - Hook managing local state overrides for individual nodes (excess map, machine maps, expanded nodes, extension overrides) and their persistence.
        - `usePlannerPersistence.ts`: **NEW** - Hook responsible for the side effect of saving the main Redux state slices (`dependencies`, `recipeSelections`) to `localStorage`.
        - `usePlannerRecipeManagement.ts`: **NEW** - Hook containing the handler for changing a recipe within an existing tree and triggering recalculation.
        - `usePlannerTreeCalculation.ts`: **NEW** - Hook containing handlers for creating new production trees (`handleCalculate`, `handleCreateNewTree`) and generating tree IDs.
    - `store/`: Contains Redux Toolkit slices related to the factory planner state.
        - `dependencySlice.ts`: Manages the state of the dependency tree itself (nodes, connections, calculations). Likely the largest and most complex slice.
        - `recipeSelectionsSlice.ts`: Manages the state of selected recipes for nodes.
        - `treeUiSlice.ts`: Manages UI-specific state for the tree view (e.g., expanded nodes, view options).
        - `index.ts`: Bundles and exports slices and selectors from this directory.

### `src/hooks/`

Contains **globally reusable** custom React hooks. *(Remains empty)*

### `src/store/`

Contains Redux store setup and **globally shared state slices**.

- `dataSlice.ts`: Holds globally relevant application data state (e.g., loaded status, potentially basic game data refs).
- `index.ts`: Configures the main Redux store using `configureStore` and combines reducers (root reducer).

### `src/styles/`

Contains global styling files, theme configuration, and potentially component-specific styles if not co-located.

- `App.css`: Global CSS styles, potentially including base styles and utility classes.
- `constants.ts`: Defines shared styling constants (e.g., colors, sizes) potentially used by `theme.ts` or styled-components.
- `iconStyles.ts`: Specific CSS styles related to the `Icon` component.
- `itemSelectStyles.ts`: Specific CSS styles related to the `ItemSelect` component.
- `recipeSelectStyles.ts`: Specific CSS styles related to the `RecipeSelect` component.
- `theme.ts`: Defines the application's style theme object (e.g., for MUI or styled-components).

### `src/types/`

Contains shared TypeScript type definitions and interfaces used across multiple modules/features.

- `index.ts`: Defines and exports common types (e.g., `Item`, `Recipe`, `DependencyNode`, `NodeId`, various planner-related types).

### `src/utils/`

Contains general utility functions reusable across the application, often pure functions.

- `calculateAccumulatedFromTree.ts`: Utility function to calculate accumulated resources based on a dependency tree.
- `calculateDependencyTree.ts`: **REFACTORED** - The core logic for calculating the production dependency tree. Now delegates caching to `treeCalculationCache` and import node creation to `importNodeLogic`. Uses utilities from `treeUtils`.
- `importNodeLogic.ts`: **NEW** - Contains helper functions specifically for creating import nodes (`createImportNode`) and managing their original children (`storeOriginalChildren`, `restoreOriginalChildren`).
- `nodeReferenceUtils.ts`: Utility functions for working with node references, paths, or related data structures within the tree.
- `treeCalculationCache.ts`: **NEW** - Manages the `Map`-based cache for memoizing `calculateDependencyTree` results.
- `treeDiffing.ts`: Utility functions potentially used for comparing different versions of the dependency tree state.
- `treeUtils.ts`: **NEW** - Consolidated helper functions for working with `DependencyNode` trees (e.g., `findNodeById`, `findParentNode`, `countNodes`, `getTreeDepth`).
- `index.ts`: Bundles and exports utility functions from this directory. **UPDATED** to include exports from new util files.

### Root Files (`src/`)

- `App.tsx`: The root React component, sets up routing, global layout, and providers.
- `index.css`: Base CSS setup and potentially CSS variable definitions. Included directly by `main.tsx`.
- `main.tsx`: The application entry point. Renders the root `App` component into the DOM, sets up Redux provider, etc.
- `vite-env.d.ts`: TypeScript definitions for Vite environment variables.

## `public/`

Contains static files served directly by the web server.

- `data.json`: Raw game data (items, recipes, buildings) loaded by `src/data/dataLoader.ts`.
- `icons.webp`: A sprite sheet containing icons for items, recipes, etc., used by the `src/components/Icon.tsx` component.
- `vite.svg`: Default Vite logo asset (can likely be removed if unused).

## `docs/`

Contains project documentation.

- `PROJECT_STRUCTURE.md`: This file, outlining the project layout.
- `import-export-redesign.md`: Documentation related to the import/export feature redesign.

## Root Directory (`./`)

Contains project configuration files, build scripts, and other top-level items.

- `.gitignore`: Specifies intentionally untracked files that Git should ignore.
- `eslint.config.js`: Configuration for ESLint, the code linter.
- `index.html`: The main HTML page into which the React application is injected.
- `jest.config.js`: Configuration for Jest, the testing framework.
- `launch-app.bat`: A batch script likely used for easily launching the development server on Windows.
- `package.json`: Defines project metadata, dependencies, and scripts.
- `README.md`: General information about the project.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript compiler configuration files.
- `vite.config.ts`: Configuration for Vite, the build tool and development server.
- `yarn.lock` / `package-lock.json`: Records exact dependency versions.
- Other potential files: `.vscode/`, `.git/`, `node_modules/`, `dist/` (build output). 