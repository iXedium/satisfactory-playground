import { theme } from "./theme";
import { styled } from '@mui/material/styles';
import { CSSProperties } from 'react';

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
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    position: 'relative',
    overflow: 'auto',
  } as CSSProperties,
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  } as CSSProperties,
  listContainer: {
    padding: '8px',
    overflow: 'auto',
  } as CSSProperties,
  rootColor: '#4CAF50',
  byproductColor: '#FF9800',
  defaultColor: '#2196F3',
  nodeContainer: {
    margin: '4px 0',
    padding: '4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  } as CSSProperties,
  nodeContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as CSSProperties,
};

// Export the styled component for use where nth-child is needed
export const NodeContainer = StyledNodeContainer;
