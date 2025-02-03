import { text } from "stream/consumers";

export const theme = {
  colors: {
    primary: "#007bff",
    background: "#fff",
    dark: "#333",
    darker: "#222",
    hover: "rgba(0, 0, 0, 0.05)",
    iconBg: "rgba(0, 0, 0, 0.1)",
    text: "#eee",
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
