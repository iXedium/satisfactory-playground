// jest-dom adds custom jest matchers for asserting on DOM nodes.
const jestDom = require('@testing-library/jest-dom');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Assign the mock to global
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Suppress console errors during tests
console.error = jest.fn();
console.warn = jest.fn(); 