# Project Structure Documentation

This document outlines the structure of the Satisfactory Playground project.

## `src/`

The main source code directory.

### `src/assets/`

Contains static assets like images (e.g., item icons).

### `src/components/`

Contains **globally reusable UI components** forming the application's UI toolkit. These components are generally presentational and not tied to specific application features.

- **`src/components/shared/`**: Contains smaller, fundamental UI pieces (e.g., `StyledInput`, `RateDisplay`, `EfficiencyIndicator`) often used to compose larger components within `src/components/`. Exports are bundled in `src/components/shared/index.ts`.
- Larger reusable components like `RefactoredCommandBar`, `Icon`, `ItemSelect`, `RecipeSelect`, and generic layout components like `FactoryPlannerLayout` reside directly here.
- Exports for this directory (including re-exporting from `shared`) are bundled in `src/components/index.ts`.

### `src/data/`

Handles data fetching, storage (Dexie.js), and initial loading from static sources (`data.json`).

- `dexieDB.ts`: Defines the Dexie.js database schema and instance.
- `dexieInit.ts`: Handles database initialization and population.
- `dbQueries.ts`: Provides functions for querying the Dexie database.
- `dataLoader.ts`: Loads initial raw data from `public/data.json`.
- Exports are bundled in `src/data/index.ts`.

### `src/features/`

Contains code organized by application feature domain.

- **`src/features/factory-planner/`**: Houses the core logic and UI for the **factory planning feature**.
    - `components/`: Contains React components **specifically related to the factory planner feature**. They often consume feature-specific hooks/state and understand the feature's data structures (e.g., `ItemNode`, `TreeNode`, `DependencyTree`, `RefactoredDependencyTester`). Exports are bundled in `index.ts`.
    - `hooks/`: Contains React hooks specific to the factory planner logic (e.g., `useFactoryPlanner.ts`).
    - `store/`: Contains Redux slices related to the factory planner state (e.g., `dependencySlice`, `recipeSelectionsSlice`). Exports are bundled in `index.ts`.

### `src/hooks/`

Contains **globally reusable** custom React hooks (if any emerge that aren't feature-specific).
*(Currently empty)*

### `src/store/`

Contains Redux store setup and **globally shared state slices** (if any).

- `index.ts`: Configures the main Redux store and combines reducers.
- `dataSlice.ts`: Potentially holds globally relevant data state.

### `src/styles/`

Contains global styling files and theme configuration.

- `theme.ts`: Defines the application's style constants.
- `App.css`: Global CSS styles.
- `index.css`: Base CSS setup.

### `src/types/`

Contains shared TypeScript type definitions and interfaces used across multiple modules/features.

- `index.ts`: Exports common types (e.g., `Item`, `Recipe`, `DependencyNode`).

### `src/utils/`

Contains general utility functions reusable across the application.

- Contains various calculation and helper functions.
- Exports are bundled in `src/utils/index.ts`.

### Root Files

- `main.tsx`: Application entry point.
- `App.tsx`: Root React component.
- `vite-env.d.ts`: Vite environment types.

## `public/`

Contains static files served directly.

- `data.json`: Raw game data.

## `docs/`

Contains project documentation.

- `PROJECT_STRUCTURE.md`: This file.

## Root Directory

Contains project configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`, etc.). 