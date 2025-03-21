/**
 * RequirementsOutput Component
 * 
 * Displays calculated resource requirements.
 */

import React, { useState, useEffect } from "react";
import { getItemById } from "../../data/dbQueries";
import { theme } from "../../styles/theme";

export interface RequirementsOutputProps {
  /**
   * Array of resource requirements
   */
  requirements: {
    itemId: string;
    name: string;
    amount: number;
    isRawMaterial: boolean;
  }[];
  
  /**
   * Whether data is loading
   */
  isLoading: boolean;
}

/**
 * RequirementsOutput component for displaying resource requirements
 */
const RequirementsOutput: React.FC<RequirementsOutputProps> = ({
  requirements,
  isLoading,
}) => {
  // State for storing item details
  const [itemDetails, setItemDetails] = useState<Record<string, { name: string, icon: string }>>({});
  
  // Fetch item details for all requirements
  useEffect(() => {
    if (!requirements.length) return;
    
    // Get unique item IDs
    const itemIds = [...new Set(requirements.map(req => req.itemId))];
    
    // Fetch details for each item
    const fetchItemDetails = async () => {
      const details: Record<string, { name: string, icon: string }> = {};
      
      await Promise.all(
        itemIds.map(async (itemId) => {
          try {
            const item = await getItemById(itemId);
            if (item) {
              details[itemId] = {
                name: item.name || 'Unknown Item',
                icon: item.icon || '',
              };
            }
          } catch (error) {
            console.error(`Error fetching item details for ${itemId}:`, error);
          }
        })
      );
      
      setItemDetails(details);
    };
    
    fetchItemDetails();
  }, [requirements]);
  
  // Group requirements by type (raw materials and intermediates)
  const rawMaterials = requirements.filter(req => req.isRawMaterial);
  const intermediates = requirements.filter(req => !req.isRawMaterial);
  
  if (isLoading) {
    return (
      <div style={{ 
        padding: "16px", 
        textAlign: "center",
        color: theme.colors.textSecondary
      }}>
        Loading resource requirements...
      </div>
    );
  }
  
  if (!requirements.length) {
    return (
      <div style={{ 
        padding: "16px", 
        textAlign: "center",
        color: theme.colors.textSecondary
      }}>
        No resource requirements to display.
      </div>
    );
  }
  
  return (
    <div style={{ padding: "16px" }}>
      {/* Raw Materials */}
      {rawMaterials.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ 
            fontSize: "16px", 
            marginBottom: "8px",
            color: theme.colors.textPrimary
          }}>
            Raw Materials
          </h3>
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            gap: "8px" 
          }}>
            {rawMaterials.map(resource => (
              <ResourceRow
                key={resource.itemId}
                resource={resource}
                itemDetails={itemDetails[resource.itemId]}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Intermediates */}
      {intermediates.length > 0 && (
        <div>
          <h3 style={{ 
            fontSize: "16px", 
            marginBottom: "8px",
            color: theme.colors.textPrimary
          }}>
            Intermediate Products
          </h3>
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            gap: "8px" 
          }}>
            {intermediates.map(resource => (
              <ResourceRow
                key={resource.itemId}
                resource={resource}
                itemDetails={itemDetails[resource.itemId]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ResourceRowProps {
  resource: {
    itemId: string;
    name: string;
    amount: number;
    isRawMaterial: boolean;
  };
  itemDetails?: {
    name: string;
    icon: string;
  };
}

/**
 * ResourceRow component for displaying a single resource requirement
 */
const ResourceRow: React.FC<ResourceRowProps> = ({ 
  resource, 
  itemDetails 
}) => {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px",
      backgroundColor: theme.colors.backgroundAlt,
      borderRadius: theme.border.radius,
    }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "8px" 
      }}>
        {itemDetails?.icon && (
          <img 
            src={itemDetails.icon} 
            alt={itemDetails.name || resource.name} 
            style={{ 
              width: "24px", 
              height: "24px" 
            }} 
          />
        )}
        <span>{itemDetails?.name || resource.name}</span>
      </div>
      <div>
        <span style={{ fontWeight: "bold" }}>
          {resource.amount.toFixed(2)}
        </span>
        <span style={{ 
          marginLeft: "4px",
          color: theme.colors.textSecondary,
          fontSize: "14px"
        }}>
          items/min
        </span>
      </div>
    </div>
  );
};

export default React.memo(RequirementsOutput); 