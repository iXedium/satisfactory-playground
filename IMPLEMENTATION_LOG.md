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
Phase 3 — hook and thunk migration (17 hooks, 14 thunks) to use tab-scoped dispatch and selectors

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

### Next step
Phase 3 — hook and thunk migration (17 hooks, 14 thunks)

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
