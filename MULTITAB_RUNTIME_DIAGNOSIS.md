# MULTITAB_RUNTIME_DIAGNOSIS.md

> **Branch**: `new-architecture`
> **Date**: 2026-08-11
> **Test baseline**: 68/68 tests pass, `yarn type-check` passes
> **Status**: 4 confirmed runtime failures — root causes traced to selector fallback logic and missing state initialization

## Reproduction Steps

1. Load app at `http://localhost:5173` → Planner 1 shows saved data (Turbo Motor, Nuclear Pasta, etc.)
2. Click "+" in TabBar → Planner 2 created, **shows identical data as Planner 1**
3. Refresh the page → only Planner 1 remains; Planner 2 is gone
4. (Conceptual) Dispatch any `meta.tabId` action against Planner 1 → plannersReducer creates empty `planners[tab1Id]` → selectors switch from populated root-level data to empty per-tab data → screen clears

### Screenshots (in `TEMP_SCREENSHOTS/`)

| Step | File | Observation |
|------|------|-------------|
| (a) | `step1-planner1-populated.png` | TabBar: "Planner 1", populated tree data |
| (b) | `step2-planner2-created.png` | TabBar: "Planner 1" + "Planner 2", **same tree data** |
| (d) | `step3-after-value-change.png` | Value changed (DOM only, no Redux dispatch) |
| (e) | `step4-after-refresh.png` | Only "Planner 1" remains — Planner 2 lost |

---

## Root Cause 1: Selector Fallback Reads Legacy Root State

**Files**: `src/features/factory-planner/hooks/useFactoryPlanner.ts:170-171`, `usePlannerSaveLoad.ts:116-117`

```typescript
// useFactoryPlanner.ts:170-171
const dependencies = useSelector((state: RootState) =>
  state.planners[tabId]?.dependencies ?? state.dependencies);
const recipeSelections = useSelector((state: RootState) =>
  state.planners[tabId]?.recipeSelections.selections ?? state.recipeSelections.selections);
```

The `??` fallback was designed for the migration period when most data still lived in the legacy root-level slices (`state.dependencies`, `state.recipeSelections`). When a new tab is created (`addTab`), no corresponding `planners[newTabId]` entry exists. The selectors return `undefined` from the per-tab path and fall back to the **global** `state.dependencies`, which contains ALL existing planner data. This makes every new tab appear to have the same data as the previously loaded planner.

**Impact**: Bugs #1 (new tabs share data) and #2 (new tab not blank slate).

---

## Root Cause 2: `addTab` Does Not Initialize `planners[tabId]`

**File**: `src/features/workspace/store/workspaceSlice.ts:22-27`

```typescript
addTab(state, action: PayloadAction<TabDescriptor>) {
  state.tabs.push(action.payload);
  if (state.activeTabId === null) {
    state.activeTabId = action.payload.tabId;
  }
  // ❌ MISSING: state.planners[tabId] = createEmptyPlannerState()
}
```

`addTab` only adds a tab descriptor. It does NOT create a corresponding `planners[tabId]` entry initialized as an empty planner state. The planner state is created **lazily** by `plannersReducer` (`plannersReducer.ts:75`) only when the first action carrying `meta.tabId` arrives.

**Impact**: Combined with Root Cause 1, new tabs display stale data from the root-level fallback.

---

## Root Cause 3: `plannersReducer` Lazily Creates Empty State, Clobbering Root Data

**File**: `src/features/workspace/store/plannersReducer.ts:71-80`

```typescript
export function plannersReducer(state: PlannersRoot = {}, action: any): PlannersRoot {
  const tabId = action?.meta?.tabId;
  if (!tabId) return state;

  const existing = state[tabId] || createEmptyPlannerState(); // ← line 75
  const updated = tabReducer(existing, action);

  if (updated === existing) return state;
  return { ...state, [tabId]: updated as PlannerState };
}
```

When the **first** action with `meta.tabId` is dispatched (e.g., adding a new item, changing excess, pressing undo), the reducer:

1. Finds no `state[tabId]` entry → creates `createEmptyPlannerState()` **(line 75)**
2. Applies the action to this **empty** state
3. Returns `{ ...state, [tabId]: emptyStateWithOneEdit }`

Now the selectors see `state.planners[tabId]?.dependencies` exists (it's the empty `{ dependencyTrees: {}, ... }` object) and STOP falling back to `state.dependencies`. The UI switches from showing all populated root-level data to showing the nearly-empty per-tab state.

**Impact**: Bug #3 (screen clears on first tab-scoped action). All existing tree data vanishes because the per-tab state was initialized empty instead of being seeded from the current root-level state.

**Critical observation**: The `loadSavedState` action dispatched by `useFactoryPlanner` (line 453) does NOT carry `meta.tabId`. It populates the **root-level** `state.dependencies` and `state.recipeSelections` — NOT any per-tab planner state. When `plannersReducer` later creates `planners[tabId]`, all this data is left behind in the root slices.

---

## Root Cause 4: Workspace Not Persisted to Storage

**File**: `src/features/workspace/hooks/useWorkspaceInit.ts:10-23`
**Also**: `src/features/workspace/store/workspaceSlice.ts` — no persistence actions

```typescript
export function useWorkspaceInit(): boolean {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((s: RootState) => s.workspace.tabs);

  useEffect(() => {
    if (tabs.length === 0) {
      const tabId = `tab-${Date.now()}`;
      dispatch(addTab({ tabId, name: generateTabName(1) }));
    }
  }, [tabs.length, dispatch]);

  return tabs.length > 0;
}
```

The workspace state (`state.workspace.tabs`, `state.workerspace.activeTabId`) is **never persisted** to localStorage or IndexedDB. On every page refresh:

1. Redux store initializes with `workspace: { tabs: [], activeTabId: null }`
2. `useWorkspaceInit` sees empty tabs → creates ONE new default tab with `tab-${Date.now()}`
3. All previously created tabs are lost

**Additionally**, `state.planners` is also not persisted — it's purely in-memory. Per-tab planner data vanishes on refresh.

**Impact**: Bug #4 (all created tabs disappear after refresh).

---

## Root Cause 5: Non-Tab-Scoped localStorage Keys for Core State

**File**: `src/features/factory-planner/hooks/useFactoryPlanner.ts:80-83, 446-501`

```typescript
const LS_DEPENDENCIES_KEY = 'lastSession_savedDependencies';   // NOT tab-scoped
const LS_RECIPES_KEY = 'lastSession_savedRecipeSelections';     // NOT tab-scoped
```

The auto-save effects (lines 476-501) save `dependencies` and `recipeSelections` using global keys. These keys are **shared across all tabs**, meaning:

1. When tab A auto-saves, it writes its state to the shared key
2. When tab B auto-saves, it **overwrites** tab A's saved state
3. On refresh, only the last tab's state survives

Note: `usePlannerNodeState` (lines 6-10) correctly scopes its keys to `tabId`:
```typescript
const lsExcessMap = (tabId: string) => `lastSession_${tabId}_savedExcessMap`;
// etc.
```
But this data is React local state, not Redux. The Redux-level save/load uses non-scoped keys.

---

## Root Cause 6: Load-on-Mount Effect Uses Non-Scoped Keys + Root Dispatch

**File**: `src/features/factory-planner/hooks/useFactoryPlanner.ts:446-472`

```typescript
useEffect(() => {
  const savedDependencies = localStorage.getItem(LS_DEPENDENCIES_KEY);  // global key
  if (savedDependencies) {
    dispatch(loadSavedState(JSON.parse(savedDependencies)));            // no meta.tabId
  }
  const savedRecipeSelections = localStorage.getItem(LS_RECIPES_KEY);   // global key
  if (savedRecipeSelections) {
    dispatch(loadRecipeSelections(JSON.parse(savedRecipeSelections)));  // no meta.tabId
  }
}, [dispatch]);
```

Data loaded from localStorage is dispatched to the **root-level** reducers (`state.dependencies`, `state.recipeSelections`) — NOT to `planners[tabId]`. This is the legacy loading path that pre-dates the multi-tab architecture. It ensures data survives a refresh, but loads it into the wrong store location for a tab-scoped architecture.

---

## Root Cause 7: `usePlannerNodeState` Load Effect Ignores `tabId` Changes

**File**: `src/features/factory-planner/hooks/usePlannerNodeState.ts:34-86`

```typescript
useEffect(() => {
  // load from localStorage using lsExcessMap(tabId), etc.
  // ...
}, []);  // ❌ empty dependency — runs only on mount, ignores tabId changes
```

When the user switches tabs, `tabId` changes but the load-on-mount effect does NOT re-run. A new tab will not load any previously saved node state for its `tabId`. Conversely, switching back to a previously-used tab will not restore its saved node state from localStorage (unless the component fully remounts, which it doesn't because `TabDispatchProvider` keeps the same `FactoryPlanner` instance mounted).

---

## TabDispatchProvider Action Verification

**File**: `src/features/workspace/context/TabDispatchContext.tsx:18-22, 33-39`

```typescript
function injectTabMeta(action: unknown, tabId: string): unknown {
  if (typeof action === 'function') return action;
  const a = (action || {}) as Record<string, unknown>;
  return { ...a, meta: { ...(a.meta as Record<string, unknown> || {}), tabId } };
}

const tabDispatch = useCallback(
  (action: unknown): unknown => {
    if (tabId === null) return rawDispatch(action);
    return rawDispatch(injectTabMeta(action, tabId));
  },
  [rawDispatch, tabId]
);
```

**Confirmed**: Actions dispatched through `useTabDispatch()` correctly inject `meta.tabId` into plain objects. Thunks (functions) are passed through without injection — they receive `tabId` via `createTabThunk`.

**Note**: `FactoryPlanner.tsx:396-498` renders both `CommandBar` and content inside `TabDispatchProvider`, which is correct for tab-scoped commands (undo, redo, save, load).

---

## Test Audit

### `tests/workspace/plannersReducer.test.ts` — 6 tests

| Test | Assessment |
|------|------------|
| routes action with meta.tabId | ✅ Tests store-level reducer routing |
| does not route actions without tabId | ✅ |
| tabs are independent | ✅ Tests `planners[tab-a]` ≠ `planners[tab-b]` |
| _planner/pushSnapshot routes | ✅ |
| _planner/setRestoring | ✅ |
| does not route _planner/* without tabId | ✅ |

**Gap**: All tests dispatch actions directly to the store with `meta.tabId` pre-attached. No test verifies the TabBar + FactoryPlanner UI integration. No test verifies that `addTab` creates a `planners[tabId]` entry (because the reducer lazily creates it, but the bug is that it's empty).

### `tests/integration/tabIsolation.test.ts` — 6 tests

| Test | Assessment |
|------|------------|
| tree creation dispatches with meta.tabId | ✅ Pure Redux store test |
| per-tab history stores snapshot | ✅ |
| per-tab undoAction | ✅ |
| per-tab redoAction | ✅ |
| Tab A ops do not affect Tab B | ✅ Tests two tabs via `addTab` + manual meta dispatch |
| activeOperations tracks begin/end | ✅ |

**Gap**: Uses `addTab` to create tab-b, then manually dispatches actions with `meta: { tabId: 'tab-b' }`. This bypasses the TabDispatchProvider. No UI-level rendering is tested. No test checks what selectors return when `planners[tabId]` is undefined (the fallback bug). No test verifies tabs survive refresh.

### `tests/integration/undoRedo.test.ts` — 18 tests

All 18 tests use a `td` helper that manually injects `meta.tabId` into dispatched actions (line 183-186):
```typescript
td = ((action: any) => {
  if (typeof action === 'function') return store.dispatch(action);
  return store.dispatch({ ...action, meta: { ...(action.meta || {}), tabId: TAB_ID } });
}) as AppDispatch;
```
This simulates TabDispatchProvider's behavior at the store level.

**Gap**: No test exercises the full call chain from UI event → TabDispatchProvider → action → plannersReducer → selector. All selectors read directly from `state.planners[TAB_ID]` — none test the `??` fallback path.

### `tests/utils/renderWithProviders.tsx`

Wraps components in Redux Provider only. Does NOT wrap in `TabDispatchProvider`, `TreeNavigationProvider`, `HideToggleDragProvider`, or `InitializationProvider`. No test renders `WorkspaceLayout`, `TabBar`, or `FactoryPlanner` through this utility.

### Summary of Test Gaps

| Gap | Severity |
|------|----------|
| No UI-level multi-tab rendering test | **Critical** |
| No test verifies selector fallback behavior when `planners[tabId]` is undefined | **Critical** |
| No test verifies `addTab` initializes a blank per-tab state | **Critical** |
| No test verifies tabs survive page refresh | **Critical** |
| No test exercises full user interaction path through TabDispatchProvider | High |
| No test verifies non-scoped localStorage keys | Medium |
| No test verifies `usePlannerNodeState` re-loads on tab switch | Medium |

---

## Minimal Ordered Repair Plan

### Phase A: Fix selector fallback (Root Cause 1)

Make selectors return **empty/default** state when `planners[tabId]` is missing, NOT the legacy root state.

**Files**: `useFactoryPlanner.ts:170-171`, `usePlannerSaveLoad.ts:116-117`
**Approach**: Change `??` to use `createEmptyPlannerState()` defaults:
```typescript
const dependencies = useSelector((state: RootState) =>
  state.planners[tabId]?.dependencies ?? { dependencyTrees: {}, ... });
```
OR: Pre-initialize `planners[tabId]` on tab creation (see Phase B).

### Phase B: Initialize `planners[tabId]` on `addTab` (Root Cause 2)

Extend `addTab` to also create an empty `planners[tabId]` entry **or** dispatch a workspace-level action that `plannersReducer` handles without a `meta.tabId`. Consider adding a `_workspace/initPlanner` action type that `plannersReducer` listens for with `tabId` in payload (not meta).

**File**: `workspaceSlice.ts:22-27`, `plannerReducer.ts`

### Phase C: Seed per-tab state from root on first action (Root Cause 3)

When `plannersReducer` lazily creates a planner for an existing `tabId`, it must copy the current root-level data into the new per-tab state — UNLESS the tab was created AFTER the data was loaded (i.e., new tabs should start empty). Track whether a tab existed when data was loaded, or migrate the `loadSavedState` dispatch to carry `meta.tabId` for the active tab.

### Phase D: Scope localStorage keys to tabId (Root Cause 5)

Change `LS_DEPENDENCIES_KEY` and `LS_RECIPES_KEY` from global to tab-scoped:
```typescript
const LS_DEPENDENCIES_KEY = (tabId: string) => `lastSession_${tabId}_savedDependencies`;
const LS_RECIPES_KEY = (tabId: string) => `lastSession_${tabId}_savedRecipeSelections`;
```
The load-on-mount effect must load data for the **default** tab (or active tab) only, and dispatch with `meta.tabId`.

### Phase E: Persist workspace state (Root Cause 4)

Save `state.workspace.tabs` and `state.workspace.activeTabId` to localStorage on change. Load on mount. The `replaceWorkspace` action already exists for this purpose.

### Phase F: Fix `usePlannerNodeState` tab-change reactivity (Root Cause 7)

Change the load effect's dependency from `[]` to `[tabId]` so node state is reloaded on tab switch.

### Phase G: Add integration tests

Extend `tabIsolation.test.ts` or create a new test file that:
1. Renders `<WorkspaceLayout />` (with full provider stack)
2. Creates two tabs via UI interaction (click "+")
3. Verifies tab B starts empty while tab A still has data
4. Verifies editing a value in tab A does not clear the screen
5. Mocks localStorage to verify tab-scoped save/load
6. Verifies tabs survive simulated page refresh
