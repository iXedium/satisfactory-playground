import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../../../store';
import { 
  selectCanUndo, 
  selectCanRedo,
  selectLastUndoAction,
  selectLastRedoAction,
  clearHistory,
} from '../store/historySlice';
import { undoAction, redoAction } from '../store/historyMiddleware';
import { logger } from '../../../utils/logger';

/**
 * Hook that provides undo/redo functionality with keyboard shortcuts.
 * 
 * Keyboard shortcuts:
 * - Ctrl+Z: Undo
 * - Ctrl+Shift+Z or Ctrl+Y: Redo
 * 
 * @param enableKeyboardShortcuts - Whether to enable keyboard shortcuts (default: true)
 * @returns Object with undo/redo state and handlers
 */
export function useUndoRedo(enableKeyboardShortcuts: boolean = true) {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const lastUndoAction = useSelector(selectLastUndoAction);
  const lastRedoAction = useSelector(selectLastRedoAction);
  
  // Undo handler
  const handleUndo = useCallback(() => {
    if (canUndo) {
      logger.info('[useUndoRedo] Performing undo');
      dispatch(undoAction() as unknown as Parameters<typeof dispatch>[0]);
    }
  }, [dispatch, canUndo]);
  
  // Redo handler
  const handleRedo = useCallback(() => {
    if (canRedo) {
      logger.info('[useUndoRedo] Performing redo');
      dispatch(redoAction() as unknown as Parameters<typeof dispatch>[0]);
    }
  }, [dispatch, canRedo]);
  
  // Clear history handler
  const handleClearHistory = useCallback(() => {
    dispatch(clearHistory());
  }, [dispatch]);
  
  // Keyboard shortcut handler
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      
      // Skip if in input field (let native undo/redo work)
      if (isInputField) {
        return;
      }
      
      // Check for Ctrl/Cmd key
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (!isCtrlOrCmd) return;
      
      // Ctrl+Z: Undo
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }
      
      // Ctrl+Shift+Z: Redo
      if (event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
        return;
      }
      
      // Ctrl+Y: Redo (alternative)
      if (event.key === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardShortcuts, handleUndo, handleRedo]);
  
  return {
    // State
    canUndo,
    canRedo,
    lastUndoAction,
    lastRedoAction,
    
    // Actions
    undo: handleUndo,
    redo: handleRedo,
    clearHistory: handleClearHistory,
  };
}

export default useUndoRedo;
