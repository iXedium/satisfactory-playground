import { CSSProperties, memo } from 'react';
import { useEffect, useState } from 'react';
import { getIconForItem } from '../data/dbQueries';
import { iconStyles } from '../styles/iconStyles';

// The sprite sheet contains 64x64 icons
const SPRITE_ICON_SIZE = 64;
const SPRITE_SHEET_COLS = 14; // 896/64
const SPRITE_SHEET_ROWS = 15; // 960/64

export type IconSize = "tiny" | "small" | "medium" | "large";

const sizeMap: Record<IconSize, number> = {
  tiny: 16,
  small: 32,
  medium: 48,
  large: 64
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
  const [icon, setIcon] = useState<any>(null);

  useEffect(() => {
    getIconForItem(itemId).then(setIcon);
  }, [itemId]);

  if (!icon) return null;

  const dimension = sizeMap[size];
  
  const iconElement = (
    <div
      style={{
        ...iconStyles.icon,
        background: `url('/icons.webp') ${icon.position}`,
        backgroundSize: `${SPRITE_SHEET_COLS * SPRITE_ICON_SIZE}px ${SPRITE_SHEET_ROWS * SPRITE_ICON_SIZE}px`,
        width: `${dimension}px`,
        height: `${dimension}px`,
        backgroundRepeat: 'no-repeat',
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
        width: `${dimension + 8}px`, // Add some padding
        height: `${dimension + 8}px`,
      }}
    >
      {iconElement}
    </div>
  );
});

Icon.displayName = 'Icon';

export default Icon;
