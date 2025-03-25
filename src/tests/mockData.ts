import { mockRecipes } from './setup';

// Create jest mock functions that can be tracked
export const getRecipeByIdMock = jest.fn().mockImplementation(async (id: string) => mockRecipes[id]);
export const getRecipeByOutputMock = jest.fn().mockImplementation(async (itemId: string) => 
  Object.values(mockRecipes).find(r => itemId in r.out)
);
export const getRecipesForItemMock = jest.fn().mockImplementation(async (itemId: string) => 
  Object.values(mockRecipes).filter(r => itemId in r.out)
);

// Mock database queries
jest.mock('../data/dbQueries', () => {
  return {
    __esModule: true,
    getRecipeById: getRecipeByIdMock,
    getRecipeByOutput: getRecipeByOutputMock,
    getRecipesForItem: getRecipesForItemMock
  };
}); 