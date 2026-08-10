import React from 'react';
import { Item } from '../../types';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import Icon from '../Icon';

interface SummaryItem {
  itemId: string;
  totalRate: number;
  category: string;
  hasByproductSource: boolean;
}

interface SummarySidebarProps {
  summaryData: SummaryItem[];
  externalImportData: SummaryItem[];
  externalImports: Record<string, true>;
  itemsMap: Record<string, Item>;
  onToggleExternalImport: (itemId: string, enable: boolean) => void;
}

const SummarySidebar: React.FC<SummarySidebarProps> = ({
  summaryData,
  externalImportData,
  externalImports,
  itemsMap,
  onToggleExternalImport,
}) => {
  const byproducts = summaryData
    .filter(item => item.hasByproductSource)
    .sort((a, b) => b.totalRate - a.totalRate);

  const components = summaryData
    .filter(item => !item.hasByproductSource && item.category === 'components')
    .sort((a, b) => b.totalRate - a.totalRate);

  const rawMaterials = summaryData
    .filter(item => !item.hasByproductSource && item.category === 'parts')
    .sort((a, b) => b.totalRate - a.totalRate);

  const others = summaryData
    .filter(item => !item.hasByproductSource && item.category !== 'components' && item.category !== 'parts')
    .sort((a, b) => b.totalRate - a.totalRate);

  const sidebarStyle: React.CSSProperties = {
    width: '250px',
    borderLeft: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.darker,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: `0 ${sizes.spacing.medium} ${sizes.spacing.medium} ${sizes.spacing.medium}`,
    boxSizing: 'border-box',
    marginLeft: sizes.spacing.medium,
    height: '100%',
  };

  const listContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingTop: sizes.spacing.medium,
    marginRight: '-8px',
    paddingRight: '8px',
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
    borderLeft: `3px solid ${theme.colors.nodeByproduct}`,
    paddingLeft: `calc(${sizes.spacing.small} - 3px)`,
  };

  const externalItemRowStyle: React.CSSProperties = {
    ...itemRowStyle,
    borderLeft: `3px solid ${theme.colors.nodeExternalImport}`,
    paddingLeft: `calc(${sizes.spacing.small} - 3px)`,
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
    marginRight: '4px',
  };

  const toggleBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    fontSize: '11px',
    padding: '1px 3px',
    lineHeight: 1,
    flexShrink: 0,
  };

  const renderSection = (title: string, items: SummaryItem[], rowStyle: React.CSSProperties, showToggle: boolean) => {
    if (items.length === 0) return null;
    return (
      <>
        <h5 style={sectionHeaderStyle}>{title}</h5>
        {items.map(({ itemId, totalRate }) => {
          const item = itemsMap[itemId];
          if (!item) return null;
          const isExternal = !!externalImports[itemId];
          return (
            <div key={itemId} style={rowStyle} title={`${item.name}: ${totalRate.toFixed(2)}/min`}>
              <Icon itemId={itemId} style={iconStyle} size="tiny" />
              <span style={nameStyle}>{item.name}</span>
              <span style={rateStyle}>{totalRate.toFixed(2)}</span>
              {showToggle && (
                <button
                  style={toggleBtnStyle}
                  onClick={(e) => { e.stopPropagation(); onToggleExternalImport(itemId, !isExternal); }}
                  title={isExternal ? 'Restore local production' : 'Source externally'}
                >
                  {isExternal ? '◀' : '▶'}
                </button>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div style={sidebarStyle}>
      <h4 style={{
          color: theme.colors.text,
          marginBottom: 0,
          marginTop: sizes.spacing.medium,
          paddingBottom: sizes.spacing.small,
          borderBottom: `1px solid ${theme.colors.border}`,
      }}>Item Summary</h4>

      <div style={listContainerStyle}>
        {renderSection("External Imports", externalImportData, externalItemRowStyle, true)}
        {summaryData.length === 0 && externalImportData.length === 0 ? (
          <p style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>No items to summarize.</p>
        ) : (
          <>
            {renderSection("Raw Materials", rawMaterials, itemRowStyle, true)}
            {renderSection("Components", components, itemRowStyle, true)}
            {renderSection("Others", others, itemRowStyle, true)}
            {renderSection("Byproducts", byproducts, byproductItemRowStyle, false)}
          </>
        )}
      </div>
    </div>
  );
};

export default SummarySidebar;
