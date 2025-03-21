/**
 * Persistence Service
 * 
 * Provides a consistent API for persisting state to localStorage with:
 * - Type safety
 * - Error handling
 * - Version management
 * - Storage limit handling
 */

export interface Migration {
  version: number;
  migrate: <T>(data: any) => T;
}

export interface PersistenceOptions {
  version?: number;
  migrations?: Migration[];
  prefix?: string;
  storageLimit?: number; // in bytes
}

const DEFAULT_OPTIONS: PersistenceOptions = {
  version: 1,
  prefix: 'app:',
  storageLimit: 5 * 1024 * 1024 // 5MB default
};

export class PersistenceService {
  private options: Required<PersistenceOptions>;
  
  constructor(options: PersistenceOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<PersistenceOptions>;
  }
  
  /**
   * Save state to localStorage with versioning
   * @param key Storage key
   * @param state State to save
   * @returns success status
   */
  saveState<T>(key: string, state: T): boolean {
    try {
      // Create storage object with version info
      const storageObject = {
        version: this.options.version,
        data: state,
        timestamp: new Date().toISOString()
      };
      
      // Serialize with error handling
      const serialized = JSON.stringify(storageObject);
      
      // Check size limits
      const size = new Blob([serialized]).size;
      if (size > this.options.storageLimit) {
        console.warn(`Storage size for ${key} exceeds limit (${size} bytes)`);
        return false;
      }
      
      // Save to localStorage
      localStorage.setItem(this.getFullKey(key), serialized);
      return true;
    } catch (error) {
      console.error(`Error saving state for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Load state from localStorage with migration support
   * @param key Storage key
   * @param defaultValue Default value if not found
   * @returns loaded state or default value
   */
  loadState<T>(key: string, defaultValue: T): T {
    try {
      // Read from localStorage
      const serialized = localStorage.getItem(this.getFullKey(key));
      if (!serialized) {
        return defaultValue;
      }
      
      // Parse the storage object
      const storageObject = JSON.parse(serialized);
      
      // Handle version migrations if needed
      if (storageObject.version < this.options.version && this.options.migrations) {
        return this.migrateState<T>(storageObject, defaultValue);
      }
      
      return storageObject.data as T;
    } catch (error) {
      console.error(`Error loading state for key ${key}:`, error);
      return defaultValue;
    }
  }
  
  /**
   * Clear state for a specific key or all keys with the prefix
   * @param key Optional specific key to clear
   */
  clearState(key?: string): void {
    try {
      if (key) {
        localStorage.removeItem(this.getFullKey(key));
      } else {
        // Clear all keys with our prefix
        Object.keys(localStorage)
          .filter(k => k.startsWith(this.options.prefix))
          .forEach(k => localStorage.removeItem(k));
      }
    } catch (error) {
      console.error('Error clearing state:', error);
    }
  }
  
  /**
   * Get all keys for the current prefix
   * @returns Array of keys
   */
  getAllKeys(): string[] {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(this.options.prefix))
        .map(k => k.substring(this.options.prefix.length));
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }
  
  /**
   * Apply migrations to upgrade state from an old version
   * @param storageObject Storage object with version and data
   * @param defaultValue Default value if migration fails
   * @returns Migrated state
   */
  private migrateState<T>(storageObject: any, defaultValue: T): T {
    try {
      let { version, data } = storageObject;
      
      // Find migrations that need to be applied
      const migrations = this.options.migrations
        .filter(m => m.version > version)
        .sort((a, b) => a.version - b.version);
      
      // Apply migrations in sequence
      for (const migration of migrations) {
        data = migration.migrate(data);
        version = migration.version;
      }
      
      return data as T;
    } catch (error) {
      console.error('Error migrating state:', error);
      return defaultValue;
    }
  }
  
  /**
   * Get full storage key with prefix
   * @param key Base key
   * @returns Full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }
}

// Export singleton instance with default options
export const persistenceService = new PersistenceService();

// Export a hook-friendly interface
export const persistence = {
  save: <T>(key: string, state: T): boolean => persistenceService.saveState(key, state),
  load: <T>(key: string, defaultValue: T): T => persistenceService.loadState(key, defaultValue),
  clear: (key?: string): void => persistenceService.clearState(key),
  getAllKeys: (): string[] => persistenceService.getAllKeys()
}; 