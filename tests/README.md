# Testing Guide

This directory contains the test infrastructure for the Satisfactory Playground application. Tests are written using **Vitest** (a Vite-native test runner) with **React Testing Library** for component testing.

## Quick Start

```bash
# Run all tests
yarn test

# Run tests in watch mode (re-runs on file changes)
yarn test:watch

# Run tests with the visual UI
yarn test:ui

# Generate coverage report
yarn test:coverage
```

## Directory Structure

```
tests/
├── setup.ts              # Global test setup (runs before each test file)
├── README.md             # This file
├── utils/                # Test utilities and helpers
│   ├── index.ts          # Central export for all utilities
│   ├── renderWithProviders.tsx  # Redux-aware render function
│   ├── testHelpers.ts    # Assertion helpers, state selectors
│   └── mockData.ts       # Mock fixtures for items, recipes, nodes
├── examples/             # Example tests demonstrating patterns
│   └── patterns.test.tsx
├── features/             # Feature-specific unit tests
│   └── mockData.test.ts
└── integration/          # Multi-feature integration tests
    └── dependencyState.test.ts
```

## Writing a New Test

### 1. Create a Test File

Create a file ending in `.test.ts` or `.test.tsx` in the appropriate directory:
- `tests/features/` - For testing individual features/slices
- `tests/integration/` - For testing multiple features together
- `src/**/*.test.ts` - For co-located unit tests

### 2. Import Test Utilities

Always import from `tests/utils` rather than directly from the source:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Render utilities
  renderWithProviders,
  createTestStore,
  screen,
  waitFor,
  userEvent,
  
  // Mock data
  createMockTree,
  createMockNode,
  TreeBuilder,
  mockIronPlateRecipe,
  
  // Helpers
  getTrees,
  getTree,
  waitForState,
  setDependencies,
} from '../utils';
```

### 3. Write Your Test

```typescript
describe('My Feature', () => {
  it('should do something', () => {
    // Arrange
    const expected = 'value';
    
    // Act
    const actual = myFunction();
    
    // Assert
    expect(actual).toBe(expected);
  });
});
```

## Core Patterns

### Rendering Components with Redux

Use `renderWithProviders` instead of `render`:

```typescript
import { renderWithProviders, screen } from '../utils';
import MyComponent from '../../src/components/MyComponent';

it('should render component', () => {
  renderWithProviders(<MyComponent />);
  
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Accessing Redux State

The render function returns helpers for state access:

```typescript
it('should access store', () => {
  const { store, getState, dispatch } = renderWithProviders(<MyComponent />);
  
  // Get current state
  const state = getState();
  expect(state.dependencies.dependencyTrees).toEqual({});
  
  // Dispatch actions
  dispatch(setDependencies({ treeId: 'x', tree: mockTree }));
  
  // Check updated state
  expect(getState().dependencies.dependencyTrees['x']).toBeDefined();
});
```

### Preloading Redux State

Pass initial state when rendering:

```typescript
it('should start with preloaded state', () => {
  const mockTree = createMockTree('Desc_IronPlate_C', { 
    treeId: 'tree-1',
    amount: 50 
  });

  const { getState } = renderWithProviders(<MyComponent />, {
    preloadedState: {
      dependencies: createMockDependencyState({
        dependencyTrees: { 'tree-1': mockTree },
      }),
    },
  });

  expect(getState().dependencies.dependencyTrees['tree-1'].amount).toBe(50);
});
```

### Testing Without Components (Store Only)

```typescript
it('should update state', () => {
  const store = createTestStore();
  
  store.dispatch(setDependencies({
    treeId: 'tree-1',
    tree: createMockTree('Desc_IronPlate_C', { treeId: 'tree-1' }),
  }));
  
  expect(getTree(store, 'tree-1')).toBeDefined();
});
```

### Simulating User Events

Use `userEvent` for realistic interactions:

```typescript
it('should handle user input', async () => {
  const user = userEvent.setup();
  
  renderWithProviders(<SearchComponent />);
  
  const input = screen.getByPlaceholderText('Search...');
  await user.type(input, 'Iron Plate');
  
  expect(input).toHaveValue('Iron Plate');
  
  await user.click(screen.getByText('Submit'));
});
```

### Waiting for Async State Updates

```typescript
it('should wait for async updates', async () => {
  const { store } = renderWithProviders(<MyComponent />);
  
  // Trigger async action
  await user.click(screen.getByText('Load Data'));
  
  // Wait for state condition
  await waitForState(store, (state) => 
    state.dependencies.dependencyTrees['loaded-tree'] !== undefined
  );
  
  expect(getTree(store, 'loaded-tree')).toBeDefined();
});
```

### Waiting for DOM Changes

```typescript
it('should wait for DOM updates', async () => {
  renderWithProviders(<MyComponent />);
  
  await user.click(screen.getByText('Show Details'));
  
  await waitFor(() => {
    expect(screen.getByText('Details Panel')).toBeInTheDocument();
  });
});
```

## Building Mock Data

### Quick Nodes

```typescript
const node = createMockNode({
  id: 'Desc_IronPlate_C',
  amount: 20,
  recipe: mockIronPlateRecipe,
});
```

### Quick Trees

```typescript
const tree = createMockTree('Desc_IronPlate_C', {
  treeId: 'my-tree',
  amount: 20,
  recipe: mockIronPlateRecipe,
});
```

### Complex Trees with TreeBuilder

```typescript
const tree = new TreeBuilder('Desc_ReinforcedIronPlate_C', 'rip-tree')
  .withAmount(5)
  .withRecipe(mockReinforcedIronPlateRecipe)
  .addChild('Desc_IronPlate_C', (plate) =>
    plate
      .withAmount(30)
      .withRecipe(mockIronPlateRecipe)
      .addChild('Desc_IronIngot_C', (ingot) =>
        ingot.withAmount(45)
      )
  )
  .addChild('Desc_IronScrew_C', (screw) =>
    screw.withAmount(60)
  )
  .build();
```

### Available Mock Items

- `mockIronOre`, `mockIronIngot`, `mockIronPlate`
- `mockIronRod`, `mockScrew`, `mockReinforcedIronPlate`
- `mockCopper`, `mockCopperIngot`, `mockWire`, `mockCable`

### Available Mock Recipes

- `mockIronIngotRecipe`, `mockIronPlateRecipe`
- `mockIronRodRecipe`, `mockScrewRecipe`
- `mockReinforcedIronPlateRecipe`
- `mockCopperIngotRecipe`, `mockWireRecipe`, `mockCableRecipe`

## DOM Assertions

Jest-dom matchers are globally available:

```typescript
// Element existence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Visibility
expect(element).toBeVisible();
expect(element).toBeDisabled();

// Content
expect(element).toHaveTextContent('Hello');
expect(input).toHaveValue('test');

// Attributes
expect(element).toHaveAttribute('data-testid', 'my-id');
expect(element).toHaveClass('active');

// Focus
expect(element).toHaveFocus();
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use meaningful test names** - Describe the expected behavior
3. **One assertion per test** - Makes failures easier to diagnose
4. **Use data-testid sparingly** - Prefer accessible queries like `getByRole`
5. **Reset state between tests** - Use `beforeEach` for setup
6. **Keep tests independent** - Each test should work in isolation

## Debugging Tests

### View Test Output

```bash
# Verbose output
yarn test --reporter=verbose

# Run specific test file
yarn test tests/features/mockData.test.ts

# Run tests matching a pattern
yarn test -t "should add a tree"
```

### Using the UI

```bash
yarn test:ui
```

Opens a browser-based test runner with:
- Visual test tree
- Real-time results
- Error details and stack traces
- File watching

### Console Logging

```typescript
it('should debug', () => {
  const { getState } = renderWithProviders(<Component />);
  
  console.log('Current state:', JSON.stringify(getState(), null, 2));
  
  // ... rest of test
});
```

## Configuration

- **vitest.config.ts** - Main configuration file
- **tests/setup.ts** - Global setup (mocks, cleanup)
- **tsconfig.json** - TypeScript paths (used for imports)

## Common Issues

### "Property X not found on type"
Make sure you're importing from `tests/utils` which re-exports all types.

### "Cannot find module"
Check that path aliases in `vitest.config.ts` match `tsconfig.json`.

### "Act() warning"
Wrap state-changing operations in `act()` or use `waitFor()`:
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### Test timeout
Increase timeout for slow tests:
```typescript
it('slow test', async () => {
  // ...
}, 30000); // 30 second timeout
```
