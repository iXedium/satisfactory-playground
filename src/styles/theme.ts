export const theme = {
  colors: {
    primary: "#ff7a00",
    secondary: "#00b8ff",
    background: "#1a1e24",
    dark: "#2d3744",
    darker: "#1a1e24",
    hover: "rgba(255, 122, 0, 0.1)",
    // iconBg: "rgba(255, 122, 0, 0.15)",
    text: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    iconBg: '#333333',
    
    // Node colors - Industrial theme
    nodeRoot: '#ff7a00', // Primary orange for root
    nodeByproduct: '#ff3333', // Sharp red for byproducts
    nodeDefault: '#8c9baa', // Neutral industrial gray
    
    // Efficiency colors - Muted theme
    efficiency: {
      perfect: '#4a8c4a', // Muted green for 100%
      under: '#8c7a4a', // Muted yellow for under 100%
      over: '#8c4a4a', // Muted red for over 100%
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
  const { colors, border, spacing } = theme;

  root.style.setProperty('--dropdown-background', colors.dropdown.background);
  root.style.setProperty('--dropdown-hover-background', colors.dropdown.hoverBackground);
  root.style.setProperty('--dropdown-text', colors.dropdown.text);
  root.style.setProperty('--dropdown-border', colors.dropdown.border);
  root.style.setProperty('--border-radius', border.radius);
  root.style.setProperty('--spacing-padding', spacing.padding);
};
