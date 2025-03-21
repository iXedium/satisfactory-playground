import React, { useMemo } from 'react';
import { useComponentIntegration } from '../../hooks/useComponentIntegration';
import { useDataState } from '../../hooks/useStore';

interface RecentItemsProps {
  onSelect?: (itemId: string) => void;
  maxItems?: number;
  className?: string;
}

/**
 * Displays recently viewed items for quick access
 * 
 * Uses the integrated recentItems state to track and display items
 * the user has recently interacted with across multiple components
 */
export const RecentItems: React.FC<RecentItemsProps> = ({
  onSelect,
  maxItems = 5,
  className = ''
}) => {
  // Get recent items from the integration hook
  const { recentItems, selectRecipeAndShowCalculator } = useComponentIntegration();
  
  // Get item data from the global state
  const data = useDataState();
  
  // Filter to max items and get item details
  const recentItemsWithDetails = useMemo(() => {
    return recentItems
      .slice(0, maxItems)
      .map(itemId => {
        const item = data.items?.[itemId];
        return {
          id: itemId,
          name: item?.name || 'Unknown Item',
          image: item?.image || ''
        };
      })
      .filter(item => item.name !== 'Unknown Item');
  }, [recentItems, data.items, maxItems]);
  
  // Handle no recent items
  if (recentItemsWithDetails.length === 0) {
    return null;
  }
  
  return (
    <div className={`recent-items ${className}`}>
      <h3 className="recent-items-title">Recent Items</h3>
      <div className="recent-items-list">
        {recentItemsWithDetails.map(item => (
          <div 
            key={item.id}
            className="recent-item"
            onClick={() => {
              if (onSelect) {
                onSelect(item.id);
              } else {
                // Default behavior: open calculator with this item
                selectRecipeAndShowCalculator(item.id, '');
              }
            }}
          >
            {item.image && (
              <img 
                src={item.image} 
                alt={item.name} 
                className="recent-item-image" 
              />
            )}
            <span className="recent-item-name">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentItems; 