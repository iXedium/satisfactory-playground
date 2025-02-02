import { CSSProperties, memo } from 'react';
import { useEffect, useState } from 'react';
import { getIconForItem } from '../data/dbQueries';
import { iconStyles } from '../styles/iconStyles';

interface IconProps {
  itemId: string;
  showWrapper?: boolean;
  style?: CSSProperties;
  className?: string;
  color?: string;
}

const Icon = memo(({ 
  itemId, 
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

  const iconElement = (
    <div
      style={{
        ...iconStyles.icon,
        background: `url('/icons.webp') ${icon.position}`,
        backgroundSize: "896px 960px",
        width: "32px",
        height: "32px",
        ...style
      }}
      className={className}
    />
  );

  if (!showWrapper) return iconElement;

  return (
    <div style={{ ...iconStyles.iconWrapper, color }}>
      {iconElement}
    </div>
  );
});

Icon.displayName = 'Icon';

export default Icon;
