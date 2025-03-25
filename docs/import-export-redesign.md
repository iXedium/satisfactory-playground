# Import/Export System Redesign

## Current Issues

The current implementation of the import/export system has several problems:

1. **Structure Destruction**: When importing a node, we remove its children and store them in `originalChildren`. This destructive approach creates challenges when trying to restore the original state.

2. **UI Loss**: When unimporting, we don't properly restore all properties needed for UI components like recipe dropdowns and efficiency calculations.

3. **Complex Synchronization**: Multiple sources of truth (original node, imported node, target nodes) need to stay in sync across state changes.

4. **Brittle State Handling**: Excess value changes and tree recalculations can easily break the import/export relationships.

5. **Convoluted Testing**: Tests verify structural integrity but don't reflect real-world usage.

## Proposed Architecture: Reference-Based Import System

We'll redesign the import/export system to use a reference-based approach where node structures stay intact but are visually and logically linked.

### Core Principles

1. **Non-destructive Operations**: Importing should not modify the original node structure; it should only add a reference.

2. **Single Source of Truth**: Each node property should have a clear authority source.

3. **Normalized State**: Clearer separation between nodes and their relationships.

4. **Complete UI Preservation**: All UI-related properties should be maintained throughout operations.

5. **Incremental Implementation**: Changes will be small and testable.

### Key Components

1. **Node Import Reference**:
   - A node will have an `importReference` property (instead of `isImport` + `importedFrom`)
   - Structure: `{ targetTreeId: string, targetNodeId: string }`

2. **Visible Children Toggle**:
   - Nodes will have a `childrenVisible` property that can be toggled
   - Imported nodes will have this set to `false`

3. **Calculation Delegation**:
   - When calculating requirements, the system will follow import references

4. **Visual Indicators**:
   - Special styling for imported nodes
   - UI controls to show/hide the actual source

### Data Structure Changes

```typescript
// Current structure
interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  isImport?: boolean;
  importedFrom?: string;
  originalChildren?: any[]; // Store of original structure
  // ...other properties
}

// New structure
interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  importReference?: {
    targetTreeId: string;
    targetNodeId: string;
  };
  childrenVisible: boolean;
  // ...other properties (no more originalChildren)
}
```

## Implementation Plan

### Phase 1: Infrastructure and Utility Changes

1. **Add New Node Properties**:
   - Add `importReference` and `childrenVisible` to the `DependencyNode` interface
   - Keep existing properties for backward compatibility

2. **Create Node Reference Utils**:
   - Add helper functions to get/set import references
   - Add functions to find target nodes across trees

3. **Update Tree Visualization**:
   - Modify the UI to respect `childrenVisible` property
   - Add special styling for import references

### Phase 2: Modify Import Logic

1. **Refactor Import Action**:
   - Update the `importNode` reducer to use references instead of node modification
   - Set `childrenVisible` to false instead of removing children

2. **Calculation Updates**:
   - Modify `calculateDependencyTree` to follow import references
   - Add delegation logic to traverse between trees

3. **UI Integration**:
   - Add controls to toggle children visibility
   - Display the import source

### Phase 3: Modify Unimport Logic

1. **Simplify Unimport Action**:
   - Update to simply remove the import reference
   - Set `childrenVisible` back to true

2. **Remove Legacy Code**:
   - Phase out `originalChildren` logic
   - Clean up old restore mechanisms

### Phase 4: Handling Edge Cases

1. **Tree Deletion**:
   - Handle orphaned import references when trees are deleted
   - Add cascade options

2. **Circular References**:
   - Detect and prevent circular import chains
   - Add validation mechanisms

3. **State Serialization**:
   - Ensure proper serialization/deserialization of the new structure
   - Update persistence utilities

## Testing Strategy

For each phase, we'll develop tests that verify:

1. **Structural Integrity**: Ensure the basic node structure remains correct.

2. **UI Component Functionality**: Verify that dropdowns, efficiency calculators, etc. work correctly.

3. **User Scenarios**: Test actual workflows users would perform:
   - Create trees → Import nodes → Change excess → Unimport
   - Create trees → Import nodes → Delete source tree
   - Complex chains of imports

4. **Visual Verification**: Add snapshot tests for UI components to ensure proper rendering.

## Integration Tests

We'll create a comprehensive set of integration tests that verify the entire system working together:

```typescript
// Example test structure
describe('Import/Export Integration', () => {
  test('Node should maintain all properties through import and unimport', () => {
    // Setup trees
    // Import node
    // Verify all properties (including UI-related ones)
    // Change excess
    // Verify consistency
    // Unimport
    // Verify restoration of all properties
  });
});
```

## Migration Path

Since this is a significant architecture change, we'll need a migration strategy:

1. **Dual Support**: Initially support both systems internally
2. **Feature Flag**: Use a feature flag to switch between implementations
3. **Data Migration**: Add utilities to convert old format to new format
4. **Gradual Rollout**: Phase out the old system as confidence in the new one grows

## Progress Tracking

- **Phase 1: Infrastructure and Utility Changes** (completed)
  - Add new node properties to DependencyNode interface (completed)
  - Create Node Reference Utils (completed)
  - Update Tree Visualization (completed)

- **Phase 2: Modify Import Logic** (completed)
  - Refactor Import Action (completed) 
  - Calculation Updates (completed)
  - UI Integration (completed)

- **Phase 3: Modify Unimport Logic** (completed)
  - Update clearing reference logic (completed)
  - Remove legacy code (completed)

- **Phase 4: Handling Edge Cases** (completed)
  - Improved deleteTree action (completed)
  - Circular reference detection (completed)
  - State serialization preservation (completed)

## Bug Fixes Completed

1. Fixed Node Chain Restoration
2. Fixed Recipe Dropdown Preservation 
3. TypeScript Improvements
4. Comprehensive Testing
5. Circular Reference Detection
6. Improved Tree Deletion

## Next Steps

1. Add more advanced features:
   - Import/export statistics dashboard
   - Visibility toggles in UI for imported nodes
   - Bulk import/export operations

2. Code cleanup:
   - Begin formal deprecation process for legacy properties
   - Add more comprehensive documentation
   - Refactor remaining dependent components

## Incremental Implementation

Each phase will be broken down into small, testable PRs, with thorough testing at each step to ensure we don't introduce regressions. 