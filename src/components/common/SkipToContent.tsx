import React from 'react';

interface SkipToContentProps {
  mainContentId: string;
  label?: string;
}

/**
 * Provides a skip link for keyboard users to bypass navigation
 * and jump directly to the main content
 * 
 * This component should be placed at the beginning of the page, before navigation elements.
 */
const SkipToContent: React.FC<SkipToContentProps> = ({
  mainContentId,
  label = 'Skip to main content'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Find main content element
    const mainContent = document.getElementById(mainContentId);
    
    if (mainContent) {
      // Focus the element
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      
      // Scroll to it
      mainContent.scrollIntoView();
      
      // Remove tabindex after focus
      setTimeout(() => {
        mainContent.removeAttribute('tabindex');
      }, 1000);
    }
  };

  return (
    <a 
      href={`#${mainContentId}`}
      className="skip-to-content"
      onClick={handleClick}
    >
      {label}
    </a>
  );
};

export default SkipToContent; 