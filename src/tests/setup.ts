import { Recipe } from '../data/dexieDB';

// Mock recipes data
export const mockRecipes: Record<string, Recipe> = {
  'recipe_iron_rod': {
    id: 'recipe_iron_rod',
    name: 'Iron Rod',
    producers: ['constructor'],
    time: 4,
    in: { 'iron_ingot': 1 },
    out: { 'iron_rod': 1 }
  },
  'recipe_iron_ingot': {
    id: 'recipe_iron_ingot',
    name: 'Iron Ingot',
    producers: ['smelter'],
    time: 2,
    in: { 'iron_ore': 1 },
    out: { 'iron_ingot': 1 }
  }
};

// Mock the window object if not in a browser environment
if (typeof window === 'undefined') {
  (global as any).window = {};
}

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    result: {},
    transaction: jest.fn(),
    objectStoreNames: {
      contains: jest.fn().mockReturnValue(true)
    },
    createObjectStore: jest.fn(),
    objectStore: jest.fn()
  }),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
  configurable: true,
});

// Mock Dexie
jest.mock('dexie', () => {
  class MockDexie {
    version() {
      return {
        stores: () => this,
      };
    }
    table() {
      return {
        get: jest.fn().mockResolvedValue(null),
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
    }
  }
  return {
    __esModule: true,
    default: MockDexie,
  };
});

// Mock the database
jest.mock('../data/dexieDB', () => {
  const mockDb = {
    recipes: {
      get: jest.fn().mockImplementation(async (id: string) => mockRecipes[id]),
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(Object.values(mockRecipes)),
      filter: jest.fn().mockImplementation((predicate: (recipe: Recipe) => boolean) => ({
        toArray: jest.fn().mockResolvedValue(Object.values(mockRecipes).filter(predicate))
      }))
    },
    items: {
      get: jest.fn().mockResolvedValue(null),
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    },
    icons: {
      get: jest.fn().mockResolvedValue(null)
    },
    getRecipeByOutput: jest.fn().mockImplementation(async (itemId: string) => 
      Object.values(mockRecipes).find(r => Object.keys(r.out).includes(itemId))
    )
  };

  return {
    __esModule: true,
    SatisfactoryDatabase: jest.fn(),
    db: mockDb,
    Recipe: jest.fn(),
    Item: jest.fn(),
    Icon: jest.fn()
  };
}); 