/**
 * ItemHeader Component
 * 
 * Displays the header section of an item node with icon, name, and amount.
 */

import React from "react";
import Icon from "../../shared/Icon";
import { Item } from "../../../types/core";
import { theme } from "../../../styles/theme";

export interface ItemHeaderProps {
  item: Item | null;
  amount: number;
  isRoot?: boolean;
  isByproduct?: boolean;
  isImport?: boolean;
  onIconClick?: () => void;
  onDelete?: () => void;
  onImport?: () => void;
}

const ItemHeader: React.FC<ItemHeaderProps> = ({
  item,
  amount,
  isRoot = false,
  isByproduct = false,
  isImport = false,
  onIconClick,
  onDelete,
  onImport,
}) => {
  // Format the amount for display
  const formattedAmount = Math.abs(amount).toFixed(2);
  
  // Choose the sign based on whether it's a byproduct or regular item
  const amountPrefix = isByproduct ? "-" : "";
  
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* Item icon */}
      <div
        onClick={onIconClick}
        style={{
          cursor: onIconClick ? "pointer" : "default",
          marginRight: "12px",
        }}
      >
        <Icon
          name={item?.id || ""}
          size="large"
          style={{ opacity: isImport ? 0.7 : 1 }}
        />
      </div>

      {/* Item name and details */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
          }}
        >
          {item?.name || "Unknown Item"}
          
          {/* Import indicator */}
          {isImport && (
            <span
              style={{
                fontSize: "12px",
                marginLeft: "8px",
                padding: "2px 6px",
                background: theme.colors.importBadge,
                borderRadius: "4px",
                color: theme.colors.text,
              }}
            >
              Imported
            </span>
          )}
        </div>

        {/* Amount display */}
        <div
          style={{
            fontSize: "14px",
            color: theme.colors.textSecondary,
          }}
        >
          {amountPrefix}{formattedAmount} per minute
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
        }}
      >
        {isRoot && onDelete && (
          <button
            onClick={onDelete}
            style={{
              background: theme.colors.deleteButton,
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              color: theme.colors.text,
              fontSize: "12px",
            }}
          >
            Delete
          </button>
        )}

        {!isRoot && !isImport && onImport && (
          <button
            onClick={onImport}
            style={{
              background: theme.colors.importButton,
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              color: theme.colors.text,
              fontSize: "12px",
            }}
          >
            Import
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(ItemHeader); 