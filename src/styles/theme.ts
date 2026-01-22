export const theme = {
  colors: {
    primary: "#ff7a00",
    secondary: "#00b8ff",
    background: "#1a1e24",
    dark: "#2d3744",
    darker: "#1a1e24",
    hover: "rgba(255, 122, 0, 0.1)",
    text: "#ffffff",
    textLight: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    iconBg: '#2d3744',
    surface: "#2d3744",
    border: "#4a5664",
    danger: "#e63946", // Bright red for dangerous actions
    error: "#e63946", // For error states
    buttonText: "#ffffff", // Text color for buttons
    
    // Node colors - Industrial theme
    nodeRoot: '#ff7a00', // Primary orange for root
    nodeByproduct: '#ff3333', // Sharp red for byproducts
    nodeImport: '#0096ff', // Bright blue for imports
    nodeDefault: '#8c9baa', // Neutral industrial gray
    
    // Efficiency colors - Bolder theme
    efficiency: {
      perfect: '#5aaa5a', // Bolder green for 100%
      under: '#aa9a5a', // Bolder yellow for under 100%
      over: '#aa5a5a', // Bolder red for over 100%
    },
    
    // Comparison colors - For baseline comparison display
    comparison: {
      increased: '#ff6b6b', // Red - value went up (costs more)
      decreased: '#ffd93d', // Yellow - value went down (costs less)
      unchanged: '#6bcb77', // Green - no change
      changed: '#9d65c9',   // Purple - for recipe/type changes
    },
    
    // Node background with metallic feel
    nodeBg: 'linear-gradient(145deg, #2d3744, #3a4654)',
    
    // Button states
    buttonHover: '#ff8c1a',
    buttonDefault: '#ff7a00',
    
    // Dropdown specific colors
    dropdown: {
      background: '#2d3744',
      hoverBackground: '#3a4654',
      text: '#ffffff',
      border: '#4a5664',
    },
  },
  border: {
    radius: "6px",
    style: "1px solid #4a5664",
  },
  borderRadius: "6px",
  spacing: {
    gap: "12px",
    padding: "12px",
    containerPadding: "16px 32px",
  },
  zIndex: {
    dropdown: 1000,
  },
  // Switch styling with industrial theme
  switch: {
    track: "#4a5664",
    activeTrack: "#ff7a00",
    knob: "#ffffff",
    label: "#ffffff",
  },
};

export const injectThemeVariables = () => {
  const root = document.documentElement;
  if (!root) return; // Add a check for safety

  // Define a type for nested objects, allowing string or nested objects
  type NestedThemeObject = { [key: string]: string | number | NestedThemeObject };

  const flattenObject = (obj: NestedThemeObject, prefix = "") =>
    Object.keys(obj).reduce<Record<string, string>>((acc, k) => {
      const pre = prefix.length ? prefix + "-" : "";
      const value = obj[k]; // Get the value
      // Check if value is a non-null object and not an array
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(acc, flattenObject(value as NestedThemeObject, pre + k));
      } else {
        // Assign stringified value for primitives
        acc[`--theme-${pre}${k}`] = String(value);
      }
      return acc;
    }, {});

  // Flatten the entire theme object (colors, border, spacing, zIndex, switch)
  const themeVariables = flattenObject(theme);

  // Also add constants from sizes.ts if needed (assuming sizes is importable)
  // This might require importing sizes from './styles/constants'
  // import { sizes } from './styles/constants'; // Example import
  // const sizeVariables = flattenObject(sizes, 'size'); 
  // Object.assign(themeVariables, sizeVariables);

  // Set all variables
  for (const [key, value] of Object.entries(themeVariables)) {
    root.style.setProperty(key, value);
    // Optional: Log the set variable
    // console.log(`Set CSS Var: ${key}=${value}`);
  }
};

// Example usage (already added to main.tsx):
// injectThemeVariables();
