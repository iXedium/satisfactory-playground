import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { useEffect, useState } from 'react';
import { getIconForItem } from '../data/dbQueries';
import { iconStyles } from '../styles/iconStyles';
// Original sprite dimensions
const ORIGINAL_ICON_SIZE = 64;
const ORIGINAL_SHEET_WIDTH = 896; // 14 * 64
const ORIGINAL_SHEET_HEIGHT = 960; // 15 * 64
const sizeMap = {
    tiny: 16, // Quarter size
    small: 32, // Half size
    medium: 48, // Three-quarters size
    large: 64 // Original size
};
const Icon = memo(({ itemId, size = "tiny", showWrapper = true, style, className, color = "inherit", wrapperPadding = 4 // default padding in pixels
 }) => {
    const [icon, setIcon] = useState(null);
    useEffect(() => {
        getIconForItem(itemId).then(iconData => setIcon(iconData || null));
    }, [itemId]);
    if (!icon)
        return null;
    const targetSize = sizeMap[size];
    const scale = targetSize / ORIGINAL_ICON_SIZE;
    // Parse the original position (e.g., "-64px -128px")
    const [origX, origY] = icon.position.split(' ').map((pos) => parseInt(pos));
    // Compute the scaled background properties
    const scaledX = origX * scale;
    const scaledY = origY * scale;
    const scaledSheetWidth = ORIGINAL_SHEET_WIDTH * scale;
    const scaledSheetHeight = ORIGINAL_SHEET_HEIGHT * scale;
    // Render the icon element with proper background settings; note: do not set position here.
    const iconElement = (_jsx("div", { style: {
            width: `${targetSize}px`,
            height: `${targetSize}px`,
            backgroundImage: `url('/icons.webp')`,
            backgroundSize: `${scaledSheetWidth}px ${scaledSheetHeight}px`,
            backgroundPosition: `${scaledX}px ${scaledY}px`,
            imageRendering: 'pixelated',
            ...style
        }, className: className, title: itemId }));
    if (!showWrapper)
        return iconElement;
    return (_jsx("div", { style: {
            ...iconStyles.iconWrapper,
            color,
            width: `${targetSize + 2 * wrapperPadding}px`,
            height: `${targetSize + 2 * wrapperPadding}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${wrapperPadding}px`,
            overflow: 'hidden'
        }, children: iconElement }));
});
Icon.displayName = 'Icon';
export default Icon;
