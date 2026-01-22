/**
 * Logging utility with configurable log levels
 * Levels: 0=off, 1=error, 2=warn, 3=info, 4=debug, 5=verbose
 */

export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  verbose: 5,
};

const LS_LOG_LEVEL_KEY = 'lastSession_logLevel';

// Default to 'info' in production, 'debug' in development
const DEFAULT_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'info';

class Logger {
  private level: LogLevel;

  constructor() {
    // Load from localStorage if available
    try {
      const saved = localStorage.getItem(LS_LOG_LEVEL_KEY);
      if (saved && LOG_LEVEL_VALUES[saved as LogLevel] !== undefined) {
        this.level = saved as LogLevel;
      } else {
        this.level = DEFAULT_LOG_LEVEL;
      }
    } catch {
      this.level = DEFAULT_LOG_LEVEL;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
    try {
      localStorage.setItem(LS_LOG_LEVEL_KEY, level);
    } catch {
      // Ignore localStorage errors
    }
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    return LOG_LEVEL_VALUES[messageLevel] <= LOG_LEVEL_VALUES[this.level];
  }

  /**
   * Error level - critical errors that affect functionality
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Warn level - warnings that don't break functionality but indicate issues
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Info level - important information about app state changes
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Debug level - detailed debugging information
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Verbose level - extremely detailed logs, typically for performance analysis
   */
  verbose(message: string, ...args: unknown[]): void {
    if (this.shouldLog('verbose')) {
      console.log(`[VERBOSE] ${message}`, ...args);
    }
  }

  /**
   * Group logs together (always shown if level allows)
   */
  group(label: string, level: LogLevel = 'debug'): void {
    if (this.shouldLog(level)) {
      console.group(label);
    }
  }

  groupEnd(level: LogLevel = 'debug'): void {
    if (this.shouldLog(level)) {
      console.groupEnd();
    }
  }

  /**
   * Time a function (debug level)
   */
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export log level options for UI
export const LOG_LEVEL_OPTIONS: { id: LogLevel; name: string }[] = [
  { id: 'off', name: 'Off' },
  { id: 'error', name: 'Errors Only' },
  { id: 'warn', name: 'Warnings' },
  { id: 'info', name: 'Info' },
  { id: 'debug', name: 'Debug' },
  { id: 'verbose', name: 'Verbose' },
];
