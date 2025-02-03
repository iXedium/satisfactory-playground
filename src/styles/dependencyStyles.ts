import { theme } from "./theme";

export const dependencyStyles: {
  listContainer: React.CSSProperties;
  rootColor: string;
  byproductColor: string;
  defaultColor: string;
} = {
  listContainer: {
    backgroundColor: theme.colors.dark,
    padding: theme.spacing.padding,
    borderRadius: theme.border.radius,
    color: theme.colors.text,
  },
  rootColor: "#add8e6",
  byproductColor: "#ffaaaa",
  defaultColor: "inherit",
};
