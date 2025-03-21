/**
 * ItemFooter Component
 * 
 * Displays the footer section of an item node with action buttons.
 */

import React from "react";
import { Button } from "../../../components/common";
import { theme } from "../../../styles/theme";

export interface ItemFooterProps {
  isRoot?: boolean;
  isImport?: boolean;
  onDelete?: () => void;
  onImport?: () => void;
}

/**
 * ItemFooter component for displaying footer actions
 */
const ItemFooter: React.FC<ItemFooterProps> = ({
  isRoot = false,
  isImport = false,
  onDelete,
  onImport,
}) => {
  // Only render if we have action buttons to show
  const shouldRender = (isRoot && onDelete) || (!isRoot && !isImport && onImport);
  
  if (!shouldRender) {
    return null;
  }
  
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "8px 12px",
        borderTop: `1px solid ${theme.colors.border}`,
        gap: "8px",
      }}
    >
      {/* Delete button for root nodes */}
      {isRoot && onDelete && (
        <Button
          variant="danger"
          size="small"
          onClick={onDelete}
        >
          Delete Chain
        </Button>
      )}
      
      {/* Import button for regular nodes */}
      {!isRoot && !isImport && onImport && (
        <Button
          variant="secondary"
          size="small"
          onClick={onImport}
        >
          Import
        </Button>
      )}
    </div>
  );
};

export default React.memo(ItemFooter); 