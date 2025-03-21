import React from 'react';
import './loading-spinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullscreen?: boolean;
  overlay?: boolean;
}

/**
 * Animated loading spinner component with customizable appearance
 * 
 * @param size - Size of the spinner (small, medium, large)
 * @param message - Optional message to display
 * @param fullscreen - Whether to show spinner in fullscreen
 * @param overlay - Whether to show with semi-transparent overlay
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullscreen = false,
  overlay = false
}) => {
  const containerClass = `
    loading-spinner-container
    ${fullscreen ? 'loading-spinner-fullscreen' : ''}
    ${overlay ? 'loading-spinner-overlay' : ''}
  `;

  return (
    <div className={containerClass}>
      <div className={`loading-spinner loading-spinner-${size}`}>
        <div className="loading-spinner-circle"></div>
        <div className="loading-spinner-circle"></div>
        <div className="loading-spinner-circle"></div>
      </div>
      {message && (
        <div className="loading-spinner-message">{message}</div>
      )}
    </div>
  );
};

export default LoadingSpinner; 