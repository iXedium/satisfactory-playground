/* eslint-disable @typescript-eslint/no-unused-vars */

// Define Debug Levels as a const array for validation
const DEBUG_LEVELS = ['NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'] as const;
export type DebugLevel = typeof DEBUG_LEVELS[number];

// Helper to validate if a string is a valid DebugLevel
function isValidDebugLevel(value: string): value is DebugLevel {
  return DEBUG_LEVELS.includes(value as DebugLevel);
}

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
  if (isValidDebugLevel(level)) {
    currentDebugLevel = level;
    localStorage.setItem(LOCAL_STORAGE_KEY, currentDebugLevel);
  } else {
    console.error('[Debug System] Invalid debug level provided:', level);
  }
};

// Function to initialize the debug level from localStorage or default
export const initializeDebugLevel = (): void => {
  const storedLevel = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedLevel && isValidDebugLevel(storedLevel)) {
    currentDebugLevel = storedLevel;
  } else if (storedLevel) {
    console.warn(`[Debug System] Invalid debug level found in localStorage ('${storedLevel}'), falling back to default 'INFO'.`);
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Remove invalid entry
    currentDebugLevel = 'INFO'; // Fallback to default
  } else {
    currentDebugLevel = 'INFO'; // Default if nothing is stored
  }
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
  if (!isValidDebugLevel(level)) {
    console.error('[Debug System] Invalid level provided to logDebug:', level);
    return;
  }
  
  const messageLevelOrder = DEBUG_LEVEL_ORDER[level];
  const currentLevelOrder = DEBUG_LEVEL_ORDER[currentDebugLevel];

  if (messageLevelOrder <= currentLevelOrder) {
    const prefix = `[${level}]`;
    switch (level) {
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
};

// --- Initialization ---
// Initialize on module load
initializeDebugLevel();
