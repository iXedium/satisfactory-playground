export const dependencyStyles: {
  listContainer: React.CSSProperties;
  rootColor: string;
  byproductColor: string;
  defaultColor: string;
} = {
  listContainer: {
    textAlign: "left", // ✅ Now properly typed
    paddingLeft: "10px",
  },
  rootColor: "#add8e6",
  byproductColor: "#ffaaaa",
  defaultColor: "inherit",
};
