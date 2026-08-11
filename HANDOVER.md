# HANDOVER.md — Multi-Planner Tabs (new-architecture branch)

## 1. Branch

```
new-architecture
```

## 2. Last Commit

```
SHA: 1f9082f
Message: Test(F): UI-level multi-tab integration tests
Date: 2026-08-11
```

## 3. Architecture Summary (Phases 0–5)

The project is being migrated from a single-planner app to a multi-tab workspace. Each tab has an independent planner with its own Redux state under `state.planners[tabId]`, its own undo/redo history, and its own Item Summary. A `WorkspaceLayout` component renders a `TabBar` above the active tab's `FactoryPlanner`. All planner actions carry a `tabId` in `action.meta.tabId`, injected by `TabDispatchProvider` (a React context wrapping useDispatch). The history middleware routes undo/redo entries per-tab, and `createTabThunk` auto-injects `tabId` into inner dispatches. The legacy single-planner Redux slices (`state.dependencies`, `state.history`, etc.) are retained as a fallback during migration.

**Phase 0**: Workspace slice, planners reducer, operation tracking, planner state types  
**Phase 1**: `createTabThunk` wrapper, `TabDispatchContext`, `useWorkspaceInit`  
**Phase 2**: Dual-mode history middleware (legacy + per-tab), per-tab undo/redo stacks  
**Phase 3**: All 14 thunks converted, all 17 hooks receive `tabId`  
**Phase 4**: Selector migration to `state.planners[tabId]`, legacy undo exports deleted, 68/68 tests pass  
**Phase 5**: `TabBar.tsx`, `WorkspaceLayout.tsx`, multi-tab isolation, persistence **— COMPLETE** (see §11)

## 4. Fixed — TabBar CSS Conflict

**RESOLVED** via commit 2067695. The TabBar is now rendered inside `FactoryPlannerLayout` between the fixed CommandBar and the planner content area. `WorkspaceLayout` is a thin compositional wrapper (TabDispatchProvider + FactoryPlanner with tabBar prop). No `height: 100vh` on the outer wrapper — only `FactoryPlannerLayout` manages the viewport height.

## 5. Fixed — Multi-Tab Runtime Failures (7 root causes)

Diagnosed in `MULTITAB_RUNTIME_DIAGNOSIS.md`. All 7 root causes resolved across 6 commits:

| Commit | Fix |
|--------|-----|
| `bb658ca` | Fix(A): `plannersReducer` pre-initializes `planners[tabId]` on `addTab`/`removeTab`/`replaceWorkspace` |
| `09a52bb` | Fix(B): All 9 selector `??` fallbacks removed — tabs no longer leak root state |
| `e757aef` | Fix(C): All 11 hooks use `useTabDispatch()` — actions carry `meta.tabId` |
| `79c6fe9` | Fix(D): localStorage keys scoped per `tabId`; `usePlannerNodeState` re-loads on tab switch |
| `c2daed6` | Fix(E): `useWorkspaceInit` persists/restores `workspace_tabs` to localStorage |
| `1f9082f` | Test(F): 13 new UI-level integration tests (81 total, 0 failures) |

## 6. Remaining Phase 5 Work After TabBar Fix

1. ✅ TabBar renders — confirmed in DOM via Chrome DevTools MCP
2. ✅ Tab switching works — each tab has independent empty planner state
3. ✅ New tab starts blank — no data leakage from other tabs
4. ✅ Workspace persists across reload — verified 2 tabs survive refresh
5. ✅ 0 console errors on load and tab switching
6. ✅ 81/81 tests pass (68 original + 13 new multi-tab tests)
7. ✅ `yarn type-check` passes
8. ✅ IMPLEMENTATION_LOG.md updated

## 7. Open Issues (from IMPLEMENTATION_LOG.md)

- Legacy undo/redo exports deleted; all 18 undoRedo tests pass with tab-scoped store
- `beginHistoryTransaction`/`commitHistoryTransaction` called with `tabId` everywhere (hooks pass it, legacy path is gone)
- Root-level selectors are still active as fallback — migration to `state.planners[tabId].xxx` deferred to Phase 4 cleanup (already done for 4 hooks, remaining hooks receive props transitively)
- `usePlannerNodeState` localStorage keys scoped to `lastSession_{tabId}_*`
- No multi-tab UI exposed until Phase 4 single-tab parity confirmed (done — 68/68 tests)
- `activeOperations` records are runtime-only (not in any persistence shape)
- Save Workspace infrastructure ready but not implemented yet (Phase 6)
- Workspace Load not implemented yet (Phase 6)

## 8. Hard Constraints

- `activeOperations` records are runtime-only — never persisted or restored
- Save Workspace is disabled whenever any tab has active operations
- Load Workspace uses a workspace-level lock
- Tab close is disabled while that tab is busy
- New Tab and switching to an idle tab are always allowed while another tab is busy
- No localStorage key writes without `tabId` prefix
- No multi-tab UI is exposed before Phase 4 single-tab parity tests pass (done — 68/68)

## 9. Test Baseline

```
yarn type-check: passes
yarn test: 81 passed, 0 failed (7 test files)
```

68 original tests + 13 new multi-tab integration tests. All 18 undoRedo integration tests pass with tab-scoped store. 6 tab isolation tests pass. All changes must maintain this baseline — run `yarn test -- --run` after every commit.

## 10. Key Files and Their Roles

| File | Role |
|------|------|
| `src/features/workspace/components/WorkspaceLayout.tsx` | Top-level layout: TabBar + FactoryPlanner in TabDispatchProvider |
| `src/features/workspace/components/TabBar.tsx` | Tab buttons, "+" add, "×" close (disabled when busy), rename |
| `src/features/workspace/context/TabDispatchContext.tsx` | React context: `TabDispatchProvider` wraps children; `useTabDispatch()` returns tab-scoped dispatch |
| `src/features/workspace/store/createTabThunk.ts` | Wraps `createAsyncThunk`: injects `tabId` into `action.meta`, generates `operationId`, dispatches begin/end operation |
| `src/features/workspace/store/plannersReducer.ts` | Per-tab sub-reducer routing via `action.meta.tabId`; `perTabHistoryReducer` handles `_planner/pushSnapshot`, `_planner/undoStackPop`, etc. |
| `src/features/workspace/store/workspaceSlice.ts` | Tabs array, activeTabId, add/remove/rename/reorder reducers |
| `src/features/workspace/store/plannerState.ts` | `PlannerState` type with `activeOperations` |
| `src/features/workspace/hooks/useWorkspaceInit.ts` | Creates default tab on first mount |
| `src/features/factory-planner/store/historyMiddleware.ts` | Dual-mode: per-tab (`action.meta.tabId`) + legacy root-level; `_planner/*` action types; `beginHistoryTransaction`/`commitHistoryTransaction` with optional `tabId`; `undoAction(tabId)`/`redoAction(tabId)` |
| `src/features/factory-planner/hooks/useUndoRedo.ts` | Reads per-tab history from `state.planners[tabId].history` |
| `src/features/factory-planner/components/FactoryPlannerLayout.tsx` | Existing layout: CommandBar at top, planner + summary below (flex column, manages its own height) |
| `src/App.tsx` | Renders `WorkspaceLayout`; calls `useWorkspaceInit` |
| `src/store/index.ts` | Root store: `workspace`, `planners`, legacy slices + `historyMiddleware` |
| `src/features/workspace/components/FactoryPlanner.tsx` | Main planner component (exports default) |
| `src/features/factory-planner/components/FactoryPlanner.tsx` | Main planner component (same as above — re-exports from feature directory) |
| `tests/integration/multiTabUI.test.tsx` | 13 new UI-level multi-tab tests (planner init, tab isolation, TabDispatchProvider, localStorage scoping) |

## 11. Phase 5 Verification (2026-08-11)

All verification performed via Chrome DevTools MCP against isolated debug Chrome (`--remote-debugging-port=9222`). Screenshots in `TEMP_SCREENSHOTS/`.

### Layout
| Screenshot | Confirmation |
|------------|-------------|
| `subphase-g-persistence-verified.png` | 2 tabs (Planner 1 + Planner 2) visible, independent empty planners, "No items to summarize" |

### Computed Layout
- 100vh divs: **1** (FactoryPlannerLayout only — no double 100vh conflict)
- CommandBar: position=fixed, z-index=100, top=0, h=123px
- TabBar: top=135, h=37px, flexShrink=0 (correctly between CommandBar and content)

### Runtime Behavior
| Test | Result |
|------|--------|
| New tab starts empty | ✅ "No items to summarize", no data leakage |
| Tabs survive refresh | ✅ 2 tabs restored correctly |
| Console errors on load | ✅ 0 |
| Console errors on tab switch | ✅ 0 |
| Legacy root slices intact | ✅ All legacy reducers still in store |

### Test Results
```
yarn type-check: passes
yarn test: 81 passed, 0 failed (7 test files)
```
