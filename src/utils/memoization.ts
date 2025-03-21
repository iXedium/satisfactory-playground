/**
 * Memoization Utilities
 * 
 * Utility functions for memoization and caching results of expensive operations.
 */

/**
 * Simple memoization function for functions with a single argument
 * @param fn The function to memoize
 * @returns A memoized version of the function
 */
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  const cache = new Map<T, R>();
  
  return (arg: T): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

/**
 * Memoize a function with multiple arguments
 * @param fn The function to memoize
 * @returns A memoized version of the function
 */
export function memoizeMultiArgs<T extends any[], R>(fn: (...args: T) => R): (...args: T) => R {
  const cache = new Map<string, R>();
  
  return (...args: T): R => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Creates a memoized function with a maximum cache size
 * @param fn The function to memoize
 * @param maxSize The maximum number of results to cache
 * @returns A memoized version of the function
 */
export function memoizeWithMaxSize<T, R>(fn: (arg: T) => R, maxSize: number = 100): (arg: T) => R {
  const cache = new Map<T, R>();
  const keys: T[] = [];
  
  return (arg: T): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    
    const result = fn(arg);
    cache.set(arg, result);
    keys.push(arg);
    
    // Remove oldest entry if cache exceeds max size
    if (keys.length > maxSize) {
      const oldestKey = keys.shift()!;
      cache.delete(oldestKey);
    }
    
    return result;
  };
}

/**
 * Creates a memoized function with a time-to-live (TTL) for cache entries
 * @param fn The function to memoize
 * @param ttl The time-to-live in milliseconds
 * @returns A memoized version of the function
 */
export function memoizeWithTTL<T, R>(fn: (arg: T) => R, ttl: number = 60000): (arg: T) => R {
  const cache = new Map<T, { result: R; timestamp: number }>();
  
  return (arg: T): R => {
    const now = Date.now();
    const cachedEntry = cache.get(arg);
    
    if (cachedEntry && now - cachedEntry.timestamp < ttl) {
      return cachedEntry.result;
    }
    
    const result = fn(arg);
    cache.set(arg, { result, timestamp: now });
    return result;
  };
}

/**
 * Debounce a function
 * @param fn The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends any[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: T): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle a function
 * @param fn The function to throttle
 * @param limit The minimum time between function calls
 * @returns A throttled version of the function
 */
export function throttle<T extends any[]>(
  fn: (...args: T) => void,
  limit: number
): (...args: T) => void {
  let inThrottle = false;
  let lastArgs: T | null = null;
  
  return (...args: T): void => {
    lastArgs = args;
    
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs && lastArgs !== args) {
          fn(...lastArgs);
        }
      }, limit);
    }
  };
} 