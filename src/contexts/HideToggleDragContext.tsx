import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface HideToggleDragState {
  isDragging: boolean;
  targetHiddenState: boolean | null; // The state we're toggling TO
}

interface HideToggleDragContextValue {
  state: HideToggleDragState;
  startDrag: (targetHiddenState: boolean) => void;
  endDrag: () => void;
  registerButton: (nodeId: string, isHidden: boolean, onToggle: () => void) => void;
  unregisterButton: (nodeId: string) => void;
  handleButtonEnter: (nodeId: string) => void;
}

const HideToggleDragContext = createContext<HideToggleDragContextValue | null>(null);

export const useHideToggleDrag = () => {
  const context = useContext(HideToggleDragContext);
  if (!context) {
    throw new Error('useHideToggleDrag must be used within a HideToggleDragProvider');
  }
  return context;
};

interface ButtonRegistration {
  isHidden: boolean;
  onToggle: () => void;
}

export const HideToggleDragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HideToggleDragState>({
    isDragging: false,
    targetHiddenState: null,
  });
  
  // Track which buttons have been toggled during this drag session
  const toggledDuringDrag = useRef<Set<string>>(new Set());
  
  // Registry of all hide buttons
  const buttonsRef = useRef<Map<string, ButtonRegistration>>(new Map());

  const startDrag = useCallback((targetHiddenState: boolean) => {
    toggledDuringDrag.current.clear();
    setState({
      isDragging: true,
      targetHiddenState,
    });
  }, []);

  const endDrag = useCallback(() => {
    toggledDuringDrag.current.clear();
    setState({
      isDragging: false,
      targetHiddenState: null,
    });
  }, []);

  const registerButton = useCallback((nodeId: string, isHidden: boolean, onToggle: () => void) => {
    buttonsRef.current.set(nodeId, { isHidden, onToggle });
  }, []);

  const unregisterButton = useCallback((nodeId: string) => {
    buttonsRef.current.delete(nodeId);
    toggledDuringDrag.current.delete(nodeId);
  }, []);

  const handleButtonEnter = useCallback((nodeId: string) => {
    if (!state.isDragging || state.targetHiddenState === null) return;
    if (toggledDuringDrag.current.has(nodeId)) return;
    
    const button = buttonsRef.current.get(nodeId);
    if (!button) return;
    
    // Only toggle if the button's current state is opposite to target
    if (button.isHidden !== state.targetHiddenState) {
      button.onToggle();
      toggledDuringDrag.current.add(nodeId);
    }
  }, [state.isDragging, state.targetHiddenState]);

  // Global mouseup listener to end drag
  useEffect(() => {
    const handleMouseUp = () => {
      if (state.isDragging) {
        endDrag();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [state.isDragging, endDrag]);

  return (
    <HideToggleDragContext.Provider
      value={{
        state,
        startDrag,
        endDrag,
        registerButton,
        unregisterButton,
        handleButtonEnter,
      }}
    >
      {children}
    </HideToggleDragContext.Provider>
  );
};
