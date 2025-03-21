/**
 * PowerViewWrapper Component
 * 
 * Wrapper for the refactored PowerView component to maintain backward compatibility
 * with the original PowerView API while using the new implementation.
 */

import React from "react";
import PowerView from "./PowerView";
import { Machine } from "../../types/core";

// Define the props interface that matches the original PowerView component
export interface PowerViewWrapperProps {
  /**
   * List of machines to display power information for
   */
  machines: Machine[];
  
  /**
   * Whether the data is currently loading
   */
  isLoading?: boolean;
  
  /**
   * Error message if data loading failed
   */
  error?: string;
}

/**
 * PowerViewWrapper component that maintains backward compatibility
 * while using the new modular PowerView implementation
 */
const PowerViewWrapper: React.FC<PowerViewWrapperProps> = ({
  machines,
  isLoading = false,
  error,
}) => {
  return (
    <PowerView 
      machines={machines}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default PowerViewWrapper; 