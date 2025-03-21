/**
 * Formatting Utilities
 * 
 * Common utility functions for formatting numbers, text, and other data.
 */

/**
 * Format a number to a readable string with the specified precision
 * @param value The number value to format
 * @param precision The number of decimal places
 * @returns A formatted string representation of the number
 */
export function formatNumber(value: number, precision: number = 2): string {
  // Handle special cases
  if (isNaN(value)) return 'N/A';
  if (!isFinite(value)) return value > 0 ? '∞' : '-∞';
  if (value === 0) return '0';
  
  // Format the number with the specified precision
  const absValue = Math.abs(value);
  
  // For very small numbers close to zero, display as 0
  if (absValue < Math.pow(10, -precision)) {
    return '0';
  }
  
  // For large numbers, use K, M, G, etc. suffixes
  if (absValue >= 1000) {
    const units = ['', 'K', 'M', 'G', 'T', 'P'];
    const order = Math.floor(Math.log10(absValue) / 3);
    const unitValue = value / Math.pow(1000, order);
    return `${unitValue.toFixed(precision).replace(/\.0+$|(\.\d*[1-9])0+$/, '$1')}${units[order]}`;
  }
  
  // For normal numbers, just format with fixed precision
  return value.toFixed(precision).replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
}

/**
 * Format a rate value (items per minute, etc.)
 * @param value The rate value to format
 * @param suffix The suffix to append (default is '/min')
 * @returns A formatted string representation of the rate
 */
export function formatRate(value: number, suffix: string = '/min'): string {
  return `${formatNumber(value, 1)}${suffix}`;
}

/**
 * Format a power value (MW, etc.)
 * @param value The power value to format in MW
 * @returns A formatted string representation of the power value
 */
export function formatPower(value: number): string {
  if (value < 1) {
    return `${formatNumber(value * 1000, 0)} kW`;
  }
  return `${formatNumber(value, 2)} MW`;
}

/**
 * Format a percentage value
 * @param value The percentage value to format (0.0 to 1.0)
 * @returns A formatted string representation of the percentage
 */
export function formatPercentage(value: number): string {
  return `${formatNumber(value * 100, 0)}%`;
}

/**
 * Format machine efficiency
 * @param efficiency The efficiency value (0.0 to 1.0)
 * @returns A formatted string with color info based on the efficiency
 */
export function formatEfficiency(
  efficiency: number
): { text: string; color: string } {
  const value = Math.min(Math.max(efficiency, 0), 1);
  
  let color = '#ff4d4f'; // Red for poor efficiency
  if (value >= 0.95) {
    color = '#52c41a'; // Green for good efficiency
  } else if (value >= 0.8) {
    color = '#faad14'; // Yellow for moderate efficiency
  }
  
  return {
    text: formatPercentage(value),
    color,
  };
}

/**
 * Format time duration (from seconds)
 * @param seconds The time in seconds
 * @returns A formatted string representation of the duration
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${formatNumber(seconds, 1)}s`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds > 0 ? `${Math.floor(remainingSeconds)}s` : ''}`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
}

/**
 * Slugify a string for use in URLs or IDs
 * @param text The text to slugify
 * @returns A URL-friendly version of the text
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Truncate a string if it exceeds the maximum length
 * @param text The text to truncate
 * @param maxLength The maximum length
 * @param ellipsis The ellipsis string (default is '...')
 * @returns The truncated string with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
} 