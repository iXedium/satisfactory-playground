# Satisfactory Production Planner Documentation

## Project Overview

This application is a production planning tool for the game Satisfactory, designed to help players calculate and visualize complex production chains. The tool allows users to select items they want to produce, specify production rates, and automatically calculates all the required resources, intermediate products, and machines needed to achieve the desired output.

The application uses React with TypeScript for the frontend, Redux for state management, and Dexie.js for client-side database storage of game data (items, recipes, machines, etc.).

## Core Features

### 1. Dependency Tree Calculation and Visualization

The core functionality revolves around calculating and visualizing dependency trees for production chains:

- **Item Selection**: Users can select any item from the game to produce
- **Recipe Selection**: For items with multiple production methods, users can choose specific recipes
- **Production Rate**: Users can specify the desired output rate for each item
- **Dependency Calculation**: The system automatically calculates all required inputs, intermediate products, and their respective quantities
- **Tree Visualization**: The dependency tree is displayed in a hierarchical structure showing the flow of resources
- **Accumulated View**: An alternative view that shows accumulated totals for all items in the production chain

### 2. Machine Calculation and Optimization

The system calculates the machines required for each production step:

- **Machine Count**: Automatically calculates the number of machines needed for each recipe
- **Machine Multiplier**: Allows users to adjust machine efficiency/clock speed
- **Machine Optimization**: Can automatically optimize machine counts to achieve desired output rates
- **Machine Visibility Toggle**: Users can hide/show machine information to focus on items

### 3. Multiple Production Chains

The system supports multiple independent production chains:

- **Adding Chains**: Users can add new production chains without replacing existing ones
- **Chain Management**: Users can delete individual chains via delete buttons on root nodes
- **Combined Accumulation**: The accumulated view combines identical items from all chains
- **Cross-Chain Optimization**: Machine optimization considers all chains together

### 4. User Interface Features

The application provides various UI features to enhance usability:

- **Collapsible Nodes**: Users can collapse/expand nodes by clicking on item icons
- **Command Bar**: Provides global controls for the application
- **Excess Management**: Users can specify excess production for items
- **Byproduct Handling**: The system identifies and displays byproducts from recipes
- **Responsive Layout**: The UI adapts to different screen sizes and orientations

## Technical Architecture

### State Management

The application uses Redux for state management with the following key slices:

1. **dependencySlice.ts**: Manages the state of dependency trees, including:
   - Multiple dependency trees (map of trees)
   - Selected recipes for each node
   - Machine counts and multipliers
   - Excess production values
   - Accumulated node data

2. **uiSlice.ts**: Manages UI state, including:
   - Expanded/collapsed states
   - Visibility toggles
   - User preferences

### Data Management

Game data is stored and accessed through:

1. **dexieDB.ts**: Defines the database schema for storing game data
2. **dbQueries.ts**: Provides functions for querying the database
3. **data.json**: Contains the raw game data that is loaded into the database

### Key Components

1. **DependencyTester.tsx**: Main component that orchestrates the application
2. **DependencyTree.tsx**: Renders the hierarchical tree view of dependencies
3. **TreeNode.tsx**: Renders individual nodes in the tree view
4. **AccumulatedView.tsx**: Renders the accumulated view of all items
5. **ListNode.tsx**: Renders individual nodes in the accumulated view
6. **ItemNode.tsx**: Core component for displaying item information, used by both TreeNode and ListNode
7. **CommandBar.tsx**: Provides global controls and toggles
8. **Icon.tsx**: Renders item icons with appropriate styling

### Calculation Logic

1. **calculateDependencyTree.ts**: Contains the core logic for calculating dependency trees
2. **utils.ts**: Contains utility functions for various calculations

## Current Implementation Details

### Dependency Tree Structure

Each dependency tree is represented by a `DependencyNode` object with the following structure:

```typescript
interface DependencyNode {
  id: string;            // Item ID
  uniqueId: string;      // Unique identifier for this specific node
  amount: number;        // Production/consumption rate
  children: DependencyNode[]; // Child nodes (inputs)
  byproducts?: DependencyNode[]; // Byproduct nodes (if any)
  selectedRecipeId?: string;    // Selected recipe ID
  machineCount?: number;        // Number of machines
  machineMultiplier?: number;   // Machine efficiency multiplier
  excess?: number;              // Excess production
  isByproduct?: boolean;        // Whether this node is a byproduct
}
```

### Accumulated Node Structure

For the accumulated view, items are aggregated into `AccumulatedNode` objects:

```typescript
interface AccumulatedNode {
  itemId: string;        // Item ID
  amount: number;        // Total production/consumption rate
  nodeIds: string[];     // IDs of all nodes that contribute to this item
  isByproduct: boolean;  // Whether this node is a byproduct
  selectedRecipeId?: string; // Selected recipe ID (for the primary node)
  machineCount?: number;     // Number of machines
  machineMultiplier?: number; // Machine efficiency multiplier
  excess?: number;           // Excess production
}
```

### Redux State Structure

The current Redux state structure in `dependencySlice.ts`:

```typescript
interface DependencyState {
  dependencyTree: DependencyNode | null;
  accumulatedNodes: AccumulatedNode[];
  selectedItem: string | null;
  selectedRecipe: string | null;
  productionRate: number;
  loading: boolean;
  error: string | null;
}
```

This will be modified to support multiple trees:

```typescript
interface DependencyState {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedNodes: AccumulatedNode[];
  selectedItem: string | null;
  selectedRecipe: string | null;
  productionRate: number;
  loading: boolean;
  error: string | null;
}
```

## Current Tasks

### Implementing Multiple Production Chains

The current focus is on implementing support for multiple production chains:

1. **Redux State Changes**:
   - Modify `dependencySlice.ts` to store multiple trees
   - Update reducers to handle multiple trees
   - Add actions for adding and removing trees

2. **UI Changes**:
   - Add delete buttons to root nodes
   - Update tree rendering to handle multiple roots
   - Ensure new chains are added to the bottom of the view

3. **Accumulation Logic**:
   - Update accumulation to combine items from all trees
   - Ensure machine optimization works across all chains

### Machine Visibility Toggle

Recently implemented feature that allows users to hide/show machine information:

1. **CommandBar Toggle**: Added checkbox to toggle machine visibility
2. **State Management**: Added `showMachines` state to `DependencyTester`
3. **Component Props**: Added `showMachines`/`showMachineSection` props to relevant components
4. **Conditional Rendering**: Updated `ItemNode` to conditionally render machine section
5. **Layout Adjustment**: Expanded item section when machines are hidden

## Future Tasks

### External Resource Input

A planned feature to allow items to receive production from external sources:

1. **Toggle for External Input**: Add a toggle to each item node
2. **Calculation Adjustment**: Update dependency calculation to account for external inputs
3. **Visual Indication**: Add visual cues for items receiving external production

### Build Management

Future enhancement to support multiple builds (collections of production chains):

1. **Build Storage**: Add functionality to save and load builds
2. **Build Switching**: Allow users to switch between different builds
3. **Build Comparison**: Add tools to compare different builds

### UI Enhancements

Potential improvements to the user interface:

1. **Chain Naming**: Allow users to name individual production chains
2. **Chain Reordering**: Allow users to reorder chains in the view
3. **Chain Duplication**: Add functionality to duplicate existing chains
4. **Statistics Panel**: Add detailed statistics about production efficiency
5. **Resource Visualization**: Add graphical representation of resource flow

### Optimization Enhancements

Future improvements to optimization capabilities:

1. **Power Optimization**: Calculate and optimize power consumption
2. **Space Optimization**: Consider factory space requirements
3. **Alternative Recipe Suggestions**: Suggest alternative recipes for better efficiency
4. **Bottleneck Identification**: Highlight bottlenecks in production chains

## Implementation Guidelines

### Code Style and Conventions

1. **Component Structure**:
   - Functional components with React hooks
   - Props interfaces defined at the top of each file
   - Default prop values specified in destructuring

2. **State Management**:
   - Use Redux for global state
   - Use local state for component-specific concerns
   - Use selectors for derived state

3. **Styling**:
   - Inline styles with theme variables
   - Consistent use of spacing, colors, and typography
   - Responsive design considerations

### Performance Considerations

1. **Memoization**:
   - Use React.memo for expensive components
   - Use useMemo for expensive calculations
   - Use useCallback for callback functions passed as props

2. **Rendering Optimization**:
   - Avoid unnecessary re-renders
   - Use virtualization for long lists
   - Lazy load components when appropriate

3. **Calculation Efficiency**:
   - Optimize recursive calculations
   - Cache results when possible
   - Use efficient data structures

## Game-Specific Knowledge

### Items and Recipes

The game features hundreds of items and recipes, stored in the database with the following structure:

1. **Items**: Represent resources, components, and products
   - Properties: ID, name, description, category, etc.

2. **Recipes**: Represent production methods
   - Properties: ID, name, inputs, outputs, production time, etc.

3. **Machines**: Represent production buildings
   - Properties: ID, name, power consumption, size, etc.

### Production Mechanics

Understanding of game mechanics is essential for accurate calculations:

1. **Production Rates**: Measured in items per minute
2. **Machine Clock Speed**: Affects production rate and power consumption
3. **Alternate Recipes**: Provide different ways to produce the same item
4. **Byproducts**: Some recipes produce additional items besides the main output
5. **Resource Nodes**: Raw resources have different purity levels affecting extraction rates

## Conclusion

This documentation provides a comprehensive overview of the Satisfactory Production Planner application, its features, architecture, and development roadmap. It serves as a guide for understanding the current state of the project and the direction of future development.

The application aims to be a powerful tool for Satisfactory players to plan and optimize their factories, with a focus on accuracy, usability, and flexibility. By supporting multiple production chains, machine optimization, and various visualization options, it provides a complete solution for production planning in the game. 