import React, { useMemo, useEffect, useState } from 'react';
import { useComponentIntegration } from '../../hooks/useComponentIntegration';
import { useDataState } from '../../hooks/useStore';
import { Item, DatabaseItem } from '../../types/core';
import { getItemById, getIconForItem } from '../../data/dbQueries';

interface RecentItemsProps {
  onSelect?: (itemId: string) => void;
  maxItems?: number;
  className?: string;
}

interface RecentItemWithDetails {
  id: string;
  name: string;
  icon: string;
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
  
  // State for items with details including icons
  const [itemsWithDetails, setItemsWithDetails] = useState<RecentItemWithDetails[]>([]);
  
  // Fetch item details including icons
  useEffect(() => {
    const fetchItemDetails = async () => {
      const details = await Promise.all(
        recentItems.slice(0, maxItems).map(async (itemId) => {
          try {
            const item = await getItemById(itemId);
            if (!item) return null;
            
            const icon = await getIconForItem(itemId);
            
            return {
              id: itemId,
              name: item.name || 'Unknown Item',
              icon: icon ? icon.position : ''
            };
          } catch (error) {
            console.error(`Error fetching item details for ${itemId}:`, error);
            return null;
          }
        })
      );
      
      setItemsWithDetails(details.filter(Boolean) as RecentItemWithDetails[]);
    };
    
    fetchItemDetails();
  }, [recentItems, maxItems]);
  
  // Handle no recent items
  if (itemsWithDetails.length === 0) {
    return null;
  }
  
  return (
    <div className={`recent-items ${className}`}>
      <h3 className="recent-items-title">Recent Items</h3>
      <div className="recent-items-list">
        {itemsWithDetails.map(item => (
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
            {item.icon && (
              <img 
                src={item.icon} 
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