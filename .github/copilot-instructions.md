# Satisfactory Playground - AI Coding Agent Instructions

## Project Overview
Satisfactory Playground is a React + TypeScript + Vite web application for planning and optimizing production chains in the game Satisfactory. It calculates resource requirements, visualizes dependency trees, manages recipes, and persists factory plans.

**Before any significant work:** Consult [docs/SDD.md] for feature overview and application flow.

## Architecture Essentials

### Core Data Flow
1. **Game Data Layer** (`src/data/`):
   - `dataLoader.ts` imports `public/data.json` (items, recipes)
   - `dexieDB.ts` + `dexieInit.ts`: Local IndexedDB storage via Dexie
   - `dbQueries.ts`: Query interface for items/recipes
   - Redux `dataSlice.ts`: Tracks data load status globally

2. **State Management** (`src/store/` + `src/features/factory-planner/store/`):
   - **Redux Toolkit**: Global state (Redux Thunk for async operations)
   - `dependencySlice.ts`: Tree structure and node data
   - `recipeSelectionsSlice.ts`: User's recipe choices
   - `treeUiSlice.ts`: UI state (expanded nodes, sorting, view density)
   - Local hook state: Selection, pagination, manual tree ordering

3. **Calculation Engine** (`src/utils/`):
   - `calculateDependencyTree.ts` (254 lines): Recursive dependency resolution with cycle detection
   - `calculateAccumulatedFromTree.ts`: Aggregates totals across tree
   - `treeCalculationCache.ts`: Memoization for performance
   - `treeDiffing.ts`: Identifies affected branches for partial recalculation
   - **Pattern**: Cache invalidation on recipe changes; affected branches limit recalc scope

4. **Component Architecture**:
   - **Shared components** (`src/components/shared/`): Reusable UI blocks (buttons, inputs, panels)
   - **Feature-specific** (`src/features/factory-planner/`): Domain logic, hooks, store slices
   - **Hooks** (`src/features/factory-planner/hooks/`): Encapsulate feature logic
     - `useFactoryPlanner.ts`: Orchestrates planner hooks, exposes public API
     - `usePlannerTreeCalculation.ts`: Tree creation/updates
     - `usePlannerRecipeManagement.ts`: Recipe selection changes
     - `usePlannerNodeInteractions.ts`: Node modifications (machine count, multiplier)
     - `usePlannerImportExport.ts`: Import/export with unimport logic
     - `usePlannerSaveLoad.ts`: Named setup persistence and dirty tracking
     - `usePlannerPersistence.ts`: Auto-save to `localStorage` (`lastSession_*` keys)

### Key Integration Points
- **Tree Recalculation**: Recipe change → dispatch action → re-run `calculateDependencyTree` → Redux update → component re-render
- **Node Selection**: Click node → `usePlannerNodeState` updates local state → persisted to `localStorage`
- **Persistence**: Two modes:
  - **Automatic**: `useEffect` hooks save state to `localStorage` (keys: `lastSession_*`, debounced)
  - **Named Setups**: User-triggered save to `plannerSetups` object in `localStorage`
- **Import/Export**: Serializes/deserializes nodes; complex unimport logic in `importExportLogic.ts` with thunk dispatch

## Development Workflows

### Build & Run
```bash
yarn start      # Start dev server on :5173 (opens browser)
yarn dev        # Dev server without opening browser
yarn build      # Type-check + Vite build
yarn lint       # ESLint
yarn type-check # TypeScript check only
yarn test       # Jest tests
yarn debug      # Node inspect mode on Vite
```

### Add New Features
1. Define types in `src/types/index.ts` (if needed)
2. Create hook in `src/features/factory-planner/hooks/` for logic
3. Add Redux slice in `src/features/factory-planner/store/` (if global state needed)
4. Create UI component in `src/features/factory-planner/components/` or `src/components/shared/`
5. Wire via `useFactoryPlanner` orchestrator hook or consume Redux directly

### Debug Tips
- `yarn debug`: Inspect with Chrome DevTools (`chrome://inspect`)
- Redux DevTools: Check state changes in browser extension
- `usePlannerDebugTools.ts`: Utilities for inspecting tree state
- Local Storage inspection: Browser DevTools → Application → Local Storage

## Project-Specific Patterns

### Dependency Node Uniqueness
- `uniqueId` = `${parentId}-${itemId}-${depth}` (identifies node instance in tree)
- Used as key for caching, state maps (`excessMap`, `machineCountMap`, etc.)
- Import nodes tracked via `importReference: { targetTreeId, targetNodeId }`

### Recipe Resolution Order
1. Check `recipeMap` (user selections)
2. Try recipe ID/name matching item ID/name
3. Use first recipe producing the item
4. (See `calculateDependencyTree.ts` for implementation)

### Cycle Detection
- `visited` array tracks `${itemId}_${recipeId}` during recursion
- Cyclic nodes return leaf with `isCyclicReference: true`
- Prevents infinite loops in complex chains

### View Density
- **Compact view** (default): Space-optimized layout, horizontal recipe selector
- State persisted in Redux (`treeUiSlice`)
- Components adapt UI elements conditionally based on `viewDensity`

### Unsaved Changes Tracking
- `usePlannerSaveLoad` compares current state to last explicit save via `lodash/isEqual` (debounced)
- `isDirty` flag indicates unsaved changes
- Auto-save still occurs independently via `lastSession_*` keys

## Code Conventions

### Naming
- Tree/node: `dependencies` (array), `dependencyTrees` (map by root ID)
- Unique node ID: `uniqueId` or `nodeId` in utilities
- State setters in hooks: `setFieldName`, grouped in return object
- Redux slices: singular (`dependencySlice`, `recipeSelectionsSlice`)

### File Organization
- Hooks: Each feature hook in separate file, exported from `index.ts`
- Components: Pair `.tsx` with `.css` (e.g., `ItemNode.tsx` + `ItemNode.css`)
- Utilities: Pure functions, no side effects; cache/diffing isolated in separate files
- Types: All in `src/types/index.ts`

### TypeScript
- Strict mode enabled; no `any` without justification
- Use discriminated unions for import node variants (see `importReference` pattern)
- Generic constraints for tree utilities (e.g., `T extends DependencyNode`)

### Styling
- **Emotion (CSS-in-JS)**: `@emotion/react`, `@emotion/styled` for component styles
- **MUI**: Material-UI for layout, icons, and form controls
- **Local CSS**: For large component-specific styles (e.g., `ItemNode.css`)
- **Theme**: Centralized in `src/styles/theme.ts`

### Async Patterns
- `calculateDependencyTree`, `dbQueries` are async; use `async/await` in hooks
- Redux Thunk for async state mutations (e.g., `unimportNodeThunk`)
- No promise chains; prefer async/await for readability

## Cross-Feature Communication

### Modifying a Tree
1. User interaction (UI event) → Hook handler
2. Handler updates Redux state or calls utility (e.g., `calculateDependencyTree`)
3. Redux dispatch → state update → components re-render
4. `useEffect` in persistence hooks auto-saves to `localStorage`

### Example: Changing Recipe for a Node
1. `usePlannerRecipeManagement.handleTreeRecipeChange(nodeId, recipeId)` called
2. Dispatches `setNodeRecipe` to `recipeSelectionsSlice`
3. `useFactoryPlanner` watches selections, triggers `usePlannerTreeCalculation.handleRecalculate`
4. `calculateDependencyTree` runs with new recipe; node cache cleared
5. Redux state updates → `SummarySidebar` and `DependencyTree` re-render
6. `useEffect` in `usePlannerPersistence` saves to `lastSession_dependencies`

### Importing a Node
1. `usePlannerImportExport.handleImportNode(sourceNodeId, targetTreeId, amount)`
2. Dispatches `importNodeThunk` (async action in `importExportLogic.ts`)
3. Updates `dependencySlice` with new import reference
4. Recalculates affected target tree branches
5. Auto-save persists changes

## Common Pitfalls to Avoid

- **Cache misses**: Always invalidate node cache when recipes/amounts change (`clearNodeFromCache` in slices)
- **Import node updates**: Use `importReference` pattern; don't directly modify imported node structure
- **View density**: Check `viewDensity` state when rendering conditional UI
- **Persisting temporary state**: Only use `localStorage` for UI state; Redux handles semantic state
- **Async calculations**: Await `calculateDependencyTree` and `dbQueries`; don't chain promises
- **Dirty flag logic**: Compare state post-debounce; don't check immediately after change

## External Dependencies

- **React 18.3**, **Redux Toolkit 2.5+**: State & UI
- **Vite 6**: Build tool
- **Dexie 4**: IndexedDB wrapper
- **MUI 6, Emotion 11**: Styling & icons
- **react-arborist 3.4**: Tree rendering (if used; legacy?)
- **lodash**: Utilities (isEqual for dirty check)
- **use-debounce 10**: Debounced state updates
- **TypeScript 5.6**: Type safety

## Tips for Productivity

1. **Search for patterns**: Grep `usePlannerTreeCalculation`, `affectedBranches`, `importReference` to find examples
2. **Read hook signatures**: `src/features/factory-planner/hooks/useFactoryPlanner.ts` shows public API
3. **Test calculations locally**: Use `yarn test` to validate tree logic before integration
4. **Leverage cache**: Use `treeCalculationCache` for expensive operations
5. **Track dirty state**: Use `isDirty` flag in `usePlannerSaveLoad` for UI feedback
