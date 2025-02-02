import { theme } from "./theme";

export const uiStyles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    marginBottom: "24px",
  },
  formGroup: {
    display: "block",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: theme.spacing.padding,
    border: theme.border.style,
    borderRadius: theme.border.radius,
    fontSize: "16px",
    backgroundColor: theme.colors.background,
  },
  button: {
    padding: theme.spacing.containerPadding,
    backgroundColor: theme.colors.primary,
    color: "white",
    border: "none",
    borderRadius: theme.border.radius,
    fontSize: "16px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  select: {
    width: "100%",
    padding: theme.spacing.padding,
    border: theme.border.style,
    borderRadius: theme.border.radius,
    fontSize: "16px",
  },
};
