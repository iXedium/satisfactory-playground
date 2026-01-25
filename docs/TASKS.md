# Feature Implementation Tasks

This document tracks all planned feature implementations for the Satisfactory Factory Planner.

---

## ✅ COMPLETED

### 1. Undo/Redo System ✅
- **Status:** COMPLETE (January 2026)
- **Complexity:** HIGH
- **Description:** Full undo/redo system with transaction grouping for user actions
- **Implementation Details:**
  - History middleware captures state snapshots before tracked actions execute
  - Transaction system groups multiple Redux actions into single undo checkpoint
  - Module-level state prevents race conditions in transaction tracking
  - `undoAction` and `redoAction` thunks properly save current state before restoring
  - Fixed snapshot stack management using `undoStackPop` and `redoStackPop` reducers
  - Component values (excess, machineCount, multiplier) read directly from Redux nodes
  - System actions (`loadSavedState`, `loadRecipeSelections`) excluded from tracking
- **Testing:** 18 undo/redo tests passing (56 total tests)
- **Files Modified:**
  - `historyMiddleware.ts` - Middleware and undo/redo thunks
  - `historySlice.ts` - Snapshot state management
  - `TreeNode.tsx` - Fixed to read values from Redux instead of stale maps
  - `tests/integration/undoRedo.test.ts` - Comprehensive test suite
- **Git Commits:**
  - "Fix: Undo/redo state restoration and transaction grouping"
  - "Fix: Read node values directly from Redux in TreeNode"
  - "Docs: Move loadSavedState to ignored actions"

---

## 📋 PENDING

### 2. Node Insertion Order
- **Status:** NOT STARTED
- **Complexity:** LOW
- **Priority:** NEXT (Feature 2 of 6)
- **Description:** Control the order in which new nodes are inserted into the dependency tree
- **Requirements:**
  - TBD - Awaiting detailed specification
- **Estimated Effort:** TBD
- **Dependencies:** None

---

### 3. Recipes in Store/Compare
- **Status:** NOT STARTED
- **Complexity:** MEDIUM
- **Priority:** Feature 3 of 6
- **Description:** Store recipe snapshots and enable comparison between different recipe configurations
- **Requirements:**
  - TBD - Awaiting detailed specification
- **Estimated Effort:** TBD
- **Dependencies:** Feature 2 should be complete first

---

### 4. Power Consumption
- **Status:** NOT STARTED
- **Complexity:** MEDIUM-HIGH
- **Priority:** Feature 4 of 6
- **Description:** Calculate and display power consumption for production chains
- **Requirements:**
  - TBD - Awaiting detailed specification
- **Estimated Effort:** TBD
- **Dependencies:** Features 2-3 should be complete first

---

### 5. Multi-Store (8 slots)
- **Status:** NOT STARTED
- **Complexity:** MEDIUM
- **Priority:** Feature 5 of 6
- **Description:** Enable saving and loading multiple factory configurations (8 save slots)
- **Requirements:**
  - TBD - Awaiting detailed specification
- **Estimated Effort:** TBD
- **Dependencies:** Features 2-4 should be complete first

---

### 6. Lucide Icons
- **Status:** NOT STARTED
- **Complexity:** MEDIUM
- **Priority:** Feature 6 of 6
- **Description:** Migrate from current icon system to Lucide React icon library
- **Requirements:**
  - TBD - Awaiting detailed specification
- **Estimated Effort:** TBD
- **Dependencies:** Features 2-5 should be complete first

---

## Notes

- All tasks follow strict requirements:
  1. Run `yarn build` after every code change
  2. Fix any errors immediately before proceeding
  3. All tests must pass before marking feature complete
  4. Update this document upon feature completion

- Previous documentation in `refactoring.md` is archived (related to internal refactoring tasks)
