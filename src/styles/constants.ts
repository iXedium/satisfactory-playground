/**
 * Global sizing and spacing constants to ensure consistency across components
 */

export const sizes = {
  // Input field sizes
  inputField: {
    standardHeight: '28px',
    compactHeight: '24px',
    excessWidth: '60px',
    machineCountWidth: '40px',
    machineMultiplierWidth: '40px',
  },
  
  // Button sizes
  button: {
    standardHeight: '28px',
    compactHeight: '24px',
    standardWidth: '28px',
    compactWidth: '24px',
  },
  
  // Padding and margins
  spacing: {
    xsmall: '2px',
    small: '4px',
    medium: '8px',
    large: '16px',
    xlarge: '24px',
  },
  
  // Border radius
  borderRadius: {
    standard: '4px',
    small: '2px',
  },
  
  // Font sizes
  fontSize: {
    small: '12px',
    standard: '14px',
    large: '16px',
    xlarge: '18px',
  },
  
  // Z-index layers
  zIndex: {
    base: 1,
    controls: 2,
    tooltip: 10,
    dropdown: 100,
    modal: 1000,
  },
};

export default {
  sizes,
}; 