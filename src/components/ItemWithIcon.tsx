import React, { useEffect, useState } from "react";
import { getIconForItem, getItemById } from "../data/dbQueries";
import { iconStyles } from "../styles/iconStyles";

interface ItemWithIconProps {
  itemId: string;
  showName?: boolean;
  amount?: number;
  color?: string;
}

const ItemWithIcon: React.FC<ItemWithIconProps> = ({ itemId, showName = true, amount, color = "inherit" }) => {
  const [item, setItem] = useState<any>(null);
  const [icon, setIcon] = useState<any>(null);

  useEffect(() => {
    getItemById(itemId).then(setItem);
    getIconForItem(itemId).then(setIcon);
  }, [itemId]);

  if (!item || !icon) return null;

  return (
    <div style={{ ...iconStyles.container, color }}>
      <div style={iconStyles.iconWrapper}>
        <div
          style={{
            ...iconStyles.icon,
            background: `url('/icons.webp') ${icon.position}`,
            backgroundSize: "896px 960px", // Full sprite sheet size
            width: "32px",
            height: "32px",
          }}
        />
      </div>
      {showName && (
        <span>
          {item.name}
          {amount !== undefined && `: ${amount.toFixed(2)}`}
        </span>
      )}
    </div>
  );
};

export default ItemWithIcon;
