import { calculateDependencyTree, DependencyNode } from '../utils/calculateDependencyTree';
import { getRecipeById, getRecipeByOutput, getRecipesForItem } from '../data/dbQueries';

// Mock the database queries
jest.mock('../data/dbQueries', () => ({
  getRecipeById: jest.fn(),
  getRecipeByOutput: jest.fn(),
  getRecipesForItem: jest.fn(),
}));

describe('calculateDependencyTree', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should create a basic tree with no children for basic items', async () => {
    // Mock a basic item with no recipe
    (getRecipesForItem as jest.Mock).mockResolvedValue([]);
    (getRecipeByOutput as jest.Mock).mockResolvedValue(null);

    const result = await calculateDependencyTree('iron-ore', 60, null, {}, 0, [], '', {});
    
    expect(result).toBeDefined();
    expect(result.id).toBe('iron-ore');
    expect(result.amount).toBe(60);
    expect(result.children).toEqual([]);
  });

  it('should calculate a simple tree with children', async () => {
    // Mock recipes for a simple chain: iron-ingot -> iron-ore
    const ironIngotRecipe = {
      id: 'iron-ingot-recipe',
      in: { 'iron-ore': 30 },
      out: { 'iron-ingot': 20 },
      time: 2
    };
    
    (getRecipesForItem as jest.Mock).mockResolvedValue([ironIngotRecipe]);
    (getRecipeByOutput as jest.Mock).mockResolvedValue(ironIngotRecipe);
    (getRecipeById as jest.Mock).mockImplementation((id) => {
      if (id === 'iron-ingot-recipe') return Promise.resolve(ironIngotRecipe);
      return Promise.resolve(null);
    });
    
    // Mock iron-ore for the child node
    (getRecipesForItem as jest.Mock).mockImplementation((itemId) => {
      if (itemId === 'iron-ore') return Promise.resolve([]);
      if (itemId === 'iron-ingot') return Promise.resolve([ironIngotRecipe]);
      return Promise.resolve([]);
    });

    const result = await calculateDependencyTree('iron-ingot', 60, null, {}, 0, [], '', {});
    
    expect(result).toBeDefined();
    expect(result.id).toBe('iron-ingot');
    expect(result.amount).toBe(60);
    expect(result.children?.length).toBe(1);
    
    // Check child node (iron ore)
    const ironOreNode = result.children?.[0];
    expect(ironOreNode?.id).toBe('iron-ore');
    expect(ironOreNode?.amount).toBe(90); // 60 ingots needs 90 ore
  });

  it('should handle excess production', async () => {
    // Mock recipe
    const ironIngotRecipe = {
      id: 'iron-ingot-recipe',
      in: { 'iron-ore': 30 },
      out: { 'iron-ingot': 20 },
      time: 2
    };
    
    (getRecipesForItem as jest.Mock).mockResolvedValue([ironIngotRecipe]);
    (getRecipeByOutput as jest.Mock).mockResolvedValue(ironIngotRecipe);
    
    // Mock excess for the node
    const excessMap = { 'iron-ingot-0': 20 };  // 20 excess for iron-ingot
    
    const result = await calculateDependencyTree('iron-ingot', 60, null, {}, 0, [], '', excessMap);
    
    expect(result).toBeDefined();
    expect(result.id).toBe('iron-ingot');
    expect(result.amount).toBe(60);
    expect(result.excess).toBe(20);
  });
}); 