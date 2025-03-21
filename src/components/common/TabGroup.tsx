import React, { useState, useEffect } from 'react';

export interface Tab {
  /**
   * Unique ID for the tab
   */
  id: string;
  
  /**
   * Label to display for the tab
   */
  label: React.ReactNode;
  
  /**
   * Content to display when tab is active
   */
  content: React.ReactNode;
  
  /**
   * Whether the tab is disabled
   */
  disabled?: boolean;
  
  /**
   * Icon to display with the tab label
   */
  icon?: React.ReactNode;
}

export interface TabGroupProps {
  /**
   * Array of tabs
   */
  tabs: Tab[];
  
  /**
   * ID of the active tab
   */
  activeTab?: string;
  
  /**
   * Callback when active tab changes
   */
  onChange?: (tabId: string) => void;
  
  /**
   * Variant of the tab group
   */
  variant?: 'default' | 'boxed' | 'underlined';
  
  /**
   * Additional class name for the tab group
   */
  className?: string;
}

/**
 * TabGroup component for organizing content into tabs
 */
export const TabGroup: React.FC<TabGroupProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  className = '',
}) => {
  const [selectedTabId, setSelectedTabId] = useState<string>(
    activeTab || (tabs.length > 0 ? tabs[0].id : '')
  );
  
  // Update selected tab when activeTab changes
  useEffect(() => {
    if (activeTab) {
      setSelectedTabId(activeTab);
    }
  }, [activeTab]);
  
  // Handle tab selection
  const handleTabClick = (tab: Tab) => {
    if (tab.disabled) return;
    
    setSelectedTabId(tab.id);
    
    if (onChange) {
      onChange(tab.id);
    }
  };
  
  // Get the active tab
  const activeTabContent = tabs.find(tab => tab.id === selectedTabId)?.content;
  
  // Get styles based on variant
  const getTabStyles = () => {
    switch (variant) {
      case 'boxed':
        return {
          container: 'border border-gray-200 rounded',
          tabList: 'flex border-b border-gray-200 bg-gray-50 rounded-t',
          tab: (isActive: boolean, isDisabled: boolean) => `
            px-4 py-2 text-sm font-medium
            ${isActive 
              ? 'bg-white text-blue-600 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'}
            ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
          `,
          content: 'p-4',
        };
      
      case 'underlined':
        return {
          container: '',
          tabList: 'flex border-b border-gray-200',
          tab: (isActive: boolean, isDisabled: boolean) => `
            px-4 py-2 -mb-px text-sm font-medium
            ${isActive 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
          `,
          content: 'py-4',
        };
      
      // default
      default:
        return {
          container: '',
          tabList: 'flex mb-4 space-x-1',
          tab: (isActive: boolean, isDisabled: boolean) => `
            px-4 py-2 text-sm font-medium rounded-md
            ${isActive 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `,
          content: '',
        };
    }
  };
  
  const styles = getTabStyles();
  
  return (
    <div className={`tab-group ${className}`}>
      <div className={styles.container}>
        <div className={styles.tabList} role="tablist">
          {tabs.map(tab => {
            const isActive = tab.id === selectedTabId;
            const isDisabled = tab.disabled || false;
            
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-disabled={isDisabled}
                className={styles.tab(isActive, isDisabled)}
                onClick={() => handleTabClick(tab)}
              >
                {tab.icon && (
                  <span className="mr-2">{tab.icon}</span>
                )}
                {tab.label}
              </div>
            );
          })}
        </div>
        
        <div className={styles.content} role="tabpanel">
          {activeTabContent}
        </div>
      </div>
    </div>
  );
};

export default TabGroup; 