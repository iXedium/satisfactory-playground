import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  /**
   * Value of the option
   */
  value: string;
  
  /**
   * Label to display for the option
   */
  label: string;
  
  /**
   * Whether the option is disabled
   */
  disabled?: boolean;
  
  /**
   * Icon to display with the option
   */
  icon?: React.ReactNode;
}

export interface DropdownProps {
  /**
   * Array of options for the dropdown
   */
  options: DropdownOption[];
  
  /**
   * Value of the selected option
   */
  value?: string;
  
  /**
   * Placeholder text when no option is selected
   */
  placeholder?: string;
  
  /**
   * Callback when an option is selected
   */
  onChange?: (value: string) => void;
  
  /**
   * Whether the dropdown is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the dropdown is in an error state
   */
  error?: boolean;
  
  /**
   * Error message to display
   */
  errorMessage?: string;
  
  /**
   * Width of the dropdown
   */
  width?: string | number;
  
  /**
   * Max height of the dropdown menu
   */
  maxHeight?: string | number;
  
  /**
   * Additional class name for the dropdown
   */
  className?: string;
  
  /**
   * Label for the dropdown
   */
  label?: string;
}

/**
 * Dropdown component for selecting from a list of options
 */
export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = 'Select an option',
  onChange,
  disabled = false,
  error = false,
  errorMessage,
  width = '100%',
  maxHeight = '300px',
  className = '',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DropdownOption | undefined>(
    options.find(option => option.value === value)
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Update selected option when value changes
  useEffect(() => {
    setSelectedOption(options.find(option => option.value === value));
  }, [value, options]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle dropdown open/closed
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  // Handle option selection
  const handleOptionSelect = (option: DropdownOption) => {
    if (option.disabled) return;
    
    setSelectedOption(option);
    setIsOpen(false);
    
    if (onChange) {
      onChange(option.value);
    }
  };
  
  // Base styles for dropdown
  const dropdownStyles = `
    relative inline-block
    ${className}
  `;
  
  // Styles for dropdown button
  const buttonStyles = `
    flex items-center justify-between w-full px-3 py-2
    bg-white border rounded
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''}
    transition-colors duration-150
  `;
  
  // Styles for dropdown menu
  const menuStyles = `
    absolute z-10 w-full mt-1 bg-white border border-gray-200
    rounded shadow-lg overflow-y-auto
    ${isOpen ? 'block' : 'hidden'}
  `;
  
  // Styles for dropdown options
  const optionStyles = (option: DropdownOption) => `
    flex items-center px-3 py-2 cursor-pointer
    ${option.disabled ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'}
    ${selectedOption?.value === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-800'}
  `;
  
  return (
    <div className={dropdownStyles} ref={dropdownRef} style={{ width }}>
      {label && (
        <label className="block mb-1 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div 
        className={buttonStyles}
        onClick={toggleDropdown}
      >
        <span className="truncate">
          {selectedOption ? (
            <div className="flex items-center">
              {selectedOption.icon && (
                <span className="mr-2">{selectedOption.icon}</span>
              )}
              {selectedOption.label}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <span className="ml-2">
          <svg
            className={`h-5 w-5 text-gray-400 transform ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
      
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
      )}
      
      <div className={menuStyles} style={{ maxHeight }}>
        {options.map((option) => (
          <div
            key={option.value}
            className={optionStyles(option)}
            onClick={() => handleOptionSelect(option)}
          >
            {option.icon && (
              <span className="mr-2">{option.icon}</span>
            )}
            {option.label}
          </div>
        ))}
        
        {options.length === 0 && (
          <div className="px-3 py-2 text-gray-500">No options available</div>
        )}
      </div>
    </div>
  );
};

export default Dropdown; 