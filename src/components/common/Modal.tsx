import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  
  /**
   * Function to close the modal
   */
  onClose: () => void;
  
  /**
   * Modal title
   */
  title?: React.ReactNode;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
  
  /**
   * Modal footer actions (usually buttons)
   */
  actions?: React.ReactNode;
  
  /**
   * Size of the modal
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /**
   * Close on Escape key press
   */
  closeOnEsc?: boolean;
  
  /**
   * Close on backdrop click
   */
  closeOnBackdropClick?: boolean;
  
  /**
   * Additional class name for the modal
   */
  className?: string;
}

/**
 * Modal component for displaying content in a layer above the app
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  closeOnEsc = true,
  closeOnBackdropClick = true,
  className = '',
}) => {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent scrolling while modal is open
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = ''; // Re-enable scrolling when modal is closed
    };
  }, [isOpen, onClose, closeOnEsc]);
  
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };
  
  // Don't render anything if modal is not open
  if (!isOpen) return null;
  
  // Modal content to render
  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleBackdropClick}
      >
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"
        ></div>
        
        {/* Trick the browser into centering modal contents */}
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        
        {/* Modal panel */}
        <div
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full ${className}`}
        >
          {/* Modal header */}
          {title && (
            <div className="px-4 py-3 border-b border-gray-200 sm:px-6">
              <h3
                className="text-lg font-medium leading-6 text-gray-900"
                id="modal-title"
              >
                {title}
              </h3>
              
              {/* Close button */}
              <button
                type="button"
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-500"
                onClick={onClose}
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          
          {/* Modal body */}
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">{children}</div>
          
          {/* Modal footer */}
          {actions && (
            <div className="px-4 py-3 border-t border-gray-200 sm:px-6 sm:flex sm:flex-row-reverse">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Use React Portal to render modal outside the current component hierarchy
  return createPortal(modalContent, document.body);
};

export default Modal; 