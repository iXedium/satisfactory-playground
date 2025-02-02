export const iconStyles = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  iconWrapper: {
    width: "40px", // Slightly larger to accommodate different icon sizes
    height: "40px",
    backgroundColor: "rgba(0, 0, 0, 0.1)", // Slightly darker background
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    maxWidth: "32px",
    maxHeight: "32px",
    objectFit: "contain" as const, // Maintain aspect ratio
    imageRendering: "pixelated" as const, // Better for pixel art
  },
  selectContainer: {
    position: "relative" as const,
    width: "100%",
  },
  customSelect: {
    width: "100%",
    minWidth: "200px",
    padding: "8px",
    cursor: "pointer",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderTop: "none",
    borderRadius: "0 0 4px 4px",
    maxHeight: "300px",
    overflowY: "auto" as const,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    '&:hover': {
      backgroundColor: "rgba(0, 0, 0, 0.05)",
    },
  },
};
