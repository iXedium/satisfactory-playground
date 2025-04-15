/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';

// Define Debug Levels using Zod for validation and type safety
export const DebugLevelSchema = z.enum(['NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE']);
export type DebugLevel = z.infer<typeof DebugLevelSchema>;

const DEBUG_LEVEL_ORDER: Record<DebugLevel, number> = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  VERBOSE: 5,
};

const LOCAL_STORAGE_KEY = 'appDebugLevel';

// --- State Management ---

let currentDebugLevel: DebugLevel = 'INFO'; // Default level

// Function to get the current debug level
export const getDebugLevel = (): DebugLevel => {
  return currentDebugLevel;
};

// Function to set the debug level and persist it
export const setDebugLevel = (level: DebugLevel): void => {
  try {
    // Validate the level using Zod schema
    const validatedLevel = DebugLevelSchema.parse(level);
    currentDebugLevel = validatedLevel;
    localStorage.setItem(LOCAL_STORAGE_KEY, currentDebugLevel);
    console.log(`[Debug System] Debug level set to: ${currentDebugLevel}`); // Log level change itself
  } catch (error) {
    console.error('[Debug System] Invalid debug level provided:', level, error);
  }
};

// Function to initialize the debug level from localStorage or default
export const initializeDebugLevel = (): void => {
  const storedLevel = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedLevel) {
    try {
      // Validate stored level
      const validatedLevel = DebugLevelSchema.parse(storedLevel);
      currentDebugLevel = validatedLevel;
    } catch (_error) { // Correctly placed catch block
       
      console.warn(`[Debug System] Invalid debug level found in localStorage ('${storedLevel}'), falling back to default 'INFO'.`);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Remove invalid entry
      currentDebugLevel = 'INFO'; // Fallback to default
    }
  } else {
    currentDebugLevel = 'INFO'; // Default if nothing is stored
  }
   console.log(`[Debug System] Initialized debug level: ${currentDebugLevel}`);
};

// --- Logging Function ---

/**
 * Logs messages based on the current debug level.
 * Only logs if the message's level is less than or equal to the current active level.
 *
 * @param level The level of the message (e.g., 'ERROR', 'INFO', 'DEBUG').
 * @param args The message and any additional data to log.
 */
export const logDebug = (level: DebugLevel, ...args: unknown[]): void => {
  try {
    // Validate the provided level for the message
    const validatedLevel = DebugLevelSchema.parse(level);
    const messageLevelOrder = DEBUG_LEVEL_ORDER[validatedLevel];
    const currentLevelOrder = DEBUG_LEVEL_ORDER[currentDebugLevel];

    if (messageLevelOrder <= currentLevelOrder) {
      const prefix = `[${validatedLevel}]`;
      switch (validatedLevel) {
        case 'ERROR':
          console.error(prefix, ...args);
          break;
        case 'WARN':
          console.warn(prefix, ...args);
          break;
        case 'INFO':
          console.info(prefix, ...args);
          break;
        case 'DEBUG':
          // Use console.debug if available, fallback to log
          (console.debug || console.log)(prefix, ...args);
          break;
        case 'VERBOSE':
           // Use console.debug if available, fallback to log
          (console.debug || console.log)(prefix, ...args);
          break;
        // 'NONE' level messages are never logged explicitly by this function
        // as the check `messageLevelOrder <= currentLevelOrder` handles it.
      }
    }
  } catch (error) {
     console.error('[Debug System] Invalid level provided to logDebug:', level, error);
  }
};

// --- Initialization ---
// Initialize on module load
initializeDebugLevel();
