# Refactoring Plan

This document tracks the refactoring tasks for the factory planner's state logic.

## Tasks

- [X] **Task 1: Extract Root Node Amount Calculation Logic** (Completed)
  - **Goal:** Consolidate the logic for calculating a root node's required amount based on its importers and excess into a single reusable thunk.
  - **Files Affected:** `importExportLogic.ts`, `dependencySlice.ts`
  - **Details:** Created `recalculateAndUpdateRootAmountThunk`. Replaced existing calculation logic in `autoImportNodeChildrenThunk` and `requestDependencyCheckThunk` with calls to this new thunk. *(Investigation for import/unimport handlers deferred)*.

- [ ] **Task 2: Generalize Node Creation Logic** (In Progress)
  - **Goal:** Create a unified function/thunk for creating new dependency nodes/trees, handling both initial creation and potential conversions (e.g., byproduct to normal during creation).
  - **Files Affected:** `importExportLogic.ts`
  - **Details:** Refactored `calculateAndAutoImportThunk` to remove complex internal state management. It now calculates the base tree, dispatches `setDependencies`, and triggers `autoImportNodeChildrenThunk` and `recalculateAndUpdateRootAmountThunk`.

- [ ] **Task 3: Generalize Node Deletion Logic**
  - **Goal:** Ensure `destroyNodeRecursiveThunk` is the single point of entry for deleting nodes and handling cleanup (like triggering dependency checks).
  - **Files Affected:** `importExportLogic.ts`

- [ ] **Task 4: Generalize Node Type Conversion (N <-> B)**
  - **Goal:** Refine `checkAndConvertNodeTypeThunk` to be the sole handler for type conversions, potentially simplifying its internal logic by calling other generalized functions (like the recalculated amount thunk).
  - **Files Affected:** `importExportLogic.ts`

- [X] **Task 5: Generalize Import/Linking Logic** (Completed)
  - **Goal:** Consolidate the logic for setting `importReference` and `isImport` flags, potentially within `autoImportNodeChildrenThunk` or a new dedicated thunk.
  - **Files Affected:** `importExportLogic.ts`
  - **Details:** Created `setNodeAsImportThunk` to handle updating a node to be an import link and trigger target amount recalculation. Refactored `autoImportNodeChildrenThunk` to use this new thunk.

*(Add more tasks as identified)* 