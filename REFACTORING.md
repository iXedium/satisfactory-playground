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

**IMPORTANT: All refactored components MUST maintain the exact same styling as the original components. Changes to functionality should never impact the visual appearance.**

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

#### 2. TreeViewManager / TreeViewContainer
- **Purpose**: Manages the tree view mode display
- **File**: `src/components/shared/TreeViewContainer.tsx` (Replaces TreeViewManager)
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

#### 9. FactoryPlannerLayout
- **Purpose**: Manages the overall layout structure
- **File**: `src/components/shared/FactoryPlannerLayout.tsx`
- **Features**:
  - Defines consistent layout for the application
  - Handles command bar positioning and content area
  - Provides customizable styling through props
  - Maintains proper component hierarchy

#### 10. PlannerContent
- **Purpose**: Handles conditional rendering between views
- **File**: `src/components/shared/PlannerContent.tsx`
- **Features**:
  - Switches between tree and accumulated views
  - Manages tree view reference for animations
  - Routes props to appropriate view components
  - Maintains consistent styling across views

#### 11. TreeViewContainer
- **Purpose**: Renders the tree view of dependency trees
- **File**: `src/components/shared/TreeViewContainer.tsx`
- **Features**:
  - Maps over dependency trees for rendering
  - Provides consistent interface for tree interactions
  - Handles event delegation to dependency trees
  - Maintains proper component hierarchy

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

**Note on CommandBar Implementation**: The CommandBar implementation required special attention to maintain exact visual appearance. After initial refactoring, the original component styling was completely restored to maintain pixel-perfect equivalence with the original UI. This includes:
- Identical item selector dropdowns with proper icons
- Exact positioning of the collapse toggle at the bottom center
- Matching settings menu dropdown with identical styling
- Preserved search input and action buttons with icon-based UI

### AccumulatedView Component (Original: 473 lines)

The AccumulatedView component has been refactored into the following parts:

#### 1. ResourceSummary
- **Purpose**: Displays individual resource items with proper styling
- **File**: `src/components/shared/ResourceSummary.tsx`
- **Features**:
  - Shows item icon, name, and production amount
  - Color-coded based on item type (regular, byproduct, raw material)
  - Displays depth information
  - Maintains consistent styling with the original

#### 2. CategorySection
- **Purpose**: Groups and displays items by category
- **File**: `src/components/shared/CategorySection.tsx`
- **Features**:
  - Category header with item count
  - Visual indicator of category type
  - Consistent layout for resource items
  - Conditional rendering based on filter state

#### 3. SortingControls
- **Purpose**: UI for search, filtering, and sorting options
- **File**: `src/components/shared/SortingControls.tsx`
- **Features**:
  - Search input for filtering by name
  - Sort controls for different sort orders and directions
  - Filter checkboxes for item types
  - Styled consistently with the application theme

#### 4. RefactoredAccumulatedView
- **Purpose**: Main component that integrates the smaller components
- **File**: `src/components/RefactoredAccumulatedView.tsx`
- **Features**:
  - Manages state for grouped items, sorting, and filtering
  - Handles tree traversal and node identification
  - Implements scroll-to-node functionality
  - Maintains the exact same styling and behavior as the original

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
  - [x] FactoryPlannerLayout
  - [x] PlannerContent
  - [x] TreeViewContainer

- [x] CommandBar.tsx
  - [x] SearchSection
  - [x] ActionButtons
  - [x] ViewOptionsPanel
  - [x] SettingsPanel
  - [x] Restored original styling to maintain exact appearance

- [x] AccumulatedView.tsx
  - [x] ResourceSummary
  - [x] CategorySection
  - [x] SortingControls
  - [x] RefactoredAccumulatedView

## Notes on Implementation

- Each component is designed to be self-contained and reusable
- Style props allow for customization while maintaining consistent defaults
- Components preserve the exact functionality of the original implementation
- Testing is performed after each component extraction to ensure no regression
- **Styling must be preserved exactly as in the original components, with no visual changes**

## Integration Testing

- The RefactoredDependencyTester component successfully integrates all smaller components
- Further refactored the component into FactoryPlannerLayout, PlannerContent, and TreeViewContainer to improve modularity
- App.tsx has been updated to use the new RefactoredDependencyTester component
- All TypeScript errors were resolved in the process of integration
- The build completes successfully with no errors
- The application maintains the same functionality as before refactoring
- State management is now centralized in the useFactoryPlanner hook
- Components are easier to maintain and reason about

## Future Improvements

- Create TypeScript interfaces for common props to reduce duplication
- Add unit tests for each component
- Add more customization options through theme variables
- Replace inline styles with styled-components for better maintainability