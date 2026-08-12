# Fix Save Prefixing & Implement Linked Tab Model

## Context

The `tab:{tabId}:` prefix in `usePlannerSaveLoad.ts` makes all pre-existing saves invisible and unloadable. Saves are tab-agnostic blueprints — any save should be loadable into any tab.

Additionally, `onDirtyChange` was never wired through the component chain. The callback is accepted by `FactoryPlannerShell` but never connected to `isDirty` from `usePlannerSaveLoad`.

---

## Implementation Steps

### Step 1 — Remove tab prefix from save names

**File:** `src/features/factory-planner/hooks/usePlannerSaveLoad.ts`

- Delete `makeTabPrefix()` function and all references to `prefix` variable
- In `init` useEffect: show all save names as-is, filtering out only `workspace:` prefixed names
- In `refreshNames`: same filtering (exclude `workspace:`)
- In `saveSetup`: save with `name` directly, no prefixing
- In `loadSetup`: load with `name` directly, no prefixing
- In `deleteSetup`: delete with `name` directly, no prefixing
- KEEP `activeSetupName_{tabId}` in localStorage — per-tab tracking of which setup is currently loaded is correct
- Add `workspace:` filter constant at module level

### Step 2 — Wire onDirtyChange through component chain

**FactoryPlanner.tsx:**
- Convert to `forwardRef` with `FactoryPlannerRef` type: `{ unlinkSetup(): void }`
- `useImperativeHandle` exposes `unlinkSetup` (destructured from `useFactoryPlanner`)
- Add `onDirtyChange?: (dirty: boolean) => void` to `FactoryPlannerProps`
- Pass it to `useFactoryPlanner(tabId, isActive, onDirtyChange)`

**useFactoryPlanner.ts:**
- Add `onDirtyChange?: (dirty: boolean) => void` as third parameter
- Add `useEffect` watching `isDirty` from `usePlannerSaveLoad` result, calling `onDirtyChange?.(isDirty)` on change. Include `isDirty` and `onDirtyChange` in the dependency array.
- Add `useRef(true)` to track initial mount state for linked-setup effect (see Step 3)
- Return `unlinkSetup` from `usePlannerSaveLoad` in the hook's result interface

**FactoryPlannerShell.tsx:**
- Pass `onDirtyChange` prop through to `<FactoryPlanner>`
- Hold a `plannerRef = useRef<FactoryPlannerRef>(null)` on `<FactoryPlanner ref={plannerRef}>`
- Add `unlinkSetup(): void` to `FactoryPlannerShellRef` alongside `getFullState()`
- `unlinkSetup` in the shell's `useImperativeHandle` delegates: `() => plannerRef.current?.unlinkSetup()`

### Step 3 — Add onLinkedSetupChange callback chain + unlink mechanism

**New callback signature:** `onLinkedSetupChange?: (name: string | null) => void`

**FactoryPlanner.tsx:**
- Add `onLinkedSetupChange?: (name: string | null) => void` to props
- Pass to `useFactoryPlanner(tabId, isActive, onDirtyChange, onLinkedSetupChange)`

**useFactoryPlanner.ts:**
- Add `onLinkedSetupChange?: (name: string | null) => void` as fourth parameter
- Add `useEffect` watching `activeSetupName` from `usePlannerSaveLoad` result
- **CRITICAL:** Use `useRef(true)` to skip the callback on initial mount. Without this, every page reload would re-fire `onLinkedSetupChange` and overwrite any user-renamed tab name back to the save name.
- **CRITICAL:** Dependency array must be `[activeSetupName]` ONLY. Do NOT include `isActive` — that would cause `onLinkedSetupChange` to re-fire on every tab switch.
  ```typescript
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onLinkedSetupChange?.(activeSetupName);
  }, [activeSetupName]);
  ```

**FactoryPlannerShell.tsx:**
- Add `onLinkedSetupChange` prop
- Pass through to `<FactoryPlanner>`

**WorkspaceLayout.tsx:**
- Add `handleLinkedSetupChange` callback that returns a per-tab closure (same pattern as `handleDirtyChange`):
  ```typescript
  const handleLinkedSetupChange = useCallback((tabId: string) => (name: string | null) => {
    if (name !== null) dispatch(renameTab({ tabId, name }));
    setLinkedMap(prev => ({ ...prev, [tabId]: name }));
  }, [dispatch]);
  ```
- Pass `onLinkedSetupChange={handleLinkedSetupChange(tab.tabId)}` to each `FactoryPlannerShell`
- Add `linkedMap: Record<string, string | null>` state, initialized from localStorage on mount, passed to `TabBar`
- **Fetch save names for TabBar conflict check:** WorkspaceLayout imports `saveService` directly and fetches all save names on mount (filtering out `workspace:` prefix), stores as `saveNames: string[]` state. Passed to `TabBar` as prop. This avoids coupling Planner → WorkspaceLayout for a simple server query.

**Unlink mechanism (ref-based, no global event bus):**

The `unlinkSetup()` function must clear React state inside `usePlannerSaveLoad` (activeSetupName, lastSavedStateInMemory, isDirty). FactoryPlannerShell cannot access hook state directly — only `getFullState` works that way because it reads Redux state via `useStore()`. Hook state requires going through the component that owns it. Therefore:

- **usePlannerSaveLoad** returns `unlinkSetup` in its result interface. `unlinkSetup()` calls `localStorage.removeItem`, `setActiveSetupName(null)`, `setLastSavedStateInMemory(null)`, `setIsDirty(false)`.
- **useFactoryPlanner** surfaces `unlinkSetup` in its return value.
- **FactoryPlanner becomes `forwardRef`** with `useImperativeHandle` exposing `{ unlinkSetup() }`. Destructures `unlinkSetup` from `useFactoryPlanner` and attaches it to the ref.
- **FactoryPlannerShell** holds a `plannerRef = useRef<FactoryPlannerRef>(null)` on the `<FactoryPlanner>` child. Its own `useImperativeHandle` delegates `unlinkSetup` to `plannerRef.current?.unlinkSetup()`.
- **FactoryPlannerShellRef** adds `unlinkSetup(): void` alongside `getFullState()`.

**WorkspaceLayout `handleUnlinkTab(tabId)`:**
1. `setLinkedMap(prev => ({ ...prev, [tabId]: null }))`
2. `shellRefs.current.get(tabId)?.unlinkSetup()` — calls through Shell ref → Planner ref → hook

**Remove:** the custom DOM event listener from `usePlannerSaveLoad`, the `window.dispatchEvent` calls from WorkspaceLayout, and all related event handler code from Step 3's previous draft.

### Step 4 — Update TabBar with link icon and linked tab rename rules

**TabBar.tsx:**
- Accept `linkedMap: Record<string, string | null>` prop
- Accept `saveNames: string[]` prop (all save names from server, used to block rename conflicts)
- Accept `onUnlinkTab: (tabId: string) => void` callback
- **Linked tab** (`linkedMap[tab.tabId]` is non-null):
  - Tab name is LOCKED — double-click does nothing. On double-click, show browser native tooltip via `title` attribute: "Unlink to rename"
  - 🔗 icon before tab name is CLICKABLE: **double-click** the 🔗 icon to unlink. Single-click on 🔗 does nothing (prevents accidental unlink). Clicking anywhere else on the tab selects it normally.
  - No inline edit input appears for linked tabs.
- **Unlinked tab** (`linkedMap[tab.tabId]` is null):
  - Double-click opens inline rename input (existing behavior)
  - On submit: check if typed name (case-insensitive) matches any name in `saveNames` array
    - If match: show inline error message on the tab: "This name is already a saved setup." Keep input open for correction. Do NOT save/overwrite.
    - If no match: dispatch `renameTab` as usual
- **Link icon tooltip:** `title={\`Linked to: ${linkedMap[tab.tabId]}\`}` on the 🔗 icon
- Empty tab default name: "Planner N" instead of "Tab N"

**workspaceSlice.ts (minor):**
- Change `generateTabName()` to return `Planner ${nextTabNumber++}` instead of `Tab ${nextTabNumber++}`
- Update the regex in `loadWorkspaceState` to match both `/^Tab (\d+)$/` and `/^Planner (\d+)$/`

### Step 5 — Implement load-linked and load-unlinked in usePlannerSaveLoad

**usePlannerSaveLoad.ts `init` useEffect (enhanced for reload resilience):**
1. Fetch all save names from server, filter out `workspace:` prefixed names
2. Restore `activeSetupName` from localStorage
3. **NEW: If `activeSetupName` is set, fetch that save from the server and set as `lastSavedStateInMemory`**
   - Without this, page reload loses the dirty-tracking baseline. The tab shows as linked (🔗 icon) but `isDirty` is always false because there's nothing to compare against.
   ```typescript
   const storedActive = localStorage.getItem(`${LS_ACTIVE_NAME_PREFIX}${tabId}`);
   if (!cancelled && storedActive) {
     setActiveSetupName(storedActive);
     // Restore dirty-tracking baseline from server
     const activeResult = await saveService.get(storedActive);
     if (!cancelled && activeResult.ok && activeResult.data) {
       setLastSavedStateInMemory(JSON.parse(activeResult.data));
     }
   }
   ```

**usePlannerSaveLoad.ts `loadSetup`:**
1. GET save by name from saveService
2. Dispatch `loadSavedState` + `loadRecipeSelections` to planner store
3. Set all UI state maps (excessMap, machineCountMap, etc.)
4. Store `activeSetupName_{tabId}` in localStorage = name
5. Set `lastSavedStateInMemory` = loaded state
6. Set `activeSetupName` = name
7. Set `isDirty` = false

The `useEffect` in useFactoryPlanner will detect `activeSetupName` change and call `onLinkedSetupChange(tabId, name)`, which triggers WorkspaceLayout to update `linkedMap` and rename the tab. The initial-mount skip ref ensures this does NOT fire on page reload.

**Dirty state:**
- Linked tab (`activeSetupName !== null`): `isDirty` tracks against `lastSavedStateInMemory`
- Unlinked tab (`activeSetupName === null`): `lastSavedStateInMemory` is null → `checkDirtyState` returns false → `isDirty = false`
- After reload: `lastSavedStateInMemory` is restored from server (see init enhancement above), so dirty comparison works correctly

### Step 6 — Linked tab persistence across reloads

On page reload:
- `workspaceState` localStorage restores tab names + activeTabId (unchanged behavior)
- `usePlannerSaveLoad.init` restores `activeSetupName` from `activeSetupName_{tabId}` localStorage
- `usePlannerSaveLoad.init` fetches saved state from server to restore `lastSavedStateInMemory` (Step 5 enhancement)
- `useFactoryPlanner`'s `activeSetupName` effect fires but initial-mount skip (Step 3) prevents re-firing `onLinkedSetupChange`
- Tab name stays as-is from workspaceState (user's manual rename preserved)

**WorkspaceLayout.tsx additional:**
- Add `useEffect` that builds initial `linkedMap` by reading `activeSetupName_{tabId}` for all tabs on mount:
  ```typescript
  useEffect(() => {
    const map: Record<string, string | null> = {};
    for (const tab of tabs) {
      const name = localStorage.getItem(`activeSetupName_${tab.tabId}`);
      map[tab.tabId] = name || null;
    }
    setLinkedMap(map);
  }, [tabs]); // re-derive when tabs array changes
  ```
- Note: use `[tabs]` as the dependency array — when a tab is added or removed, the linkedMap is rebuilt from localStorage

### Step 7 — New tab naming and "(2)" suffix for duplicate loads

**Deferred to future iteration.** The infrastructure (`onLinkedSetupChange`) is in place. When implemented:
- WorkspaceLayout would expose a `loadIntoNewTab(saveName)` function
- Check all tab names in workspaceSlice for conflicts
- If `saveName` exists, try `saveName (2)`, `saveName (3)` until unique
- Create tab, load state via initialState prop on FactoryPlannerShell
- Set `activeSetupName` = null (unlinked)
- Tab name = unique name

---

## Open Questions (Resolved)

1. **Store crossing:** `onLinkedSetupChange` callback chain from usePlannerSaveLoad → useFactoryPlanner → FactoryPlanner → FactoryPlannerShell → WorkspaceLayout (Step 3)
2. **Linked state source of truth:** `activeSetupName_{tabId}` localStorage key. WorkspaceLayout reads it to build `linkedMap`. No changes to workspaceSlice TabInfo needed.
3. **Linked tab rename:** NOT allowed. Tab name is locked to the save name. To rename a linked tab, user must unlink first (click 🔗 icon), then rename. Unlink clears activeSetupName/lastSavedStateInMemory via ref chain: WorkspaceLayout → shellRef.unlinkSetup() → plannerRef.unlinkSetup() → usePlannerSaveLoad.
4. **Unlinked tab rename conflict:** Blocked if typed name matches an existing server save (case-insensitive). Shows error inline. Overwrite only via CommandBar save UI.
5. **New empty tab name:** "Planner N" instead of "Tab N" (Step 4)

## Deferred

- Tab duplication (always unlinked copy, "(2)" suffix)
- Workspace-wide save button
- Workspace dirty state (compound of tab changes + individual tab dirty)
- "(2)" suffix logic for `loadIntoNewTab`

## Validation

- TypeScript compilation: zero errors
- All 56 Vitest tests pass
- Manual: load 'tier-1' into a tab → tab renamed to "tier-1", 🔗 icon visible, double-click blocked with tooltip "Unlink to rename"
- Manual: modify tier-1 state (add tree, change count) → dirty dot appears on tab
- Manual: reload page → tab retains name "tier-1", 🔗 icon visible, dirty tracking works correctly (state compared against server-saved snapshot)
- Manual: double-click 🔗 icon on linked tab → unlinkSetup() called via shell ref → tab unlinks (activeSetupName cleared), 🔗 icon disappears, tab name stays "tier-1", dirty dot disappears, double-click now opens inline edit
- Manual: unlinked tab, try to rename to existing save name → inline error "This name is already a saved setup.", rename blocked
- Manual: load 'oil' into an unlinked tab → tab renamed to "oil", now linked with 🔗 icon
- Manual: open two tabs, load 'tier-1' into tab 1 and 'oil' into tab 2 → both show correct names, 🔗 icons, independent dirty tracking
- Manual: pre-existing server saves (tier-1, oil, tier-6, temp2) visible in load dropdown for every tab
- Manual: save current state under a new name → appears in load dropdown, tab linked to new name
- Console: zero errors on all of the above flows
