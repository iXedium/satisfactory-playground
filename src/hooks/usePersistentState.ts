import { useState, useEffect, useCallback } from 'react';
import { persistence } from '../services/persistence';

/**
 * Hook for managing state that persists to localStorage
 * 
 * @param key Storage key
 * @param initialValue Default value if nothing is stored
 * @returns [state, setState] tuple similar to useState
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage or initial value
  const [state, setState] = useState<T>(() => {
    return persistence.load(key, initialValue);
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    persistence.save(key, state);
  }, [key, state]);

  // Custom setter that works with both value and updater function
  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = value instanceof Function ? value(prevState) : value;
      return newValue;
    });
  }, []);

  return [state, setPersistentState];
}

/**
 * Hook for managing persistent objects with partial updates
 * 
 * @param key Storage key
 * @param initialValue Default object if nothing is stored
 * @returns [state, updateState, resetState] tuple
 */
export function usePersistentObject<T extends object>(key: string, initialValue: T): [
  T,
  (updates: Partial<T>) => void,
  () => void
] {
  const [state, setState] = usePersistentState<T>(key, initialValue);

  // Update only specific fields in the object
  const updateState = useCallback((updates: Partial<T>) => {
    setState(prev => ({
      ...prev,
      ...updates
    }));
  }, [setState]);

  // Reset to initial value
  const resetState = useCallback(() => {
    setState(initialValue);
  }, [setState, initialValue]);

  return [state, updateState, resetState];
}

/**
 * Hook for managing a persistent collection with add/remove operations
 * 
 * @param key Storage key
 * @param initialValue Default array if nothing is stored
 * @param idField Optional field to use as unique identifier
 * @returns Collection API with state and operations
 */
export function usePersistentCollection<T>(
  key: string, 
  initialValue: T[] = [] as T[],
  idField: keyof T = 'id' as keyof T
) {
  const [items, setItems] = usePersistentState<T[]>(key, initialValue);

  // Add item to collection
  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item]);
  }, [setItems]);

  // Update existing item
  const updateItem = useCallback((id: any, updates: Partial<T>) => {
    setItems(prev => 
      prev.map(item => 
        item[idField] === id ? { ...item, ...updates } : item
      )
    );
  }, [setItems, idField]);

  // Remove item from collection
  const removeItem = useCallback((id: any) => {
    setItems(prev => prev.filter(item => item[idField] !== id));
  }, [setItems, idField]);

  // Reset collection to initial value
  const resetItems = useCallback(() => {
    setItems(initialValue);
  }, [setItems, initialValue]);

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    resetItems,
    setItems
  };
}

export default usePersistentState; 