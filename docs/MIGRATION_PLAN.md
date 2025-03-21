# Component Migration Plan

## Overview

This document outlines the plan for safely migrating from the current monolithic components to the newly refactored, modular components. The migration will be performed incrementally to minimize the risk of breaking changes and ensure continuous application functionality.

## Migration Stages

### Stage 1: Preparation and Analysis
- [x] Complete component refactoring
- [x] Document component interfaces and dependencies
- [x] Identify integration points in the current application
- [ ] Create test cases for critical functionality
- [ ] Set up temporary wrappers for backward compatibility

### Stage 2: Initial Component Migration
- [ ] RecipeSelector migration
  - [ ] Create wrapper to maintain original API
  - [ ] Update imports in ItemNode.RecipeSection
  - [ ] Test RecipeSelector integration
  - [ ] Remove RecipeSelect.tsx once stable
- [ ] TreeView component migration
  - [ ] Create TreeView wrapper
  - [ ] Integrate TreeContainer, TreeNodeList, and TreeNodeItem
  - [ ] Update imports in parent components
  - [ ] Test TreeView integration
  - [ ] Clean up original TreeView component
- [ ] Import/Export verification
  - [ ] Ensure proper export from index files
  - [ ] Verify all imports are updated

### Stage 3: Main Feature Component Migration
- [ ] PowerView migration
  - [ ] Create PowerView wrapper
  - [ ] Integrate all PowerView sub-components
  - [ ] Update imports in parent components
  - [ ] Test PowerView integration
  - [ ] Clean up original PowerView component
- [ ] AccumulatedView migration
  - [ ] Create AccumulatedView wrapper
  - [ ] Integrate all AccumulatedView sub-components
  - [ ] Update imports in parent components
  - [ ] Test AccumulatedView integration
  - [ ] Clean up original AccumulatedView component

### Stage 4: Final Integration and Cleanup
- [ ] Remove all temporary wrappers
- [ ] Update any remaining direct imports
- [ ] Perform application-wide testing
- [ ] Update documentation with new component usage examples
- [ ] Archive or remove deprecated components

### Calculator Migration

#### Current Integration Points:
- The Calculator is a new component that doesn't have a direct equivalent in the current application.
- It will need to be integrated as a new feature in the DependencyTester or as a separate tab.

#### Migration Status:
- [✅] The Calculator component has been fully implemented with a modular design.
- [✅] All subcomponents are completed (CalculatorHeader, RecipeSelection, ProductionInput, etc.).
- [✅] The useCalculator hook manages state and calculations properly.

#### Migration Steps:
1. [✅] Create the Calculator component and all subcomponents
2. [ ] Add a tab or navigation option in the main application interface
3. [ ] Connect the Calculator to the application's state management
4. [ ] Test thoroughly in the application context

#### Verification:
- Calculator displays correctly in the application
- Item and recipe selection work properly
- Production rate input responds as expected
- Resource, machine, and power requirement calculations are accurate
- UI is responsive and accessible

## Component Migration Details

### RecipeSelector Migration

#### Current Integration Points:
- RecipeSelect component is used in ItemNode's RecipeSection
- Used in the original implementation at: src/components/RecipeSelect.tsx
- Used in the refactored ItemNode: src/components/nodes/ItemNode/RecipeSection.tsx

#### Migration Status:
- [✅] The refactored RecipeSelector components have been implemented.
- [✅] A modular design with the following components is in place:
  - RecipeSelector: Main component that manages recipe selection
  - RecipeDropdown: Dropdown component for selecting a recipe
  - RecipeOption: Individual recipe option item
  - RecipeDetails: Component for displaying recipe details

#### Migration Steps:
1. [✅] Create RecipeSelectorWrapper that implements the same API as the original RecipeSelect
2. [✅] Update all RecipeSelect imports to use the RecipeSelectorWrapper
3. [✅] Test thoroughly to ensure behavior matches original implementation

#### Verification:
- [✅] Recipe selection works in ItemNode
- [✅] Recipe details display correctly
- [✅] Search functionality works
- [✅] Recipe selection state is preserved

### TreeView Migration

#### Current Integration Points:
- The application currently uses a different tree implementation with `DependencyTree.tsx` and `TreeNode.tsx`
- Our refactored TreeView components are not yet integrated into the application

#### Migration Status:
- The refactored TreeView components (TreeView, TreeContainer, TreeNodeList, TreeNodeItem) are implemented but not yet integrated.
- The application currently uses a DependencyTree and TreeNode implementation that's different from our refactored components.

#### Migration Steps:
1. [ ] Create a TreeViewWrapper that implements the same API as DependencyTree
2. [ ] Replace DependencyTree with TreeViewWrapper in DependencyTester
3. [ ] Update TreeViewWrapper to use our refactored TreeView components
4. [ ] Test thoroughly to ensure behavior matches original implementation
5. [ ] Remove the original tree components when stable

#### Verification:
- Tree rendering matches original behavior
- Tree interactions (expand/collapse) work
- Tree node styling and indentation are correct

### PowerView Migration

#### Current Integration Points:
- After searching the codebase, the PowerView component doesn't appear to be directly used in the application yet.
- It may be a newly implemented feature that hasn't been integrated.

#### Migration Status:
- The refactored PowerView components are implemented.
- Created a PowerViewWrapper for backward compatibility.
- No integration points found where PowerView is actually used.

#### Migration Steps:
1. [✅] Create a PowerViewWrapper that implements the same API as the original PowerView
2. [✅] Identify all places where the original PowerView is used (none found)
3. [N/A] Update imports to use the PowerViewWrapper (not needed at this point)
4. [ ] When PowerView is added to the application, ensure it uses the refactored components

#### Verification:
- When PowerView is integrated, verify:
  - Power statistics display correctly
  - Filtering and sorting work
  - Machine details are accurate

### AccumulatedView Migration

#### Current Integration Points:
- `src/components/DependencyTester.tsx` imports AccumulatedView from "./AccumulatedView" ✅ Updated

#### Migration Status:
- The refactored AccumulatedView components are implemented.
- Created an AccumulatedViewWrapper for backward compatibility. ✅
- Updated the import in DependencyTester to use our wrapper. ✅

#### Migration Steps:
1. [✅] Create an AccumulatedViewWrapper that implements the same API as the original AccumulatedView
2. [✅] Update imports in DependencyTester to use the AccumulatedViewWrapper
3. [ ] Test thoroughly to ensure behavior matches original implementation
4. [ ] Remove the original AccumulatedView component when stable

#### Verification:
- Item accumulation is correct
- Filtering and sorting work
- Recipe and machine information is accurate

## Progress Tracking

| Component | Wrapper Created | Imports Updated | Tested | Original Removed | Status |
|-----------|----------------|----------------|--------|------------------|--------|
| RecipeSelector | ✅ N/A | ✅ | ⚠️ Needs verification | ❌ | In Progress |
| TreeView | ❌ | ❌ | ❌ | ❌ | Not Started |
| PowerView | ✅ | ❌ | ❌ | ❌ | In Progress |
| AccumulatedView | ✅ | ✅ | ⚠️ Needs verification | ❌ | In Progress |

## Rollback Procedures

If issues arise during migration, follow these steps to rollback changes:

1. Revert import statements to use original components
2. If original components were modified, restore from backup
3. If state management was affected, verify state shape is restored
4. Run application to verify functionality
5. Document issues encountered for future resolution

## Testing Checklist

Before considering a component migration complete, verify:

- [ ] Component renders correctly
- [ ] All interactions work as expected
- [ ] State changes reflect properly
- [ ] Performance is comparable or better
- [ ] No console errors or warnings
- [ ] All edge cases handled (empty states, loading, errors)
- [ ] Mobile responsiveness maintained

## Post-Migration Tasks

After all components are migrated:

- [ ] Remove all temporary wrappers
- [ ] Update documentation with new component usage
- [ ] Archive deprecated components
- [ ] Review performance and make optimizations if needed
- [ ] Consider adding more automated tests 