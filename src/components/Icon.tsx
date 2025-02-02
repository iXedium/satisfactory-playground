import { CSSProperties, memo } from 'react';
import { useEffect, useState } from 'react';
import { getIconForItem } from '../data/dbQueries';
import { iconStyles } from '../styles/iconStyles';
import { Icon as IconType } from '../data/dexieDB';

// Original sprite dimensions
const ORIGINAL_ICON_SIZE = 64;
const ORIGINAL_SHEET_WIDTH = 896;  // 14 * 64
const ORIGINAL_SHEET_HEIGHT = 960; // 15 * 64

export type IconSize = "tiny" | "small" | "medium" | "large";

const sizeMap: Record<IconSize, number> = {
  tiny: 16,    // Quarter size
  small: 32,   // Half size
  medium: 48,  // Three-quarters size
  large: 64    // Original size
};

interface IconProps {
  itemId: string;
  size?: IconSize;
  showWrapper?: boolean;
  style?: CSSProperties;
  className?: string;
  color?: string;
}

const Icon = memo(({ 
  itemId, 
  size = "small",
  showWrapper = true, 
  style, 
  className,
  color = "inherit"
}: IconProps) => {
  const [icon, setIcon] = useState<IconType | null>(null);

  useEffect(() => {
    getIconForItem(itemId).then(iconData => setIcon(iconData || null));
  }, [itemId]);

  if (!icon) return null;

  const targetSize = sizeMap[size];
  const scale = targetSize / ORIGINAL_ICON_SIZE;
  
  // Parse the position string (e.g. "-64px -128px" -> [-64, -128])
  const [x, y] = icon.position.split(' ').map((pos: string) => parseInt(pos));
  
  // Scale the position based on our target size
  const scaledX = x * scale;
  const scaledY = y * scale;
  
  const scaledSheetWidth = ORIGINAL_SHEET_WIDTH * scale;
  const scaledSheetHeight = ORIGINAL_SHEET_HEIGHT * scale;

  const iconElement = (
    <div
      style={{
        ...iconStyles.icon,
        width: `${targetSize}px`,
        height: `${targetSize}px`,
        backgroundImage: `url('/icons.webp')`,
        backgroundPosition: `${scaledX}px ${scaledY}px`,
        backgroundSize: `${scaledSheetWidth}px ${scaledSheetHeight}px`,
        imageRendering: 'pixelated',
        ...style
      }}
      className={className}
      title={itemId}
    />
  );

  if (!showWrapper) return iconElement;

  return (
    <div 
      style={{ 
        ...iconStyles.iconWrapper,
        color,
        width: `${targetSize + 8}px`,
        height: `${targetSize + 8}px`,
      }}
    >
      {iconElement}
    </div>
  );
});

Icon.displayName = 'Icon';

export default Icon;
