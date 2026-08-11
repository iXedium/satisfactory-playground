# HANDOVER.md — Multi-Planner Tabs (new-architecture branch)

## 1. Branch

```
new-architecture
```

## 2. Last Commit

```
SHA: 88a5459
Message: Fix: WorkspaceLayout flexbox — TabBar now visible
Date: 2026-08-11
```

## 3. Architecture Summary (Phases 0–5)

The project is being migrated from a single-planner app to a multi-tab workspace. Each tab has an independent planner with its own Redux state under `state.planners[tabId]`, its own undo/redo history, and its own Item Summary. A `WorkspaceLayout` component renders a `TabBar` above the active tab's `FactoryPlanner`. All planner actions carry a `tabId` in `action.meta.tabId`, injected by `TabDispatchProvider` (a React context wrapping useDispatch). The history middleware routes undo/redo entries per-tab, and `createTabThunk` auto-injects `tabId` into inner dispatches. The legacy single-planner Redux slices (`state.dependencies`, `state.history`, etc.) are retained as a fallback during migration.

**Phase 0**: Workspace slice, planners reducer, operation tracking, planner state types  
**Phase 1**: `createTabThunk` wrapper, `TabDispatchContext`, `useWorkspaceInit`  
**Phase 2**: Dual-mode history middleware (legacy + per-tab), per-tab undo/redo stacks  
**Phase 3**: All 14 thunks converted, all 17 hooks receive `tabId`  
**Phase 4**: Selector migration to `state.planners[tabId]`, legacy undo exports deleted, 68/68 tests pass  
**Phase 5**: `TabBar.tsx`, `WorkspaceLayout.tsx` (partial — CSS conflict with TabBar)

## 4. Current Broken State — TabBar CSS Conflict

**What was attempted**: `WorkspaceLayout.tsx` wraps the entire viewport in `height: 100vh; display: flex; flex-direction: column` with TabBar at top and FactoryPlanner filling the remaining space.

**Symptom**: The TabBar was invisible in the browser despite being in the DOM. The `FactoryPlanner` component internally renders its own full-height layout (likely a `FactoryPlannerLayout` component), which overflows or overlaps the TabBar. With `flexShrink: 0` and `minHeight: 0` added, the TabBar became visible but the layout is fragile — it wraps the entire viewport in `100vh`, fighting FactoryPlanner's own layout assumptions.

**What must NOT be done**: Do NOT apply `height: 100vh` to the outer WorkspaceLayout container. The `FactoryPlanner` / `FactoryPlannerLayout` already manages its own full-height layout internally.

## 5. Likely Correct Fix

The `TabBar` should be inserted **below** the existing `CommandBar` (the toolbar with save/load/undo/redo/add-item/sort controls), not wrap the entire viewport. The `WorkspaceLayout` should be a thin compositional layer that adds the TabBar between the CommandBar and the planner content — it should NOT impose its own height constraints.

The target structure:

```
<FactoryPlannerLayout>       ← existing layout (manages height internally)
  <CommandBar />             ← existing toolbar (save, load, undo, redo, add, sort)
  <TabBar />                 ← NEW: inserted between CommandBar and content
  <planner + summary area /> ← existing content area (flexes to fill remaining space)
</FactoryPlannerLayout>
```

This requires reading `FactoryPlannerLayout.tsx` and understanding its internal flex layout, then inserting the `TabBar` as a new `flexShrink: 0` row between the CommandBar and the content area. The `TabBar` should only render when there are multiple tabs (or always, since there's always at least one default tab). The `TabDispatchProvider` wraps the planner content area (not the CommandBar, since commands should be tab-agnostic and dispatch to the active tab).

Alternatively, if modifying FactoryPlannerLayout is undesirable, the TabBar can be placed absolutely positioned within its existing layout, but this is fragile.

## 6. Remaining Phase 5 Work After TabBar Fix

1. Verify TabBar renders by examining the DOM snapshot after the fix
2. Verify tab switching works (add a second tab, click between them, confirm different state)
3. Verify busy indicator (spinner prefix on tab) appears during async operations
4. Confirm no console errors on page load or tab switching
5. Update `IMPLEMENTATION_LOG.md` with Phase 5 completion

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
yarn test: 68 passed, 0 failed (6 test files)
```

All 18 undoRedo integration tests pass with tab-scoped store. 6 tab isolation tests pass. All changes must maintain this baseline — run `yarn test -- --run` after every commit.

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
