import React from 'react';
import { Item } from '../../types';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import Icon from '../Icon'; // Assuming an Icon component exists

// Updated SummaryItem structure to use category
interface SummaryItem {
  itemId: string;
  totalRate: number;
  category: string; // Add category
  hasByproductSource: boolean;
}

interface SummarySidebarProps {
  summaryData: SummaryItem[];
  itemsMap: Record<string, Item>;
}

const SummarySidebar: React.FC<SummarySidebarProps> = ({ summaryData, itemsMap }) => {

  // --- Filter and Sort Data using category --- 
  const byproducts = summaryData
    .filter(item => item.hasByproductSource)
    .sort((a, b) => b.totalRate - a.totalRate);

  // Components are category 'components' and not byproducts
  const components = summaryData
    .filter(item => !item.hasByproductSource && item.category === 'components')
    .sort((a, b) => b.totalRate - a.totalRate);

  // Raw materials are category 'parts' (as per user) and not byproducts
  const rawMaterials = summaryData
    .filter(item => !item.hasByproductSource && item.category === 'parts')
    .sort((a, b) => b.totalRate - a.totalRate);
    
  // Add a catch-all for other categories (e.g., 'unknown', 'equipment', etc.)
  const others = summaryData
    .filter(item => !item.hasByproductSource && item.category !== 'components' && item.category !== 'parts')
    .sort((a, b) => b.totalRate - a.totalRate);
  // -------------------------------------------

  // Styles
  const sidebarStyle: React.CSSProperties = {
    width: '250px', 
    borderLeft: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.darker,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: `0 ${sizes.spacing.medium} ${sizes.spacing.medium} ${sizes.spacing.medium}`, // Remove top padding
    boxSizing: 'border-box',
    marginLeft: sizes.spacing.medium,
    height: '100%', // Ensure the sidebar itself takes full available height
  };

  const listContainerStyle: React.CSSProperties = {
    flex: 1, // Allow list container to fill space
    overflowY: 'auto', // Enable vertical scrolling for the whole content area
    paddingTop: sizes.spacing.medium, // Add padding back for content
    marginRight: '-8px', // Offset scrollbar slightly
    paddingRight: '8px', // Add padding back
  };

  const sectionHeaderStyle: React.CSSProperties = {
    color: theme.colors.textSecondary,
    fontSize: sizes.fontSize.small,
    fontWeight: 'bold',
    marginTop: sizes.spacing.medium, 
    marginBottom: sizes.spacing.small,
    paddingBottom: sizes.spacing.xsmall,
    borderBottom: `1px solid ${theme.colors.border}`,
    textTransform: 'uppercase',
  };

  const itemRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: sizes.spacing.small,
    padding: `${sizes.spacing.xsmall} ${sizes.spacing.small}`,
    borderRadius: theme.border.radius,
    backgroundColor: theme.colors.dark,
  };

  const byproductItemRowStyle: React.CSSProperties = {
    ...itemRowStyle,
    // Use a border or background indication for byproducts
    borderLeft: `3px solid ${theme.colors.nodeByproduct}`, 
    paddingLeft: `calc(${sizes.spacing.small} - 3px)`, // Adjust padding for border
    // Or maybe change background slightly:
    // backgroundColor: theme.colors.nodeByproduct + '22', // Add alpha
  };

  const iconStyle: React.CSSProperties = {
    marginRight: sizes.spacing.medium,
    flexShrink: 0,
  };

  const nameStyle: React.CSSProperties = {
    flexGrow: 1,
    marginRight: sizes.spacing.medium,
    color: theme.colors.text,
    fontSize: sizes.fontSize.small,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const rateStyle: React.CSSProperties = {
    color: theme.colors.textSecondary,
    fontSize: sizes.fontSize.small,
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  };
  
  // Helper function to render a list section
  const renderSection = (title: string, items: SummaryItem[], style: React.CSSProperties) => {
    if (items.length === 0) return null;
    return (
      <>
        <h5 style={sectionHeaderStyle}>{title}</h5>
        {items.map(({ itemId, totalRate }) => {
          const item = itemsMap[itemId];
          if (!item) {
              console.warn(`SummarySidebar: Item data not found in itemsMap for ID: ${itemId}`);
              return null; 
          }
          return (
            <div key={itemId} style={style} title={`${item.name}: ${totalRate.toFixed(2)}/min`}>
              <Icon 
                itemId={itemId} 
                style={iconStyle} 
                size="tiny" 
              />
              <span style={nameStyle}>{item.name}</span>
              <span style={rateStyle}>{totalRate.toFixed(2)}</span>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div style={sidebarStyle}>
      {/* Main Header */}
      <h4 style={{ 
          color: theme.colors.text,
          marginBottom: 0, // Remove bottom margin
          marginTop: sizes.spacing.medium, // Add top margin
          paddingBottom: sizes.spacing.small,
          borderBottom: `1px solid ${theme.colors.border}`,
      }}>Item Summary</h4>
      
      {/* Scrollable Content Area */}
      <div style={listContainerStyle}>
        {summaryData.length === 0 ? (
          <p style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>No items to summarize.</p>
        ) : (
          <>
            {renderSection("Raw Materials", rawMaterials, itemRowStyle)}
            {renderSection("Components", components, itemRowStyle)}
            {renderSection("Others", others, itemRowStyle)}
            {renderSection("Byproducts", byproducts, byproductItemRowStyle)}
          </>
        )}
      </div>
    </div>
  );
};

export default SummarySidebar; 