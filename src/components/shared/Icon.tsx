/**
 * Icon Component
 * 
 * Renders item icons with appropriate sizing and styling.
 * This is a reusable component used across the application.
 */

import React from "react";
import { theme } from "../../styles/theme";

export type IconSize = "small" | "medium" | "large";

export interface IconProps {
  name: string;
  size?: IconSize;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Get the pixel size based on the size name
 */
const getSizeInPixels = (size: IconSize): number => {
  switch (size) {
    case "small":
      return 24;
    case "medium":
      return 32;
    case "large":
      return 40;
    default:
      return 32;
  }
};

/**
 * Icon component for displaying item icons
 */
const Icon: React.FC<IconProps> = ({
  name,
  size = "medium",
  style,
  onClick,
}) => {
  // Skip rendering for empty names
  if (!name) {
    return null;
  }

  const sizeInPixels = getSizeInPixels(size);
  
  // Get the icon URL based on the name
  const getIconUrl = (itemName: string) => {
    try {
      // Replace special characters
      const sanitizedName = itemName.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
      return `/icons/${sanitizedName}.png`;
    } catch (e) {
      console.error(`Error generating icon URL for ${itemName}:`, e);
      return "";
    }
  };

  return (
    <div
      style={{
        width: `${sizeInPixels}px`,
        height: `${sizeInPixels}px`,
        borderRadius: theme.border.radius,
        background: theme.colors.iconBackground,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onClick={onClick}
    >
      <img
        src={getIconUrl(name)}
        alt={name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        onError={(e) => {
          // If the image fails to load, show a fallback
          (e.target as HTMLImageElement).src = "/icons/unknown.png";
        }}
      />
    </div>
  );
};

export default React.memo(Icon); 