import React, { useEffect, useState } from "react";
import { getItemById } from "../data/dbQueries";
import { iconStyles } from "../styles/iconStyles";
import Icon, { IconSize } from "./Icon";

interface ItemWithIconProps {
  itemId: string;
  showName?: boolean;
  amount?: number;
  color?: string;
  size?: IconSize;
}

const ItemWithIcon: React.FC<ItemWithIconProps> = ({
  itemId,
  showName = true,
  amount,
  color = "inherit",
  size = "small"
}) => {
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    getItemById(itemId).then(setItem);
  }, [itemId]);

  if (!item) return null;

  return (
    <div style={{ ...iconStyles.container, color }}>
      <Icon itemId={itemId} color={color}
        size={size}
        wrapperPadding={1}
      />
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
