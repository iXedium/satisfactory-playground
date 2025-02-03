import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface DropdownPortalProps {
  children: React.ReactNode;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose?: () => void;
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({ children, anchorEl, open, onClose }) => {
  const [portalContainer] = useState(() => document.createElement('div'));

  useEffect(() => {
    document.body.appendChild(portalContainer);
    return () => {
      document.body.removeChild(portalContainer);
    };
  }, [portalContainer]);

  useEffect(() => {
    if (anchorEl && open) {
      const rect = anchorEl.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      portalContainer.style.position = 'absolute';
      portalContainer.style.top = `${rect.bottom + scrollTop}px`;
      portalContainer.style.left = `${rect.left}px`;
      portalContainer.style.width = `${rect.width}px`;
      portalContainer.style.zIndex = '1500';
    }
  }, [anchorEl, open, portalContainer]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && 
          portalContainer && 
          !portalContainer.contains(event.target as Node) &&
          !anchorEl?.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, portalContainer, anchorEl, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(children, portalContainer);
};

export default DropdownPortal;
