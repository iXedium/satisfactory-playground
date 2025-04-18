# Software Documentation

This document provides documentation for the core state management logic of the factory planner.

## Files

### `src/features/factory-planner/store/importExportLogic.ts`

- **Purpose:** Contains Redux Toolkit thunks and potentially action creators related to complex state operations involving multiple dependency trees, such as auto-importing, node type conversions (Normal <-> Byproduct), node destruction with dependency checks, and recalculating tree structures.
- **Key Functions/Thunks:**
  - `calculateAndAutoImportThunk`: (Refactored V2) Calculates the basic structure for a newly added item, dispatches `setDependencies` to add it to the state, and then triggers `autoImportNodeChildrenThunk` to handle linking its children and `recalculateAndUpdateRootAmountThunk` to set its initial amount based on excess.
  - `checkAndConvertNodeTypeThunk`: Checks if a root node needs to convert between Normal and Byproduct based on its amount and performs the conversion, including recipe caching, recalculating children, and triggering `autoImportNodeChildrenThunk`.
  - `destroyNodeRecursiveThunk`: Handles the deletion of a root node and triggers dependency checks for its former children.
  - `requestDependencyCheckThunk`: Checks if a specific root node is still needed by any importers or has excess demand after a potential consumer disconnects. Triggers `recalculateAndUpdateRootAmountThunk` or `destroyNodeRecursiveThunk`.
  - `autoImportNodeChildrenThunk`: Processes the children of a given parent node.
    - For **Normal** children: Checks for existing Normal root. If none, checks for existing Byproduct root and triggers B->N conversion via `checkAndConvertNodeTypeThunk` if found. If no root exists, creates a new Normal root (calculating its children and recursively calling itself). Finally dispatches `setNodeAsImportThunk` to link the child.
    - For **Byproduct** children: Checks for *any* existing root. If none, creates a new Byproduct root. Finally dispatches `setNodeAsImportThunk` to link the child.
  - `recalculateAndUpdateRootAmountThunk`: Calculates the total required amount for a root node based on its importers and excess, updates the node's amount via `updateNodeProperties`, and triggers `checkAndConvertNodeTypeThunk` if the amount changed.
  - `setNodeAsImportThunk`: Updates a specific node to set its `importReference` and `isImport` flag, clears its children/recipe, and triggers `recalculateAndUpdateRootAmountThunk` for the target root.

### `src/features/factory-planner/store/dependencySlice.ts`

- **Purpose:** Defines the main Redux slice for managing the state of dependency trees (`dependencyTrees`) and accumulated item totals (`accumulatedDependencies`). Contains reducers for basic state manipulations.
- **Key Reducers:**
  - `setDependencies`: Adds or updates a complete dependency tree and its accumulated totals in the state.
  - `deleteTree`: Removes a dependency tree from the state.
  - `updateNodeProperties`: Updates specific properties of a node within any tree (used by various thunks).
  - `handleNodeImportReducer`/`handleNodeUnimportReducer`: (Legacy/Potentially Refactor) Handles the state changes for manually toggling a node's import status.
  - `removeNodeAction` (extraReducer): Handles the direct removal of a node from the `dependencyTrees` state.

### `src/features/factory-planner/hooks/usePlannerExcessHandling.ts`

- **Purpose:** Provides a hook (`usePlannerExcessHandling`) responsible for reacting to changes in a node's excess amount.
- **Key Logic:**
  - Updates the local `excessMap` state.
  - Dispatches `updateTreeProduction` (from `productionUpdateLogic`) to potentially update node properties like amount/machine count based on excess.
  - **Crucially:** Triggers `checkAndConvertNodeTypeThunk` for all root nodes after an excess change to handle potential N<->B conversions.
  - (Previously handled B->N recalculation, now commented out as it's handled synchronously in `checkAndConvertNodeTypeThunk`).

### `src/features/factory-planner/hooks/usePlannerDataManagement.ts`

- **Purpose:** Provides hook consolidating data management actions like deleting trees, updating nodes, and clearing saved data.
- **Key Logic:**
  - `handleDeleteTree`: Dispatches the `destroyNodeRecursiveThunk` to properly remove a tree and trigger dependency cleanup.
  - `handleNodeUpdate`: Dispatches `updateNodeProperties` for general node updates.
  - `clearSavedData`: Handles clearing relevant local storage items and resetting Redux state.

### `src/features/factory-planner/hooks/usePlannerTreeCalculation.ts`

- **Purpose:** Provides hook consolidating the logic for calculating and adding new dependency trees to the planner.
- **Key Logic:**
  - `handleCalculate`: The main function triggered when adding a new item.
    - If `autoImport` is true: Dispatches `calculateAndAutoImportThunk` (V2) and updates UI state (like expanded nodes) based on the result. Contains removed logic that previously reset excess/machine maps incorrectly.
    - If `autoImport` is false: Performs a simpler calculation and dispatches `setDependencies` directly (TBC - may need review).
  - `createNewTreeStructure`: Helper function (exported) used by thunks to calculate the basic structure of a new tree without dispatching.
  - `generateTreeId`: Generates unique IDs for new trees.

### `src/features/factory-planner/hooks/usePlannerRecipeManagement.ts`

- **Purpose:** Provides the `handleTreeRecipeChange` function for managing recipe updates on nodes within the dependency trees.
- **Key Logic (`handleTreeRecipeChange`):**
  - Finds the node and its tree.
  - Stores the `targetTreeId`s of any imported children the node currently has.
  - Fetches the new recipe details.
  - Dispatches `setRecipeSelection` to update the global recipe choice for that node.
  - Recalculates *only the children* of the target node based on the new recipe using `calculateDependencyTree`.
  - Dispatches `updateNodeProperties` to update the target node with the new recipe and recalculated children.
  - **If `autoImport` is enabled:** Dispatches `autoImportNodeChildrenThunk` for the target node to handle creating/linking roots for the *new* children.
  - Dispatches `requestDependencyCheckThunk` for each *old* import target to ensure those roots are recalculated or removed if no longer needed.

*(Add documentation for more files/functions as needed)* 