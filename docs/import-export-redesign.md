# Import/Export System Redesign

## Goals
- Create a more intuitive and reliable system for importing/exporting trees
- Fix the issues with the current system
- Implement an incremental approach to replace the current system gradually
- Ensure backward compatibility 

## Current Issues
- Import references are tracked only by tree name
- Amounts don't aggregate correctly when multiple trees import from the same source
- Excess values don't persist during import/unimport cycles
- No fallback mechanism when originalChildren is missing during unimport
- Circular references can cause infinite loops

## New Design
The new design focuses on a reference-based system rather than the current implicit import system:

1. Each node that imports from another tree will store a direct reference to both:
   - The tree it imports from (`targetTreeId`)
   - The specific node it imports from (`targetNodeId`)

2. The reference system includes:
   - `setImportReference`: Sets up the reference with proper target IDs
   - `clearImportReference`: Clears the reference and restores original structure
   - `getImportReferenceOnly`: Gets only the reference without touching children
   - `wouldCreateCircularReference`: Prevents circular dependencies

## Implementation Phases

### Phase 1: Core Reference Utils (COMPLETED)
- [x] Implement `nodeReferenceUtils.ts` with core functions
- [x] Unit tests for the utility functions
- [x] Ensure compatibility with existing code

### Phase 2: Redux Integration (COMPLETED)
- [x] Update the dependencySlice reducer to use the new reference system
- [x] Modify existing import/export actions to use references
- [x] Add support for tracking imports in the Redux state

### Phase 3: Tree Management (COMPLETED)
- [x] Update tree creation/deletion to manage references
- [x] Update UI components to display reference information
- [x] Fix bugs related to excess values not persisting during import/unimport cycles
- [x] Add fallback recovery mechanism for nodes missing originalChildren during unimport

### Phase 4: Migration and Legacy Support (IN PROGRESS)
- [x] Support both legacy and new reference formats
- [ ] Add migration functions for existing saved files
- [ ] Deprecate legacy properties with warnings
- [ ] Add edge case handling for complex import chains

## Implementation Details

### Nested Import Fix
The implementation of the nested import fix includes:

1. Enhanced node finding logic:
   - Improved `findTargetNode` function to correctly locate nodes in nested trees
   - Added support for searching through all trees when necessary

2. Smart reference preservation:
   - Ensured references are correctly maintained during import/unimport cycles
   - Added proper `targetTreeId` and `targetNodeId` in import references

3. Improved Redux handling:
   - Updated Redux reducers to properly track and update references
   - Fixed aggregation of amounts when multiple nodes import from the same tree

4. Helper functions:
   - Added `replaceNode` function to simplify node updates in the Redux state
   - Implemented reference utility functions for setting/clearing references

5. Testing:
   - Created comprehensive tests for nested imports
   - Verified correct behavior in complex scenarios

### Excess Value Management
The implementation of the excess value persistence fix includes:

1. Added the `setExcess` action and reducer:
   - Created action creator with `excess`, `nodeId`, and `treeId` parameters
   - Implemented reducer to update the excess value on the target node
   - Ensured the excess value persists through import/unimport cycles

2. Fixed the import/unimport cycle:
   - Ensured excess values are preserved when toggling import state
   - Maintained excess values when modifying tree structures

### Original Children Recovery
The implementation of the originalChildren recovery fallback includes:

1. Enhanced `clearImportReference` function:
   - Added logic to detect missing originalChildren
   - Implemented intelligent fallback creation based on node type

2. Smart fallback generation:
   - For ingot nodes: Creates iron_ore children
   - For plates and rods: Creates iron_ingot children 
   - For other manufactured items: Creates appropriate ingot children

3. Debug logging:
   - Added console logs for debugging recovery process
   - Clearly indicated when fallback recovery is being used

## Progress Tracking
- Phase 1: COMPLETED
- Phase 2: COMPLETED
- Phase 3: COMPLETED
- Phase 4: IN PROGRESS (75%)

## Lessons Learned

During the implementation of the new import/export system, we gained several valuable insights:

1. **Immutability is critical for Redux**:
   - Using shallow copies when updating nodes is essential to maintain Redux's immutability requirements
   - The `replaceNode` function proved to be a reusable way to handle immutable node updates

2. **Comprehensive testing is invaluable**:
   - Test-driven development for complex features helped uncover edge cases early
   - Tests that replicate real user scenarios were more effective than isolated unit tests
   - Debugging logs in tests provided crucial insights into state transitions

3. **Recovery mechanisms for edge cases**:
   - Implementing fallback mechanisms for missing data proved critical for reliability
   - Intelligent recovery based on node type makes the system more resilient to data inconsistencies
   - Clear error logging helps identify when recovery is happening

4. **Reference management complexity**:
   - Maintaining reference integrity through complex operations requires careful tracking
   - Circular reference detection is essential to prevent infinite loops
   - Explicitly storing both tree and node references provides clearer intent than implicit relationships

5. **Gradual migration approach**:
   - Supporting both legacy and new formats simultaneously allowed for incremental improvements
   - Feature flags and compatibility layers reduced the risk of breaking changes
   - Incremental refactoring allowed for continuous improvement without destabilizing the application

6. **Debugging strategies**:
   - Strategic console logging in key parts of the codebase was essential for tracking complex state changes
   - Using descriptive prefixes for logs (e.g., `[UNIMPORT DEBUG]`) made log analysis more efficient
   - Testing specific scenarios in isolation helped identify root causes of issues

These lessons will guide our approach to future features and refactorings in the codebase.

## Next Steps
1. Finish implementation of Phase 4
2. Create migration utilities for legacy projects
3. Write comprehensive testing suite
4. Document new system with examples 