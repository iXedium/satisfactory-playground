import React, { useState, useEffect, useCallback, ReactNode, createContext, useContext, useRef } from 'react';
import './accessibility.css';

interface KeyboardShortcut {
  key: string;
  modifiers?: ('alt' | 'ctrl' | 'shift' | 'meta')[];
  action: () => void;
  description: string;
}

interface AccessibilityContextType {
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string, modifiers?: ('alt' | 'ctrl' | 'shift' | 'meta')[]) => void;
  shortcuts: KeyboardShortcut[];
  focusMode: boolean;
  setFocusMode: (enabled: boolean) => void;
  highContrastMode: boolean;
  setHighContrastMode: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

/**
 * Hook to use accessibility features
 */
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

/**
 * Provider component for accessibility features like keyboard shortcuts,
 * focus mode, and high contrast mode
 */
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  // State for keyboard shortcuts
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  
  // State for focus and high contrast modes
  const [focusMode, setFocusMode] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  
  // Use a ref to hold the help action function that can access the latest shortcuts
  const getShortcutsHelpMessage = useRef(() => {
    return 'Keyboard shortcuts:\n' + 
      shortcuts.map(s => {
        const mods = s.modifiers?.join('+') || '';
        return `${mods ? mods + '+' : ''}${s.key}: ${s.description}`;
      }).join('\n');
  });

  // Update the ref function when shortcuts change
  useEffect(() => {
    getShortcutsHelpMessage.current = () => {
      return 'Keyboard shortcuts:\n' + 
        shortcuts.map(s => {
          const mods = s.modifiers?.join('+') || '';
          return `${mods ? mods + '+' : ''}${s.key}: ${s.description}`;
        }).join('\n');
    };
  }, [shortcuts]);
  
  // Register a keyboard shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      // Skip if shortcut already registered
      const exists = prev.some(s => 
        s.key === shortcut.key && 
        JSON.stringify(s.modifiers || []) === JSON.stringify(shortcut.modifiers || [])
      );
      
      if (exists) return prev;
      return [...prev, shortcut];
    });
  }, []);
  
  // Unregister a keyboard shortcut
  const unregisterShortcut = useCallback((key: string, modifiers?: ('alt' | 'ctrl' | 'shift' | 'meta')[]) => {
    setShortcuts(prev => prev.filter(s => 
      s.key !== key || 
      JSON.stringify(s.modifiers || []) !== JSON.stringify(modifiers || [])
    ));
  }, []);
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // For each registered shortcut
      shortcuts.forEach(shortcut => {
        const key = shortcut.key.toLowerCase();
        const modifiers = shortcut.modifiers || [];
        
        // Check if the key and all required modifiers match
        const keyMatches = event.key.toLowerCase() === key;
        const altMatches = modifiers.includes('alt') === event.altKey;
        const ctrlMatches = modifiers.includes('ctrl') === event.ctrlKey;
        const shiftMatches = modifiers.includes('shift') === event.shiftKey;
        const metaMatches = modifiers.includes('meta') === event.metaKey;
        
        // If all match and we're in a valid target (not an input/textarea unless explicitly allowed)
        if (keyMatches && altMatches && ctrlMatches && shiftMatches && metaMatches) {
          // Don't trigger shortcuts when typing in form elements unless it's an allowed key (like Escape)
          const isFormElement = 
            event.target instanceof HTMLInputElement || 
            event.target instanceof HTMLTextAreaElement ||
            (event.target as HTMLElement).isContentEditable;
          
          // Allow certain keys even in form elements
          const isAllowedInForm = ['escape', 'esc'].includes(key);
          
          if (!isFormElement || isAllowedInForm) {
            event.preventDefault();
            shortcut.action();
          }
        }
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
  
  // Apply high contrast mode
  useEffect(() => {
    if (highContrastMode) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  }, [highContrastMode]);
  
  // Apply focus mode
  useEffect(() => {
    if (focusMode) {
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }
  }, [focusMode]);
  
  // Register some common keyboard shortcuts
  useEffect(() => {
    // Help dialog
    registerShortcut({
      key: '?',
      description: 'Show keyboard shortcuts help',
      action: () => {
        // Use the ref function to get the updated message
        alert(getShortcutsHelpMessage.current());
      }
    });
    
    // Toggle high contrast mode
    registerShortcut({
      key: 'h',
      modifiers: ['alt', 'shift'],
      description: 'Toggle high contrast mode',
      action: () => setHighContrastMode(prev => !prev)
    });
    
    // Toggle focus mode
    registerShortcut({
      key: 'f',
      modifiers: ['alt', 'shift'],
      description: 'Toggle focus mode',
      action: () => setFocusMode(prev => !prev)
    });
    
    // Cleanup
    return () => {
      unregisterShortcut('?');
      unregisterShortcut('h', ['alt', 'shift']);
      unregisterShortcut('f', ['alt', 'shift']);
    };
  }, [registerShortcut, unregisterShortcut]);
  
  const contextValue = {
    registerShortcut,
    unregisterShortcut,
    shortcuts,
    focusMode,
    setFocusMode,
    highContrastMode,
    setHighContrastMode
  };
  
  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider; 