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
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "16px",
  },
  button: {
    padding: "12px 24px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  select: {
    width: "100%",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "16px",
  },
};
