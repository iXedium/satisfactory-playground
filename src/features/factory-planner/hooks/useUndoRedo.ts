import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTabDispatch } from '../../workspace/context/TabDispatchContext';
import { AppDispatch, RootState } from '../../../store';
import { undoAction, redoAction } from '../store/historyMiddleware';
import { clearHistory } from '../store/historySlice';
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
  const { tabDispatch: dispatch } = useTabDispatch();
  const tabId = useSelector((s: RootState) => s.workspace.activeTabId) || 'default';
  
  // Selectors (per-tab — read from planners[tabId].history)
  const planners = useSelector((s: RootState) => s.planners[tabId]);
  const canUndo = (planners?.history?.undoStack?.length ?? 0) > 0;
  const canRedo = (planners?.history?.redoStack?.length ?? 0) > 0;
  const lastUndoAction = canUndo ? planners!.history.undoStack[planners!.history.undoStack.length - 1]?.actionDescription ?? null : null;
  const lastRedoAction = canRedo ? planners!.history.redoStack[planners!.history.redoStack.length - 1]?.actionDescription ?? null : null;
  
  // Undo handler
  const handleUndo = useCallback(() => {
    if (canUndo) {
      logger.info('[useUndoRedo] Performing undo');
      dispatch(undoAction(tabId) as unknown as Parameters<typeof dispatch>[0]);
    }
  }, [dispatch, canUndo]);
  
  // Redo handler
  const handleRedo = useCallback(() => {
    if (canRedo) {
      logger.info('[useUndoRedo] Performing redo');
      dispatch(redoAction(tabId) as unknown as Parameters<typeof dispatch>[0]);
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
