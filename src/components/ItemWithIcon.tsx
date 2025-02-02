import React, { useEffect, useState } from "react";
import { getItemById } from "../data/dbQueries";
import { iconStyles } from "../styles/iconStyles";
import Icon from "./Icon";

interface ItemWithIconProps {
  itemId: string;
  showName?: boolean;
  amount?: number;
  color?: string;
}

const ItemWithIcon: React.FC<ItemWithIconProps> = ({ itemId, showName = true, amount, color = "inherit" }) => {
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    getItemById(itemId).then(setItem);
  }, [itemId]);

  if (!item) return null;

  return (
    <div style={{ ...iconStyles.container, color }}>
      <Icon itemId={itemId} color={color} />
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
