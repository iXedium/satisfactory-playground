# Software Design Document (SDD)
## Satisfactory Factory Planner

**Version:** 2.0  
**Last Updated:** January 2026  
**Status:** Production

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Redux State Management](#4-redux-state-management)
5. [Component Hierarchy](#5-component-hierarchy)
6. [Hooks System](#6-hooks-system)
7. [Calculation Engine](#7-calculation-engine)
8. [Testing Framework](#8-testing-framework)
9. [Build & Deployment](#9-build--deployment)

---

## 1. Project Overview

### 1.1 Purpose

Satisfactory Factory Planner is a web-based tool for planning and optimizing factory production chains in the game "Satisfactory". It provides interactive visualization and calculation of resource requirements, dependency trees, and production efficiency.

### 1.2 Core Features

- **Production Chain Calculation** - Calculate resource requirements based on desired output
- **Dependency Tree Visualization** - Interactive tree display with expand/collapse
- **Recipe Management** - Select alternative recipes and see impact
- **Machine Configuration** - Adjust clock speeds and machine counts
- **Import/Export System** - Modular design with node importing between trees
- **Undo/Redo** - Full transaction-based history system
- **Persistence** - Named setups + automatic session restore
- **Comparison Mode** - Compare current state against saved snapshots
- **View Modes** - Compact/Expanded display options

### 1.3 Technology Stack

- **Frontend:** React 18.3, TypeScript 5.6
- **State Management:** Redux Toolkit 2.5
- **Build Tool:** Vite 6
- **Database:** Dexie 4 (IndexedDB wrapper)
- **UI Framework:** Material-UI 6, Emotion 11
- **Testing:** Vitest 4.0, React Testing Library 16.3
- **Styling:** CSS-in-JS (Emotion), MUI components

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
├─────────────────────────────────────────────────────────────┤
│  Components Layer                                            │
│  ├── FactoryPlanner (Main)                                   │
│  ├── DependencyTree (Visualization)                          │
│  ├── ItemNode / TreeNode (Individual nodes)                  │
│  └── AccumulatedResourceView (Summary)                       │
├─────────────────────────────────────────────────────────────┤
│  Hooks Layer (Business Logic)                                │
│  ├── useFactoryPlanner (Orchestrator)                        │
│  ├── usePlannerTreeCalculation (Tree creation)               │
│  ├── usePlannerRecipeManagement (Recipe changes)             │
│  ├── usePlannerNodeInteractions (Node modifications)         │
│  └── useUndoRedo (History operations)                        │
├─────────────────────────────────────────────────────────────┤
│  Redux Store (State Management)                              │
│  ├── dependencySlice (Tree data)                             │
│  ├── recipeSelectionsSlice (User recipe choices)             │
│  ├── historySlice (Undo/redo stacks)                         │
│  ├── treeUiSlice (UI state)                                  │
│  └── comparisonSlice (Snapshot comparison)                   │
├─────────────────────────────────────────────────────────────┤
│  Middleware                                                   │
│  ├── historyMiddleware (Snapshot capture)                    │
│  └── Redux Thunk (Async actions)                             │
├─────────────────────────────────────────────────────────────┤
│  Calculation Engine                                           │
│  ├── calculateDependencyTree (Recursive tree builder)        │
│  ├── calculateAccumulatedFromTree (Resource totals)          │
│  ├── treeCalculationCache (Memoization)                      │
│  └── treeDiffing (Affected branch detection)                 │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                   │
│  ├── Dexie DB (IndexedDB)                                    │
│  ├── dbQueries (Query interface)                             │
│  └── dataLoader (JSON import)                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**User Action → Component → Hook → Redux Action → Reducer → Re-render**

1. User interaction triggers component handler
2. Component calls hook function (e.g., `handleExcessChange`)
3. Hook dispatches Redux action or thunk
4. Middleware intercepts (e.g., history captures snapshot)
5. Reducer updates state
6. Components re-render with new state

### 2.3 File Structure

```
src/
├── components/           # Shared UI components
│   ├── shared/          # Reusable components
│   │   ├── ExcessControls.tsx
│   │   ├── MachineControls.tsx
│   │   ├── EfficiencySection.tsx
│   │   └── PlannerActions.tsx
│   └── Icon.tsx
├── features/
│   └── factory-planner/
│       ├── components/  # Feature components
│       │   ├── FactoryPlanner.tsx
│       │   ├── DependencyTree.tsx
│       │   ├── TreeNode.tsx
│       │   └── ItemNode.tsx
│       ├── hooks/       # Business logic hooks
│       │   ├── useFactoryPlanner.ts
│       │   ├── usePlannerTreeCalculation.ts
│       │   └── useUndoRedo.ts
│       └── store/       # Redux slices & thunks
│           ├── dependencySlice.ts
│           ├── historySlice.ts
│           ├── historyMiddleware.ts
│           └── importExportLogic.ts
├── data/                # Database layer
│   ├── dexieDB.ts
│   ├── dexieInit.ts
│   └── dbQueries.ts
├── store/               # Global Redux store
│   ├── index.ts
│   └── dataSlice.ts
├── types/               # TypeScript interfaces
│   └── index.ts
└── utils/               # Calculation utilities
    ├── calculateDependencyTree.ts
    ├── treeCalculationCache.ts
    └── treeDiffing.ts
```

---

## 3. Data Models

### 3.1 DependencyNode Interface

```typescript
interface DependencyNode {
  // Identity
  id: string;                    // Item class name (e.g., 'Desc_IronPlate_C')
  uniqueId: string;              // Unique node instance ID (format: parentId-itemId-depth)
  
  // Production data
  amount: number;                // Required amount per minute
  recipe?: Recipe;               // Selected recipe
  availableRecipes?: Recipe[];   // All recipes that can produce this item
  
  // Tree structure
  children?: DependencyNode[];   // Sub-dependencies (ingredients)
  depth?: number;                // Visual depth in tree
  isRoot?: boolean;              // True for root nodes
  
  // Machine configuration
  machineCount?: number;         // Number of machines (default: 1)
  machineMultiplier?: number;    // Clock speed (default: 1.0 = 100%)
  excess?: number;               // Excess production amount (default: 0)
  
  // Import system
  isImport?: boolean;            // True if importing from another tree
  importReference?: {            // New import system
    targetTreeId: string;
    targetNodeId: string;
  };
  importedFrom?: string;         // Legacy import system (tree ID)
  originalChildren?: DependencyNode[]; // Backup when node becomes import
  
  // UI state
  isSelected?: boolean;          // Selection state
  isCompleted?: boolean;         // Completion checkbox
  isHidden?: boolean;            // Hidden (shy layer)
  childrenVisible?: boolean;     // Expand/collapse state
  
  // Special flags
  isByproduct?: boolean;         // True for recipe byproducts
  isCyclicReference?: boolean;   // True for circular dependencies
  originalDepth?: number;        // Depth before becoming import root
}
```

### 3.2 Recipe Interface

```typescript
interface Recipe {
  id: string;              // Recipe ID (e.g., 'Recipe_IronPlate_C')
  name: string;            // Display name
  producers: string[];     // Machine IDs that can use this recipe
  time: number;            // Production cycle time (seconds)
  in: Record<string, number>;   // Input items and amounts
  out: Record<string, number>;  // Output items and amounts
  category: string;        // Recipe category
}
```

### 3.3 HistorySnapshot Interface

```typescript
interface HistorySnapshot {
  timestamp: number;              // When snapshot was created
  actionDescription: string;      // Human-readable action name
  
  // State slices (partial - only changed slices included)
  dependencies?: DependencyState;
  recipeSelections?: { selections: Record<string, string> };
  comparison?: {
    activeSnapshot: unknown | null;
    showComparison: boolean;
  };
}
```

---

## 4. Redux State Management

### 4.1 State Shape

```typescript
interface RootState {
  data: {
    items: Record<string, Item>;
    recipes: Record<string, Recipe>;
  };
  dependencies: {
    dependencyTrees: Record<string, DependencyNode>;
    accumulatedDependencies: Record<string, AccumulatedNode>;
    highlightedNodeId: string | null;
    errors: string[];
    lastUpdateTime: number;
  };
  recipeSelections: {
    selections: Record<string, string>; // nodeId -> recipeId
  };
  treeUi: {
    expandedNodes: string[];
    sortKey: TreeSortKey;
    sortDirection: SortDirection;
    viewDensity: ViewDensity;
  };
  comparison: {
    activeSnapshot: TreeSnapshot | null;
    showComparison: boolean;
  };
  history: {
    undoStack: HistorySnapshot[];
    redoStack: HistorySnapshot[];
    maxStackSize: number;
    isRestoring: boolean;
    canUndo: boolean;
    canRedo: boolean;
  };
}
```

### 4.2 Redux Slices

#### 4.2.1 dependencySlice.ts

**Purpose:** Manages dependency tree state

**Key Reducers:**
- `setDependencies` - Add/update complete tree
- `deleteTree` - Remove tree from state
- `updateNodeProperties` - Update specific node properties
- `setNodeExcess` - Update node excess value
- `setNodeMachineCount` - Update machine count
- `setNodeMachineMultiplier` - Update clock speed
- `toggleNodeSelected` - Toggle selection state
- `toggleNodeCompleted` - Toggle completion checkbox
- `toggleNodeHidden` - Toggle visibility
- `setHighlightedNode` - Set highlighted node for import visualization

#### 4.2.2 historySlice.ts

**Purpose:** Manages undo/redo state

**Key Reducers:**
- `pushSnapshot` - Add snapshot to undo stack
- `undoStackPop` - Remove from undo, add current to redo
- `redoStackPop` - Remove from redo, add current to undo
- `clearHistory` - Reset all stacks
- `setRestoring` - Set flag during undo/redo operations

#### 4.2.3 recipeSelectionsSlice.ts

**Purpose:** Tracks user recipe choices

**Key Reducers:**
- `setRecipeSelection` - Set recipe for a node
- `clearRecipeSelections` - Reset all selections
- `loadRecipeSelections` - Load saved selections (not tracked in history)

#### 4.2.4 treeUiSlice.ts

**Purpose:** Manages UI display state

**Key Reducers:**
- `setExpandedNodes` - Set which nodes are expanded
- `toggleNodeExpansion` - Toggle single node
- `setTreeSorting` - Set sort key and direction
- `setViewDensity` - Set compact/expanded view

#### 4.2.5 comparisonSlice.ts

**Purpose:** Manages snapshot comparison

**Key Reducers:**
- `storeSnapshot` - Save current state for comparison
- `clearSnapshot` - Remove comparison snapshot
- `toggleComparisonDisplay` - Show/hide comparison UI
- `updateSnapshotTree` - Update specific tree in snapshot
- `removeSnapshotTree` - Remove tree from snapshot

### 4.3 Middleware

#### 4.3.1 historyMiddleware.ts

**Purpose:** Captures state snapshots for undo/redo

**Tracked Actions:**
- `dependencies/setDependencies`
- `dependencies/deleteTree`
- `dependencies/updateNodeProperties`
- `dependencies/setNodeExcess`
- `dependencies/setNodeMachineCount`
- `dependencies/updateExcessProduction`
- `recipeSelections/setRecipeSelection`
- `comparison/storeSnapshot`

**Ignored Actions (System Operations):**
- `dependencies/loadSavedState`
- `recipeSelections/loadRecipeSelections`
- `history/*` (all history actions)
- `treeUi/*` (UI state changes)
- `data/*` (data loading)

**Transaction System:**
- Uses module-level `activeTransaction` variable (not Redux state)
- Prevents race conditions in async action sequences
- Groups multiple actions into single undo checkpoint
- Functions: `beginHistoryTransaction()`, `commitHistoryTransaction()`, `cancelHistoryTransaction()`

**Undo/Redo Thunks:**
- `undoAction()` - Restore previous snapshot, save current to redo
- `redoAction()` - Restore next snapshot, save current to undo

### 4.4 Thunks (Async Actions)

#### 4.4.1 importExportLogic.ts

**Key Thunks:**
- `calculateAndAutoImportThunk` - Create new tree with auto-import
- `autoImportNodeChildrenThunk` - Link children to existing roots
- `setNodeAsImportThunk` - Convert node to import reference
- `unimportNodeThunk` - Restore node's original children
- `checkAndConvertNodeTypeThunk` - Convert Normal ↔ Byproduct
- `destroyNodeRecursiveThunk` - Delete node and trigger cleanup
- `requestDependencyCheckThunk` - Check if root is still needed
- `recalculateAndUpdateRootAmountThunk` - Update root based on importers

#### 4.4.2 productionUpdateLogic.ts

**Key Actions & Thunks:**
- `updateExcessProduction` - Update node excess (tracked in history)
- `updateForcedProduction` - Update forced production amount
- `updateImportedProduction` - Update import amount
- `updateTreeProduction` - Thunk that cascades production updates

---

## 5. Component Hierarchy

### 5.1 Main Components

```
App
└── FactoryPlanner
    ├── CommandBar
    │   ├── ChainCreatorControls
    │   └── PlannerActions (Save/Load)
    ├── FactoryPlannerLayout
    │   ├── TreeViewContainer
    │   │   └── DependencyTree
    │   │       └── TreeNode (recursive)
    │   │           └── ItemNode
    │   │               ├── ItemDetails
    │   │               ├── MachineDetails
    │   │               ├── EfficiencySection
    │   │               │   └── ExcessControls
    │   │               └── MachineControls
    │   └── SummarySidebar
    │       ├── AccumulatedResourceView
    │       └── ResourceSummary
    └── ViewOptionsPanel
```

### 5.2 Key Component Responsibilities

**FactoryPlanner** - Main container, orchestrates all hooks  
**DependencyTree** - Renders tree structure, passes props to TreeNode  
**TreeNode** - Recursive tree renderer, handles expand/collapse  
**ItemNode** - Individual node display, machine/excess controls  
**AccumulatedResourceView** - Aggregated resource summary  
**CommandBar** - Top-level actions (create, save, load, undo, redo)

### 5.3 Critical Fix (January 2026)

**TreeNode.tsx** was passing stale `excessMap[node.uniqueId]` to ItemNode instead of reading directly from Redux. This prevented undo/redo from updating UI.

**Fix:** Changed to read values directly from node:
```typescript
// Before (BROKEN):
excess={excessMap[node.uniqueId] || 0}
machineCount={machineCountMap[node.uniqueId] || 1}

// After (FIXED):
excess={node.excess || 0}
machineCount={node.machineCount || 1}
```

---

## 6. Hooks System

### 6.1 Hook Architecture

Hooks encapsulate feature logic and dispatch Redux actions. The orchestrator hook (`useFactoryPlanner`) composes all feature hooks and exposes a unified API.

### 6.2 Hook Catalog

#### 6.2.1 useFactoryPlanner.ts

**Purpose:** Orchestrator hook that composes all feature hooks

**Returns:**
- All handlers from sub-hooks
- Computed state (trees, selections, UI state)
- Utility functions

**Key Responsibilities:**
- Initialize all feature hooks
- Extract state maps from Redux trees
- Provide unified API to components

#### 6.2.2 usePlannerTreeCalculation.ts

**Purpose:** Tree creation and recalculation

**Key Functions:**
- `handleCreateNewTree` - Create new dependency tree
- `handleRecalculate` - Recalculate existing tree
- `createNewTreeStructure` - Helper for tree generation
- `generateTreeId` - Generate unique tree IDs

**Dispatches:**
- `setDependencies` - Add tree to Redux
- `calculateAndAutoImportThunk` - Create with auto-import

#### 6.2.3 usePlannerRecipeManagement.ts

**Purpose:** Handle recipe changes on nodes

**Key Functions:**
- `handleTreeRecipeChange` - Change recipe for a node

**Flow:**
1. Store old import targets
2. Fetch new recipe
3. Dispatch `setRecipeSelection`
4. Recalculate node's children
5. Dispatch `updateNodeProperties`
6. Trigger `autoImportNodeChildrenThunk` for new children
7. Trigger `requestDependencyCheckThunk` for old targets

#### 6.2.4 usePlannerNodeInteractions.ts

**Purpose:** Node modification operations

**Key Functions:**
- `handleMachineCountChange` - Update machine count
- `handleMachineMultiplierChange` - Update clock speed
- `handleOptimizeMachines` - Auto-calculate optimal machines
- `handleOptimizeAllMachines` - Optimize entire tree (Shift+Click)

#### 6.2.5 usePlannerExcessHandling.ts

**Purpose:** Handle excess production changes

**Key Functions:**
- `handleExcessChange` - Update node excess

**Flow:**
1. Begin transaction
2. Update local excessMap state
3. Dispatch `updateTreeProduction` thunk
4. Commit transaction
5. Trigger `checkAndConvertNodeTypeThunk` for all roots

#### 6.2.6 usePlannerImportExport.ts

**Purpose:** Import/unimport operations

**Key Functions:**
- `handleImportNode` - Convert node to import reference
- `handleUnimportNode` - Restore original children

**Dispatches:**
- `importNodeThunk` - Complex import logic
- `unimportNodeThunk` - Complex unimport logic

#### 6.2.7 usePlannerSaveLoad.ts

**Purpose:** Named setup persistence

**Key Functions:**
- `saveSetup` - Save current state with name
- `loadSetup` - Load named setup
- `deleteSetup` - Remove saved setup
- `isDirty` - Check for unsaved changes

**Storage:** Uses `plannerSetups` key in localStorage

**Dirty Tracking:** Compares current state to last saved state using `lodash/isEqual` (debounced)

#### 6.2.8 usePlannerPersistence.ts

**Purpose:** Automatic session restore

**Key Functions:**
- Auto-save to localStorage on state changes (debounced)
- Restore state on mount

**Storage Keys:**
- `lastSession_savedDependencies`
- `lastSession_savedRecipeSelections`
- `lastSession_plannerTreeSortKey`
- `lastSession_plannerTreeSortDirection`

#### 6.2.9 useUndoRedo.ts

**Purpose:** Undo/redo operations wrapper

**Key Functions:**
- `undo` - Dispatch undoAction thunk
- `redo` - Dispatch redoAction thunk
- `canUndo` - Check if undo available
- `canRedo` - Check if redo available

#### 6.2.10 usePlannerNodeState.ts

**Purpose:** Node selection/completion state

**Key Functions:**
- `handleNodeSelect` - Toggle selection
- `handleNodeComplete` - Toggle completion
- `handleNodeHide` - Toggle visibility

**Storage:** Persists to localStorage (`lastSession_selectedNodes`, etc.)

#### 6.2.11 usePlannerDisplayOptions.ts

**Purpose:** UI display options

**Key Functions:**
- `setViewDensity` - Switch compact/expanded
- `toggleShowMachines` - Show/hide machine details
- `toggleAutoImport` - Enable/disable auto-import

**Storage:** Persists to localStorage

#### 6.2.12 usePlannerComparison.ts

**Purpose:** Snapshot comparison

**Key Functions:**
- `captureSnapshot` - Save current state
- `clearSnapshot` - Remove comparison
- `toggleComparisonDisplay` - Show/hide comparison

#### 6.2.13 usePlannerDataManagement.ts

**Purpose:** Data management operations

**Key Functions:**
- `handleDeleteTree` - Delete tree (dispatches `destroyNodeRecursiveThunk`)
- `handleNodeUpdate` - Generic node update
- `clearSavedData` - Reset all data

#### 6.2.14 useItemNodeCalculations.ts

**Purpose:** Calculate efficiency and rates

**Returns:**
- `efficiency` - Production efficiency percentage
- `nominalRate` - Nominal production rate
- Calculated machine requirements

---

## 7. Calculation Engine

### 7.1 Core Algorithm

#### 7.1.1 calculateDependencyTree.ts

**Purpose:** Recursive dependency tree calculation

**Function Signature:**
```typescript
async function calculateDependencyTree(
  itemId: string,
  amount: number,
  selectedRecipeId: string,
  recipeMap: Record<string, string>,
  depth: number,
  affectedBranches?: string[],
  parentId?: string,
  excessMap?: Record<string, number>,
  importMap?: Record<string, { targetTreeId: string, amount: number }>
): Promise<DependencyNode | null>
```

**Algorithm:**
1. Fetch item data from Dexie
2. Generate uniqueId (`${parentId}-${itemId}-${depth}`)
3. Check for cyclic reference (visited array)
4. Fetch available recipes
5. Select recipe (recipeMap → ID match → first available)
6. Calculate machine count based on amount + excess
7. Process recipe inputs (recursive call for each ingredient)
8. Process recipe outputs (byproducts)
9. Return complete node structure

**Cycle Detection:** Uses `visited` array tracking `${itemId}_${recipeId}` to prevent infinite loops

### 7.1.2 calculateAccumulatedFromTree.ts

**Purpose:** Aggregate resource totals across tree

**Function Signature:**
```typescript
function calculateAccumulatedFromTree(
  tree: DependencyNode
): Record<string, AccumulatedNode>
```

**Algorithm:**
1. Traverse tree recursively
2. Skip import nodes (already counted in source tree)
3. Sum amounts for each itemId
4. Track producers and byproduct sources
5. Return flat map of accumulated resources

### 7.1.3 treeCalculationCache.ts

**Purpose:** Memoization for expensive calculations

**Functions:**
- `getCachedNode(key: string)` - Retrieve cached result
- `cacheNode(key: string, node: DependencyNode)` - Store result
- `clearNodeFromCache(key: string)` - Invalidate cache
- `clearAllCache()` - Reset entire cache

**Cache Key Format:** `${itemId}_${amount}_${recipeId}_${depth}`

**Invalidation:** Cache cleared when recipe changes or tree structure updates

### 7.1.4 treeDiffing.ts

**Purpose:** Identify affected branches for partial recalculation

**Functions:**
- `findAffectedBranches(tree: DependencyNode, changedNodeId: string)` - Returns array of node IDs in affected subtree
- Used to optimize recalculation by limiting scope to changed branches

### 7.2 Recipe Resolution Order

1. Check `recipeMap` (user selections) for nodeId
2. Try matching recipe ID to item ID (if recipe produces item)
3. Try matching recipe name to item name (if recipe produces item)
4. Default to first recipe in `availableRecipes`

### 7.3 Import System Logic

**Import Reference Structure:**
```typescript
{
  targetTreeId: string;  // ID of source tree
  targetNodeId: string;  // uniqueId of source node
}
```

**Import Node Characteristics:**
- `isImport: true`
- Has `importReference`
- `children` is empty or cleared
- `originalChildren` stores backup (for unimport)
- Amount synchronized with source node

**Auto-Import Flow:**
1. Node needs a child item
2. Check if root exists for that item
3. If exists: Link to existing root
4. If not exists: Create new root, calculate its children, link to it

---

## 8. Testing Framework

### 8.1 Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── utils/                      # Test utilities
│   ├── renderWithProviders.tsx # Redux wrapper
│   ├── testHelpers.ts          # Selectors, async utils
│   └── mockData.ts             # Mock fixtures
├── integration/                # Integration tests
│   ├── undoRedo.test.ts       # 18 tests
│   └── dependencyState.test.ts # 8 tests
├── features/                   # Feature tests
│   └── mockData.test.ts       # 15 tests
└── examples/                   # Test patterns
    └── patterns.test.tsx      # 15 tests
```

### 8.2 Test Configuration

**Framework:** Vitest 4.0.18 with jsdom environment

**Key Files:**
- `vitest.config.ts` - Vite test configuration
- `tests/setup.ts` - Mock browser APIs (localStorage, ResizeObserver, etc.)

**Path Aliases:**
- `@store/*` → `src/store/*`
- `@features/*` → `src/features/*`
- `@utils/*` → `src/utils/*`

### 8.3 Test Utilities

#### 8.3.1 renderWithProviders

```typescript
function renderWithProviders(
  ui: React.ReactElement,
  options?: { preloadedState?: Partial<RootState> }
): { store: TestStore, ...RTLResult }
```

Creates Redux-wrapped component with test store

#### 8.3.2 Test Helpers

**State Selectors:**
- `getTreeCount(state)` - Count trees
- `getUndoStackSize(state)` - Undo stack length
- `getRedoStackSize(state)` - Redo stack length
- `canUndo(state)` - Check if undo available
- `canRedo(state)` - Check if redo available

**Async Utilities:**
- `waitForState(store, predicate)` - Wait for condition
- `waitForTreeCount(store, count)` - Wait for specific tree count

#### 8.3.3 Mock Data

**TreeBuilder Class:**
```typescript
new TreeBuilder('Desc_IronPlate_C', 'tree-1')
  .withAmount(20)
  .withExcess(10)
  .withMachineCount(2)
  .addChild('Desc_IronIngot_C', (ingot) =>
    ingot.withAmount(30).withRecipe(mockIronIngotRecipe)
  )
  .build()
```

**Mock Recipes:**
- `mockIronPlateRecipe`
- `mockIronIngotRecipe`
- `mockIronOreNode`

### 8.4 Test Coverage

**Current Status:** 56 tests passing (January 2026)

**Coverage Breakdown:**
- Undo/Redo: 18 tests
- Dependency State: 8 tests
- Mock Data: 15 tests
- Example Patterns: 15 tests

**Scripts:**
```bash
yarn test           # Run all tests
yarn test:watch     # Watch mode
yarn test:ui        # Vitest UI
yarn test:coverage  # Coverage report
```

---

## 9. Build & Deployment

### 9.1 Build Configuration

**Tool:** Vite 6

**Config File:** `vite.config.ts`

**Key Settings:**
- React plugin
- Path aliases
- TypeScript support
- Rollup options

**Build Command:**
```bash
yarn build  # Type-check + Vite build
```

**Output:** `dist/` directory

### 9.2 Scripts

```bash
yarn start      # Dev server (opens browser)
yarn dev        # Dev server (no browser)
yarn build      # Production build
yarn preview    # Preview build
yarn lint       # ESLint
yarn type-check # TypeScript only
yarn test       # Run tests
yarn debug      # Node inspect mode
```

### 9.3 TypeScript Configuration

**Files:**
- `tsconfig.json` - Base config
- `tsconfig.app.json` - App config
- `tsconfig.node.json` - Vite config

**Strict Mode:** Enabled

**Path Mapping:**
```json
{
  "@/*": ["./src/*"],
  "@store/*": ["./src/store/*"],
  "@features/*": ["./src/features/*"]
}
```

### 9.4 Linting

**Tool:** ESLint 9

**Config:** `eslint.config.js`

**Rules:** React hooks, TypeScript recommended

### 9.5 Dependencies

**Production:**
- React 18.3.1
- Redux Toolkit 2.5.1
- Dexie 4.0.10
- MUI 6.3.0
- Emotion 11.14.0
- lodash 4.17.21
- use-debounce 10.0.4

**Development:**
- Vite 6.0.11
- TypeScript 5.6.3
- Vitest 4.0.18
- ESLint 9.19.0

### 9.6 Persistence Strategy

**Two Modes:**

1. **Automatic Session Save**
   - Keys: `lastSession_*` prefix
   - Debounced auto-save on state changes
   - Restored on app load

2. **Named Setups**
   - Key: `plannerSetups` (object with multiple setups)
   - User-triggered save/load
   - Supports multiple named configurations

**Storage:** Browser localStorage

---

## 10. Appendix

### 10.1 Known Issues

None currently identified (as of January 2026)

### 10.2 Future Enhancements

See `TASKS.md` for planned features:
- Node Insertion Order
- Recipes in Store/Compare
- Power Consumption
- Multi-Store (8 slots)
- Lucide Icons

### 10.3 Git Workflow

**Commit Message Format:**
- `Fix:` - Bug fixes
- `Feat:` - New features
- `Docs:` - Documentation
- `Test:` - Testing
- `Refactor:` - Code restructuring

**Example:**
```
Fix: Read node values directly from Redux in TreeNode

Changed TreeNode to read excess/machineCount/multiplier directly
from the Redux node object instead of stale maps. This ensures
undo/redo operations properly update UI input fields.
```

### 10.4 Debugging Tips

1. **Redux DevTools:** Monitor state changes
2. **LocalStorage Inspection:** Application → Local Storage in DevTools
3. **Console Logging:** History middleware logs snapshot captures
4. **Cache Issues:** Clear node cache when recipes change
5. **Import Tracking:** Use `importReference` pattern, not legacy `importedFrom`

### 10.5 Architecture Decisions

**Why Redux over Context API?**
- Time-travel debugging (undo/redo)
- Middleware for side effects
- DevTools integration
- Predictable state updates

**Why Dexie over fetch/localStorage?**
- Structured queries
- IndexedDB performance
- Offline-first capability
- Large dataset support

**Why Hooks over HOCs?**
- Better composition
- Clearer data flow
- Easier testing
- Modern React patterns

---

**Document Maintenance:**
- Update this document when adding new features
- Keep Redux actions catalog up-to-date
- Document breaking changes in architecture
- Version this document with major releases
