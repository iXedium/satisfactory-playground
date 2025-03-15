import { theme } from "./theme";
import { styled } from '@mui/material/styles';
// Create a styled component for the node container
const StyledNodeContainer = styled('div')({
    margin: '8px 4px',
    padding: '12px',
    background: theme.colors.darker,
    borderRadius: theme.border.radius,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    border: `1px solid ${theme.colors.dropdown.border}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    maxWidth: 'fit-content',
    position: 'relative',
    '&:nth-child(odd)': {
        backgroundColor: theme.colors.dark,
    },
});
export const dependencyStyles = {
    listContainer: {
        backgroundColor: theme.colors.dark,
        padding: '16px',
        borderRadius: theme.border.radius,
        color: theme.colors.text,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
        border: `1px solid ${theme.colors.dropdown.border}`,
        position: 'relative',
        background: theme.colors.dark,
        marginTop: '16px',
        overflowX: 'auto',
        minHeight: '200px',
    },
    rootColor: theme.colors.nodeRoot,
    byproductColor: theme.colors.nodeByproduct,
    defaultColor: theme.colors.nodeDefault,
    nodeContainer: {
        margin: '8px 4px',
        padding: '12px',
        background: theme.colors.darker,
        borderRadius: theme.border.radius,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        border: `1px solid ${theme.colors.dropdown.border}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        maxWidth: 'fit-content',
        position: 'relative',
    },
    nodeContent: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.gap,
        fontWeight: 500,
        letterSpacing: '0.02em',
    },
};
// Export the styled component for use where nth-child is needed
export const NodeContainer = StyledNodeContainer;
