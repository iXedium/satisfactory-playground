import { theme } from "./theme";

export const itemSelectStyles = {
  selectContainer: {
    position: "relative" as const,
    width: "100%",
  },
  customSelect: {
    width: "100%",
    minWidth: "200px",
    padding: theme.spacing.padding,
    cursor: "pointer",
    backgroundColor: theme.colors.dark,
    border: theme.border.style,
    borderRadius: theme.border.radius,
  },
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: theme.colors.dark,
    border: theme.border.style,
    borderTop: "none",
    borderRadius: `0 0 ${theme.border.radius} ${theme.border.radius}`,
    maxHeight: "300px",
    overflowY: "auto" as const,
    zIndex: theme.zIndex.dropdown,
  },
  dropdownItem: {
    padding: theme.spacing.padding,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.gap,
    '&:hover': {
      backgroundColor: theme.colors.hover,
    },
  },
  autocomplete: {
    width: "100%",
  },
  autocompletePaper: {
    backgroundColor: theme.colors.darker, // using theme value instead of "#222"
    color: theme.colors.background,       // using theme background (e.g., white)
  },
  autocompleteListbox: {
    backgroundColor: theme.colors.dark, // using theme value
    color: theme.colors.background,       // using theme value
  },
  // New property for the TextField input style including text and border color
  autocompleteInput: {
    '& .MuiInputBase-input': {
      color: theme.colors.background, // text color for the selected option
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: "#ccc", // derived from theme.border.style (e.g. "1px solid #ccc")
    },
  },
};
