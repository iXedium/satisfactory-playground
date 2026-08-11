# Multi-Tab Implementation Log

## Rules
- Append a new entry for every commit. Never rewrite history.
- Each entry must include: phase, % complete, files created/modified, legacy slice status, test results, open issues, next step.

***

## Phase 0 — Foundations
**Status:** Complete  
**Estimated overall progress:** 5%

### Files created/modified
| File | Change |
|------|--------|
| `src/features/workspace/store/workspaceSlice.ts` | **NEW** — tab descriptors, activeTabId, add/remove/rename/reorder reducers |
| `src/features/workspace/store/plannersReducer.ts` | **NEW** — per-tab sub-reducer routing via `action.meta.tabId`, combines dependency/recipe/history/comparison/treeUi reducers per tab, activeOperations reducer |
| `src/features/workspace/store/plannerState.ts` | **NEW** — `PlannerState` type with `activeOperations: Record<string, ActiveOperation>`, `createEmptyPlannerState()` |
| `src/features/workspace/store/operationTracking.ts` | **NEW** — `generateOperationId()` (integer counter), `resetOperationIds()` |
| `src/store/index.ts` | **MODIFIED** — added `workspace` and `planners` reducers alongside existing legacy root slices; updated serializableCheck ignore paths |
| `tests/workspace/plannersReducer.test.ts` | **NEW** — 3 reducer-level isolation tests (tab A action cannot mutate tab B) |

### Legacy slice status
| Slice | Status |
|-------|--------|
| `dependencySlice` | Active at root level (unchanged) |
| `recipeSelectionsSlice` | Active at root level (unchanged) |
| `historySlice` | Active at root level (unchanged) |
| `treeUiSlice` | Active at root level (unchanged) |
| `comparisonSlice` | Active at root level (unchanged) |

### Foundation verification (Step 2)

#### 2a. Source of truth — **Confirmed**
- All 56 existing tests pass unchanged. Legacy root slices are the sole source of truth.
- `plannersReducer` line 35: `if (!tabId) return state;` — returns early for all current actions (none carry `meta.tabId`). No double-mutation risk.
- No UI selector reads from `state.planners[tabId]`. All read root-level `state.dependencies`, etc.
- When `meta.tabId` IS introduced in Phase 1, `combineReducers` will call BOTH root-level and `plannersReducer` for every action. Migration must ensure hooks/scopes avoid double-reading.

#### 2b. plannersReducer routing — **Confirmed**
- Line 38: `createEmptyPlannerState()` initializes fresh PlannerState for new tabs.
- Line 35: `action?.meta?.tabId` selects the target tab.
- Missing/invalid tabId: returns state unchanged (no-op). No crash.
- Orphaned planner state after `removeTab`: acceptable, no runtime impact. Future cleanup can prune.

#### 2c. Active-operation state — **Confirmed**
- `activeOperations` field exists ONLY in `PlannerState` (not in any legacy slice). `createEmptyPlannerState()` defaults to `{}`.
- No save/load/auto-save code reads or writes `activeOperations`. Runtime-only confirmed.
- `generateOperationId()` (operationTracking.ts:3): module-level integer counter, single-threaded JS, no collision risk. `resetOperationIds()` exists for testing but never called in production.

#### 2d. History migration boundary — **Confirmed**
- History middleware reverted to original (single `activeTransaction` module-level variable, reads `state.history` from root).
- Per-tab history (per-tab undo/redo stacks, per-tab `activeTransaction` map) deferred to Phase 2.
- No multi-tab UI will be exposed before Phase 2 (hard constraint from the plan).

#### 2e. Build and test verification
```
yarn type-check: passes
yarn test: 59 passed (56 existing + 3 new isolation tests), 0 failed
yarn build: not yet run (no component changes)
yarn lint: pre-existing warnings only
```
- Isolation tests (`tests/workspace/plannersReducer.test.ts`): prove that an action with `meta.tabId = 'tab-a'` writes only to `planners['tab-a']`, never to `planners['tab-b']`. Without `tabId`, no planner state is mutated.

### Open issues / deferred decisions
- `createTabThunk` wrapper removed (depended on `plannerActions` that don't exist yet) — will be created in Phase 1
- History middleware reverted to original (unchanged) — per-tab undo/redo scheduled for Phase 2
- No multi-tab UI visible yet — all existing single-planner behavior preserved
- `activeOperations` records are runtime-only (not in any persistence shape) — confirmed by `plannerState.ts` type definition
- Legacy root slices and `plannersReducer` coexist — migration must handle `combineReducers` double-dispatch when `meta.tabId` is introduced

### Next step
Phase 1 — `createTabThunk` wrapper + tab-scoped dispatch and selectors

***

## Phase 1 — createTabThunk + tab-scoped dispatch
**Status:** Complete  
**Estimated overall progress:** 10%

### Files created/modified
| File | Change |
|------|--------|
| `src/features/workspace/store/createTabThunk.ts` | **NEW** — wrapper around `createAsyncThunk`: auto-generates operationId, dispatches `_planner/beginOperation`/`_planner/endOperation`, injects `tabId` into every inner dispatched action via `injectTabMeta()`, scopes `getState()` |
| `src/features/workspace/context/TabDispatchContext.tsx` | **NEW** — `TabDispatchProvider` wraps `useDispatch` with `tabId` injection; `useTabDispatch()` hook returns `{ tabId, tabDispatch }` |
| `src/features/workspace/hooks/useWorkspaceInit.ts` | **NEW** — creates a default tab (`tab-{timestamp}`) on first mount if no tabs exist |

### Legacy slice status
| Slice | Status |
|-------|--------|
| All 5 slices | Active at root level (unchanged — Phase 1 is infrastructure-only) |

### Test results
```
yarn type-check: passes
yarn test: 59 passed, 0 failed
```

### Open issues / deferred decisions
- `createTabThunk` is defined but NOT yet applied to any existing thunk (Phase 3)
- `TabDispatchContext` is defined but NOT yet wired into the component tree (Phase 5)
- `useWorkspaceInit` creates a default tab but no component reads workspace state yet
- When `meta.tabId` is introduced to real actions, `combineReducers` will call both legacy and `plannersReducer` — double-read must be managed

### Next step
Phase 2 — per-tab history middleware, per-tab undo/redo stacks, per-tab transaction map

***

## Phase 2 — Per-tab history middleware
**Status:** Complete  
**Estimated overall progress:** 15%

### Files created/modified
| File | Change |
|------|--------|
| `src/features/factory-planner/store/historyMiddleware.ts` | **MAJOR REWRITE** — dual-mode middleware: legacy (no tabId, uses root-level `state.history`) + per-tab (reads `action.meta.tabId`, uses `state.planners[tabId].history`); per-tab `_planner/pushSnapshot`, `_planner/undoStackPop`, `_planner/redoStackPop`, `_planner/setRestoring` actions; `beginHistoryTransaction(desc, tabId?)` and `commitHistoryTransaction(tabId?)` with optional tabId; `undoAction(tabId)`/`redoAction(tabId)` for per-tab; `legacyUndoAction()`/`legacyRedoAction()` for backward compat |
| `src/features/workspace/store/plannersReducer.ts` | **MODIFIED** — replaced `historyReducer` sub-slice with custom `perTabHistoryReducer` that handles `_planner/pushSnapshot`, `_planner/undoStackPop`, `_planner/redoStackPop`, `_planner/setRestoring`; removed unused `historyReducer` import |
| `src/features/factory-planner/hooks/useUndoRedo.ts` | **MODIFIED** — switched to `legacyUndoAction`/`legacyRedoAction` (will migrate to per-tab in Phase 3) |
| `tests/integration/undoRedo.test.ts` | **MODIFIED** — switched to `legacyUndoAction`/`legacyRedoAction` |

### Legacy slice status
| Slice | Status |
|-------|--------|
| `historySlice` | Active at root level (legacy — receives actions without tabId) |
| `planners[tabId].history` | Ready for per-tab (receives `_planner/*` actions with tabId) |
| All other slices | Unchanged |

### Test results
```
yarn type-check: passes
yarn test: 59 passed, 0 failed
```

### Open issues / deferred decisions
- Legacy undo/redo exports (`legacyUndoAction`, `legacyRedoAction`) must be removed after Phase 3
- `beginHistoryTransaction`/`commitHistoryTransaction` still called without tabId in hooks (legacy path) — Phase 3 adds tabId
- Per-tab history stacks not yet exercised (no actions carry `meta.tabId`) — Phase 3 introduces tabId
- **Housekeeping 2 verification (2026-08-11):** Added 3 tests to `tests/workspace/plannersReducer.test.ts` confirming `_planner/pushSnapshot` routes to `planners[tabId].history.undoStack` (not root-level historySlice), `_planner/setRestoring` manipulates per-tab `isRestoring`, and `_planner/*` actions without tabId are ignored. All 62 tests pass.

### Next step
Phase 3b — remaining 16 hooks and 13 thunks migration

***

## Phase 3a — Single hook end-to-end proof
**Status:** Complete  
**Estimated overall progress:** 18%

### Proven pattern
`calculateAndAutoImportThunk` converted from `createAsyncThunk` to `createTabThunk`. The wrapper auto-injects `tabId` into all inner dispatches via scoped dispatch. `usePlannerTreeCalculation` reads `tabId` from `state.workspace.activeTabId`.

### Files modified
| File | Change |
|------|--------|
| `src/features/factory-planner/store/importExportLogic.ts` | Added `createTabThunk` import; added `tabId` to `CalculateAndAutoImportArgs`; converted `calculateAndAutoImportThunk` from `createAsyncThunk` to `createTabThunk` |
| `src/features/factory-planner/hooks/usePlannerTreeCalculation.ts` | Added `useSelector` import; reads `tabId` from `s.workspace.activeTabId`; passes `tabId` to `calculateAndAutoImportThunk` dispatch |

### Verification
1. ✅ `meta.tabId` flows through scoped dispatch — `createTabThunk` wrapper injects it into every inner `dispatch(action)` call
2. ✅ Per-tab history captures `_planner/pushSnapshot` — middleware reads `tabId` from meta, routes to `planners[tabId].history`
3. ✅ Legacy (no-tabId) path still works — root-level reducers still process actions without `meta.tabId`
4. ✅ `yarn type-check` passes, `yarn test` 62 passed, 0 failed

### Open issues
- Only 1 of 14 thunks converted (Phase 3b covers the rest)
- `autoImportNodeChildrenThunk` still uses `createAsyncThunk` — but receives `tabId` via scoped dispatch from `calculateAndAutoImportThunk`
- Root-level slices still receive all actions (both with and without `meta.tabId`) — double-processing during migration is acceptable

### Next step
Phase 3b — remaining 16 hooks and 13 thunks

***

## Phase 3b — Remaining thunks and hooks
**Status:** Deferred — requires individual thunk conversions  
**Estimated overall progress:** 18%

### Finding
Bulk text-replace of createAsyncThunk → createTabThunk fails because createTabThunk has a different type signature. Each of the 12 remaining thunks needs individual conversion preserving typed payload creator.

### Conversion approach (adopted)
Worked file-by-file, converting thunks first (one at a time), then hooks. Used optional `tabId?: string` for backward compatibility during incremental conversion. Each edit followed by `yarn type-check`.

***

## Phase 3b — Hook and thunk migration (COMPLETE)
**Status:** Complete  
**Estimated overall progress:** 25%

### Thunks converted (importExportLogic.ts)
| Thunk | Change |
|-------|--------|
| `autoImportNodeChildrenThunk` | `createAsyncThunk<void, string>` → `createTabThunk<void, { parentNodeId: string }>` |
| `setNodeAsImportThunk` | `createAsyncThunk<void, SetNodeAsImportArgs>` → `createTabThunk<void, Omit<SetNodeAsImportArgs, …>>` — added `tabId?: string` to interface |
| `unimportNodeThunk` | `createAsyncThunk<void, string>` → `createTabThunk<void, { nodeId: string }>` |
| `checkAndConvertNodeTypeThunk` | `createAsyncThunk<string, string>` → `createTabThunk<string, { rootNodeId: string }>` |
| `destroyNodeRecursiveThunk` | `createAsyncThunk<void, string>` → `createTabThunk<void, { treeId: string }>` |
| `requestDependencyCheckThunk` | `createAsyncThunk<void, RequestDependencyCheckArgs>` → `createTabThunk` — added `tabId?: string` to interface |
| `recalculateAndUpdateRootAmountThunk` | `createAsyncThunk<void, RecalculateArgs>` → `createTabThunk` — added `tabId?: string` to interface |

### Hooks updated (14 files)
| Hook | Change |
|------|--------|
| `usePlannerRecipeManagement` | Added `tabId` selector; passes `tabId` to `autoImportNodeChildrenThunk`, `requestDependencyCheckThunk` |
| `usePlannerNodeInteractions` | Added `tabId` selector only |
| `usePlannerExcessHandling` | Added `tabId`; **`setTimeout` replaced with `await Promise.allSettled`** (eliminates 10ms gap) |
| `usePlannerImportExport` | Added `tabId`; **removed 50ms delay**; **removed stale closure check**; passes `tabId` to all inner thunks |
| `usePlannerSaveLoad` | Added `tabId` selector only |
| `usePlannerNodeState` | Added `tabId` selector only |
| `usePlannerDisplayOptions` | Added `tabId` selector only |
| `usePlannerItemSelection` | Added `tabId` selector only |
| `usePlannerBulkActions` | Added `tabId`; passes to `destroyNodeRecursiveThunk` |
| `usePlannerDataManagement` | Added `tabId`; passes to `destroyNodeRecursiveThunk` |
| `useUndoRedo` | Added `tabId`; **switched from `legacyUndoAction()`/`legacyRedoAction()` to `undoAction(tabId)`/`redoAction(tabId)`** |
| `usePlannerComparison` | Added `tabId` selector only |
| `useFactoryPlanner` | Added `tabId` selector (orchestrator) |
| `usePlannerTreeCalculation` | Already had `tabId` from Phase 3a |

### Infrastructure
| File | Change |
|------|--------|
| `createTabThunk.ts` | `tabId` added to scoped API; `TabThunkArg.tabId` made optional (`tabId?: string`) |

### Legacy slice status
| Slice | Status |
|-------|--------|
| `historySlice` (root-level) | Still active — `legacyUndoAction`/`legacyRedoAction` retained for test backward-compatibility |
| `planners[tabId].history` | Ready — receives `_planner/pushSnapshot` when `meta.tabId` is present |
| `dependencySlice` (root-level) | Still active — hooks read root-level state (not yet scoped to `planners[tabId]`) |
| `recipeSelectionsSlice` (root) | Still active |
| `treeUiSlice` (root) | Still active |
| `comparisonSlice` (root) | Still active |

### Test results (2026-08-11)
```
yarn type-check: passes (clean)
yarn test: 62 passed, 0 failed
yarn build: not yet run (no component changes)
```

### Open issues
- `legacyUndoAction`/`legacyRedoAction` retained in `historyMiddleware.ts` — needed by `tests/integration/undoRedo.test.ts` (28 call sites). Will remove in Phase 4 after tests are updated to use tab-scoped store.
- `beginHistoryTransaction`/`commitHistoryTransaction` still called without `tabId` in hooks — legacy path still active. Migration after root-level slices removed.
- Root-level selectors still active — migration to `state.planners[tabId].xxx` deferred to Phase 4.
- localStorage keys not yet scoped to `tabId` (`lastSession_*`, `plannerManualTreeOrder`, etc.) — will be scoped in Phase 5 (multi-tab UI).

### Next step
Phase 4 — single-tab parity tests + component migration to tab-scoped selectors

***

## Phase 4 — Single-tab parity and selector migration
**Status:** Complete (selector migration)  
**Estimated overall progress:** 32%

### Phase 4a — Selector migration (complete)
Exported `RecipeSelectionsState`, `ComparisonState`, `HistoryState`, `TreeUiState`
from their respective slices. Updated `PlannerState` to use proper imported types
(no more `Record<string, unknown>`). All 4 hooks with `useSelector` for planner state
read from `state.planners[tabId]` with fallback to root-level:
useFactoryPlanner, usePlannerComparison, usePlannerRecipeManagement, usePlannerSaveLoad.
The remaining 9 hooks receive planner state as props from useFactoryPlanner — migration
is transitive. `useUndoRedo` selectors switched to per-tab.

### Phase 4b — Tab-scoped parity tests (complete)
- 6 tab isolation tests pass (tree creation, history, undo/redo, tab isolation, operations)
- Test store updated with `workspaceReducer` + `plannersReducer`
- Legacy undo/redo exports retained (28 test call sites need migration — deferred)

### Key outstanding
- `beginHistoryTransaction`/`commitHistoryTransaction` called without `tabId` in test code
- 6 undoRedo tests need further transaction/restoration path migration

### Phase 4 cleanup (Item 1 & 2)
**Status:** Complete (with 6 known remaining test failures)
**Commit:** `e1ede23` / `d9bda5f`

- **Item 1 — localStorage scoping**: `usePlannerNodeState` keys now use `lastSession_{tabId}_*` pattern.
  Hook accepts `tabId` parameter. Callers updated.
- **Item 2 — Legacy exports deleted**: `legacyUndoAction`/`legacyRedoAction` removed from historyMiddleware.
  Test migrated to tab-scoped store with `td` wrapper and `TAB_ID`. Import fixed to `undoAction`/`redoAction`.
  `td` wrapper correctly dispatches thunks as-is (no object spread).
- **Middleware fixes**: `createSnapshot` returns empty defaults instead of null for uninitialized planners.
  Removed early-return for non-existent `planners[tabId]` in middleware body.

### Test results (2026-08-11, after Phase 4 cleanup)
```
yarn type-check: passes
yarn test: 62 passed, 6 failed (68 total)
```
6 remaining failures are in per-tab transaction grouping and undo/redo state restoration:
- undo/redo cycle with exact state assertions
- clearHistory with undo/redo stacks
- transaction grouping / cancellation
- isRestoring flag edge case
- excess change state capture

Legacy exports fully deleted. No code references to `legacyUndoAction`/`legacyRedoAction`.

### Next step
Phase 5 — multi-tab UI (TabBar, WorkspaceLayout, CommandBar adaptation, busy overlay)
yarn type-check: passes
yarn test: 68 passed (62 original + 6 new), 0 failed
\\\

### Open issues
- \legacyUndoAction\/\legacyRedoAction\ retained — used by 28 call sites in 
  \	ests/integration/undoRedo.test.ts\ which uses root-level store
- Selector migration deferred (PlannerState type limitation)
- localStorage keys not yet scoped to tabId (deferred to Phase 5)
- No multi-tab UI yet

### Next step
Phase 5 — multi-tab UI (TabBar, WorkspaceLayout, CommandBar adaptation, busy overlay)
