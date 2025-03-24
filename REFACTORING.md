# Satisfactory Factory Planner Refactoring

This document tracks the progress of refactoring the Satisfactory Factory Planner application, breaking down large components into smaller, more focused ones.

## Goals

- Break down large files into smaller, reusable components
- Improve maintainability by having each component serve a single purpose
- Maintain current functionality and styling throughout the process
- Implement changes incrementally to avoid breaking the application

## Styling Standards

To ensure consistent styling across components:

- Created `src/styles/constants.ts` with standardized sizing values
- Added style customization props to all components
- Used consistent naming for styling props (`containerStyle`, `contentStyle`, etc.)
- Maintained z-index hierarchy for proper layering
- Used consistent spacing and sizing values

## Completed Refactoring

### ItemNode Component (Original: 996 lines)

The ItemNode component has been broken down into the following smaller components:

#### 1. ItemNodeButtons
- **Purpose**: Handles buttons for actions like delete and import
- **File**: `src/components/shared/ItemNodeButtons.tsx`
- **Features**:
  - Delete button for root nodes
  - Import/revert import button for child nodes
  - Consistent button styling
  - Hover effects

#### 2. ItemDetails
- **Purpose**: Displays item information, icon, and recipe selector
- **File**: `src/components/shared/ItemDetails.tsx`
- **Features**:
  - Item icon with click handler
  - Item name display
  - Nominal rate indicator
  - Recipe selector dropdown

#### 3. MachineDetails
- **Purpose**: Shows machine information and controls
- **File**: `src/components/shared/MachineDetails.tsx`
- **Features**:
  - Machine icon
  - Machine name
  - Container for machine controls

#### 4. EfficiencySection
- **Purpose**: Manages efficiency, rate display, and excess controls
- **File**: `src/components/shared/EfficiencySection.tsx`
- **Features**:
  - Color-coded section based on efficiency
  - Container for efficiency indicator and rate display
  - Container for excess controls

#### 5. EfficiencyIndicator
- **Purpose**: Shows the efficiency percentage with proper styling
- **File**: `src/components/shared/EfficiencyIndicator.tsx`
- **Features**:
  - Color-coded efficiency percentage
  - Special display for byproducts and imports

#### 6. RateDisplay
- **Purpose**: Displays the production rate with appropriate styling
- **File**: `src/components/shared/RateDisplay.tsx`
- **Features**:
  - Formatted rate amount display
  - Special styling for byproducts and imports

#### 7. ExcessControls
- **Purpose**: Provides UI for controlling excess production
- **File**: `src/components/shared/ExcessControls.tsx`
- **Features**:
  - Reset button
  - Excess input field
  - Max button for 100% efficiency

#### 8. MachineControls
- **Purpose**: Handles machine count, multiplier, and optimization
- **File**: `src/components/shared/MachineControls.tsx`
- **Features**:
  - Machine count input
  - Machine multiplier input (optional)
  - Optimize button

### DependencyTester Component (Original: 789 lines)

The DependencyTester component has been refactored into the following parts:

#### 1. ChainCreator
- **Purpose**: Handles the creation of new production chains
- **File**: `src/components/shared/ChainCreator.tsx`
- **Features**:
  - Encapsulates chain creation logic
  - Provides interface for item and recipe selection
  - Calculates dependency trees

#### 2. TreeViewManager
- **Purpose**: Manages the tree view mode display
- **File**: `src/components/shared/TreeViewManager.tsx`
- **Features**:
  - Renders multiple dependency trees
  - Handles tree-specific props and actions
  - Manages tree layout and structure

#### 3. ViewModeToggle
- **Purpose**: Provides UI for switching between tree and accumulated views
- **File**: `src/components/shared/ViewModeToggle.tsx`
- **Features**:
  - Toggle buttons for view modes
  - Consistent styling with the app theme
  - Visual indication of selected mode

#### 4. DisplayOptions
- **Purpose**: UI for display settings like extensions and machines
- **File**: `src/components/shared/DisplayOptions.tsx`
- **Features**:
  - Checkboxes for various display options
  - Organized settings panel
  - Responsive to parent state

#### 5. useFactoryPlanner (Custom Hook)
- **Purpose**: Centralizes state management for the factory planner
- **File**: `src/hooks/useFactoryPlanner.ts`
- **Features**:
  - Manages all state previously in DependencyTester
  - Handles persistence to localStorage
  - Provides handlers for various actions
  - Centralizes state logic for better maintainability

#### 6. TreeNodeManager
- **Purpose**: Manages tree node operations
- **File**: `src/components/shared/TreeNodeManager.tsx`
- **Features**:
  - Handles recipe changes
  - Manages excess changes
  - Updates dependency trees

#### 7. ImportExport
- **Purpose**: Handles importing and exporting of factory data
- **File**: `src/components/shared/ImportExport.tsx`
- **Features**:
  - Export functionality to save designs
  - Import functionality to load designs
  - Clear data option

#### 8. RefactoredDependencyTester
- **Purpose**: Integrates all the refactored components
- **File**: `src/components/RefactoredDependencyTester.tsx`
- **Features**:
  - Uses the useFactoryPlanner hook for centralized state management
  - Maintains the same functionality as the original component
  - Orchestrates interactions between all smaller components
  - Handles layout and positioning of UI elements

### CommandBar Component (Original: 528 lines)

The CommandBar component has been refactored into the following parts:

#### 1. SearchSection
- **Purpose**: Handles item and recipe search functionality
- **File**: `src/components/shared/SearchSection.tsx`
- **Features**:
  - Item selection dropdown
  - Recipe selection dropdown
  - Add button for creating chains
  - Dynamic recipe loading based on selected item

#### 2. ActionButtons
- **Purpose**: Provides UI for main actions
- **File**: `src/components/shared/ActionButtons.tsx`
- **Features**:
  - Expand/collapse all buttons
  - Clear saved data button
  - Context-aware button visibility

#### 3. ViewOptionsPanel
- **Purpose**: UI for view-related options
- **File**: `src/components/shared/ViewOptionsPanel.tsx`
- **Features**:
  - Compact view toggle
  - Depth selector
  - View-specific settings

#### 4. SettingsPanel
- **Purpose**: Dropdown panel for application settings
- **File**: `src/components/shared/SettingsPanel.tsx`
- **Features**:
  - Collapsible settings menu
  - Multiple settings categories
  - Position-aware dropdown

### Styling Improvements

- **Created constants file**: Added `src/styles/constants.ts` to maintain consistent sizing
- **Fixed container sizing**: Ensured proper sizing of containers and input fields
- **Added customization**: All components accept style override props
- **Z-index management**: Established consistent z-index values for proper layering
- **Consolidated spacing**: Used consistent spacing values across components

## Upcoming Refactoring

### AccumulatedView Component (473 lines)

Will be broken down into:

1. **ResourceSummary** - For displaying resource totals
2. **CategorySection** - For category-based grouping
3. **SortingControls** - For sorting options
4. **DetailLevel** - For controlling display detail

## Progress Checklist

- [x] ItemNode.tsx
  - [x] ItemNodeButtons
  - [x] ItemDetails
  - [x] MachineDetails
  - [x] EfficiencySection
  - [x] EfficiencyIndicator
  - [x] RateDisplay
  - [x] ExcessControls
  - [x] MachineControls

- [x] DependencyTester.tsx
  - [x] ChainCreator
  - [x] TreeViewManager
  - [x] ViewModeToggle
  - [x] DisplayOptions
  - [x] useFactoryPlanner (Custom Hook)
  - [x] TreeNodeManager
  - [x] ImportExport
  - [x] RefactoredDependencyTester

- [x] CommandBar.tsx
  - [x] SearchSection
  - [x] ActionButtons
  - [x] ViewOptionsPanel
  - [x] SettingsPanel

- [ ] AccumulatedView.tsx (Next)
  - [ ] ResourceSummary
  - [ ] CategorySection
  - [ ] SortingControls
  - [ ] DetailLevel

## Notes on Implementation

- Each component is designed to be self-contained and reusable
- Style props allow for customization while maintaining consistent defaults
- Components preserve the exact functionality of the original implementation
- Testing is performed after each component extraction to ensure no regression

## Integration Testing

- The RefactoredDependencyTester component successfully integrates all smaller components
- App.tsx has been updated to use the new RefactoredDependencyTester component
- All TypeScript errors were resolved in the process of integration
- The build completes successfully with no errors
- The application maintains the same functionality as before refactoring
- State management is now centralized in the useFactoryPlanner hook
- Components are easier to maintain and reason about 