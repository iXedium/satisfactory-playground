import { theme } from "./theme";

export const iconStyles = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing.gap,
  },
  iconWrapper: {
    width: "40px", 
    height: "40px",
    backgroundColor: theme.colors.iconBg,
    borderRadius: theme.border.radius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    maxWidth: "32px",
    maxHeight: "32px",
    objectFit: "contain" as const,
    imageRendering: "pixelated" as const,
  },
};
