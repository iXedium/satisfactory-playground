export const theme = {
  colors: {
    primary: "#007bff",
    background: "#fff",
    dark: "#333",
    darker: "#222",
    hover: "rgba(0, 0, 0, 0.05)",
    iconBg: "rgba(0, 0, 0, 0.1)",
    text: "#eee",
    
    // Node colors
    nodeRoot: '#4caf50',
    nodeByproduct: '#ff9800',
    nodeDefault: '#2196f3',
    
    // Node background
    nodeBg: 'rgba(0, 0, 0, 0.04)',
    
    // Button hover states
    buttonHover: '#0056b3',
    buttonDefault: '#007bff',
    
    // Dropdown specific colors
    dropdown: {
      background: '#333',
      hoverBackground: '#444',
      text: '#fff',
      border: '#555',
    },
  },
  border: {
    radius: "4px",
    style: "1px solid #ccc",
  },
  spacing: {
    gap: "8px",
    padding: "8px",
    containerPadding: "12px 24px",
  },
  zIndex: {
    dropdown: 1000,
  },
  // New switch styling entries
  switch: {
    track: "#ccc",
    activeTrack: "#007bff",
    knob: "#fff",
    label: "white",
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
