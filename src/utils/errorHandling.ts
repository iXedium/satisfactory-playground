/**
 * Error Handling Utilities
 * 
 * Utility functions for handling errors, error logging, and error recovery.
 */

/**
 * Custom application error class
 */
export class AppError extends Error {
  code: string;
  details?: any;
  
  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error types enum
 */
export enum ErrorType {
  CALCULATION = 'CALCULATION_ERROR',
  RECIPE = 'RECIPE_ERROR',
  ITEM = 'ITEM_ERROR',
  MACHINE = 'MACHINE_ERROR',
  IMPORT = 'IMPORT_ERROR',
  NETWORK = 'NETWORK_ERROR',
  STORAGE = 'STORAGE_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
}

/**
 * Safe function wrapper that catches errors and returns a default value
 * @param fn The function to wrap
 * @param defaultValue The default value to return on error
 * @returns The result of the function or the default value
 */
export function tryCatch<T, Args extends any[]>(
  fn: (...args: Args) => T,
  defaultValue: T
): (...args: Args) => T {
  return (...args: Args): T => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('Error in operation:', error);
      return defaultValue;
    }
  };
}

/**
 * Log an error with additional context
 * @param error The error object
 * @param context Additional context information
 */
export function logError(error: Error | unknown, context: Record<string, any> = {}): void {
  // Format error information
  const errorInfo = {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'UnknownError',
    stack: error instanceof Error ? error.stack : undefined,
    code: error instanceof AppError ? error.code : undefined,
    details: error instanceof AppError ? error.details : undefined,
    context,
    timestamp: new Date().toISOString(),
  };
  
  // Log to console in development
  console.error('Application error:', errorInfo);
  
  // In production, you might want to send to a logging service
  // This is a placeholder for that functionality
  if (process.env.NODE_ENV === 'production') {
    // sendToLoggingService(errorInfo);
  }
}

/**
 * Create an error specific to calculation issues
 * @param message The error message
 * @param details Additional details about the error
 * @returns A new AppError
 */
export function createCalculationError(message: string, details?: any): AppError {
  return new AppError(message, ErrorType.CALCULATION, details);
}

/**
 * Create an error for recipe-related issues
 * @param message The error message
 * @param recipeId The ID of the recipe involved
 * @returns A new AppError
 */
export function createRecipeError(message: string, recipeId?: string): AppError {
  return new AppError(message, ErrorType.RECIPE, { recipeId });
}

/**
 * Create an error for item-related issues
 * @param message The error message
 * @param itemId The ID of the item involved
 * @returns A new AppError
 */
export function createItemError(message: string, itemId?: string): AppError {
  return new AppError(message, ErrorType.ITEM, { itemId });
}

/**
 * Check if an error is of a specific type
 * @param error The error to check
 * @param errorType The error type to check for
 * @returns Whether the error is of the specified type
 */
export function isErrorOfType(error: unknown, errorType: ErrorType): boolean {
  return error instanceof AppError && error.code === errorType;
}

/**
 * Validate a required value is present
 * @param value The value to check
 * @param name The name of the value for the error message
 * @throws AppError if the value is null, undefined, or an empty string
 */
export function validateRequired(value: any, name: string): void {
  if (value === null || value === undefined || value === '') {
    throw new AppError(
      `${name} is required but was not provided`,
      ErrorType.VALIDATION,
      { field: name }
    );
  }
}

/**
 * Validate a number is within a specific range
 * @param value The number to validate
 * @param min The minimum allowed value
 * @param max The maximum allowed value
 * @param name The name of the value for the error message
 * @throws AppError if the value is outside the specified range
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  name: string
): void {
  if (value < min || value > max) {
    throw new AppError(
      `${name} must be between ${min} and ${max}, but was ${value}`,
      ErrorType.VALIDATION,
      { field: name, value, min, max }
    );
  }
} 