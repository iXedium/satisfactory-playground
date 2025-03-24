import React from 'react';
import { theme } from '../../styles/theme';
import { GroupedItem } from './ResourceSummary';
import ResourceSummary from './ResourceSummary';

type CategoryType = 'byproducts' | 'raw_materials' | 'intermediates';

interface CategorySectionProps {
  title: string;
  type: CategoryType;
  items: GroupedItem[];
  showSection: boolean;
  nodeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onConsumerClick?: (nodeId: string) => void;
  containerStyle?: React.CSSProperties;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  type,
  items,
  showSection,
  nodeRefs,
  onConsumerClick,
  containerStyle
}) => {
  // Don't render if the section shouldn't be shown
  if (!showSection || items.length === 0) {
    return null;
  }

  const headerStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: '12px',
    marginTop: '16px',
    borderBottom: `1px solid ${theme.colors.border}`,
    paddingBottom: '4px'
  };

  // Get a color based on the category type
  const getCategoryColor = (): string => {
    switch (type) {
      case 'byproducts':
        return theme.colors.nodeByproduct;
      case 'raw_materials':
        return theme.colors.nodeImport;
      case 'intermediates':
        return theme.colors.primary;
      default:
        return theme.colors.text;
    }
  };

  const categoryIndicatorStyles: React.CSSProperties = {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: getCategoryColor(),
    marginRight: '8px'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyles}>
        <span style={categoryIndicatorStyles}></span>
        {title} ({items.length})
      </div>
      {items.map((item, index) => {
        const key = `${item.itemId}-${index}`;
        return (
          <ResourceSummary
            key={key}
            item={item}
            index={index}
            onConsumerClick={onConsumerClick}
            nodeRef={(el: HTMLDivElement | null) => {
              nodeRefs.current[key] = el;
              return undefined;
            }}
          />
        );
      })}
    </div>
  );
};

export default CategorySection; 