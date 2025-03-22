export const theme = {
  colors: {
    primary: "#ff7a00",
    secondary: "#00b8ff",
    background: "#1a1e24",
    backgroundAlt: "#232831",
    dark: "#2d3744",
    darker: "#1a1e24",
    hover: "rgba(255, 122, 0, 0.1)",
    text: "#ffffff",
    textPrimary: "#ffffff",
    textLight: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    textInverted: "#1a1e24",
    iconBg: '#2d3744',
    surface: "#2d3744",
    border: "#4a5664",
    danger: "#e63946", // Bright red for dangerous actions
    error: "#e63946",
    success: "#5aaa5a", // Added success color
    warning: "#aa9a5a", // Added warning color
    dangerText: "#e63946", // Added text danger color
    
    // Card backgrounds
    cardBackground: "#232831",
    
    // Button backgrounds
    importButton: "#00b8ff",
    deleteButton: "#e63946",
    
    // Badge backgrounds
    importBadge: "#0096ff", 
    
    // Tooltip
    tooltip: "#4a5664",
    
    // Node type indicators
    nodeRaw: "#aa9a5a",
    machine: "#5aaa5a",
    extension: "#00b8ff",
    
    // Machine colors
    mk1: "#5aaa5a", // Tier 1 machines
    mk2: "#aa9a5a", // Tier 2 machines
    mk3: "#e63946", // Tier 3 machines
    extractor: "#00b8ff", // Extractors
    generator: "#ff7a00", // Generators
    
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
  // Box shadows
  boxShadow: {
    small: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
    medium: "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
    large: "0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)",
  }
};

export const injectThemeVariables = () => {
  const root = document.documentElement;
  const { colors, border, spacing } = theme;

  root.style.setProperty('--dropdown-background', colors.dropdown.background);
  root.style.setProperty('--dropdown-hover-background', colors.dropdown.hoverBackground);
  root.style.setProperty('--dropdown-text', colors.dropdown.text);
  root.style.setProperty('--dropdown-border', colors.dropdown.border);
  root.style.setProperty('--border-radius', border.radius);
  root.style.setProperty('--spacing-padding', spacing.padding);
};
