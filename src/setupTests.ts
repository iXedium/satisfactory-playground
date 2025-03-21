import '@testing-library/jest-dom';

// Mock IndexedDB for Dexie
const indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

const IDBKeyRange = {
  bound: jest.fn(),
  lowerBound: jest.fn(),
  upperBound: jest.fn(),
  only: jest.fn()
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDB,
  writable: true
});

Object.defineProperty(window, 'IDBKeyRange', {
  value: IDBKeyRange,
  writable: true
});

// Suppress console errors/warnings in tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
}); 