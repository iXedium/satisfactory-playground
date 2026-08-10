import { combineReducers } from '@reduxjs/toolkit';
import dependencyReducer from '../../factory-planner/store/dependencySlice';
import recipeSelectionsReducer from '../../factory-planner/store/recipeSelectionsSlice';
import comparisonReducer from '../../factory-planner/store/comparisonSlice';
import treeUiReducer from '../../factory-planner/store/treeUiSlice';
import { PlannerState, createEmptyPlannerState } from './plannerState';

const activeOperationsReducer = (state: any = {}, action: any) => {
  if (action.type === '_planner/beginOperation') {
    const { operationId, description } = action.payload || {};
    return { ...state, [operationId]: { description, startedAt: Date.now() } };
  }
  if (action.type === '_planner/endOperation') {
    const { operationId } = action.payload || {};
    const next = { ...state };
    delete next[operationId];
    return next;
  }
  return state;
};

// Per-tab history handlers (separate action types to avoid double-dispatch
// with the root-level historySlice). These receive the tab's sub-state `s`.
const perTabHistoryReducer = (s: any = {}, action: any): any => {
  if (action.type === '_planner/pushSnapshot') {
    const snapshot = action.payload?.snapshot;
    if (!snapshot) return s;
    if (s.isRestoring) return s;
    const undoStack = [...(s.undoStack || []), snapshot];
    if (undoStack.length > (s.maxStackSize || 50)) undoStack.shift();
    return { ...s, undoStack, redoStack: [], canUndo: true, canRedo: false };
  }
  if (action.type === '_planner/undoStackPop') {
    const { currentSnapshot } = action.payload || {};
    const undo = [...(s.undoStack || [])];
    if (undo.length === 0) return s;
    undo.pop();
    const redo = [...(s.redoStack || [])];
    if (currentSnapshot) redo.push(currentSnapshot);
    return { ...s, undoStack: undo, redoStack: redo, canUndo: undo.length > 0, canRedo: true };
  }
  if (action.type === '_planner/redoStackPop') {
    const { currentSnapshot } = action.payload || {};
    const redo = [...(s.redoStack || [])];
    if (redo.length === 0) return s;
    redo.pop();
    const undo = [...(s.undoStack || [])];
    if (currentSnapshot) undo.push(currentSnapshot);
    return { ...s, undoStack: undo, redoStack: redo, canUndo: true, canRedo: redo.length > 0 };
  }
  if (action.type === '_planner/setRestoring') {
    return { ...s, isRestoring: !!action.payload?.value };
  }
  return s;
};

const tabReducer = combineReducers({
  dependencies: dependencyReducer as any,
  recipeSelections: recipeSelectionsReducer as any,
  history: perTabHistoryReducer as any,
  comparison: comparisonReducer as any,
  treeUi: treeUiReducer as any,
  activeOperations: activeOperationsReducer as any,
});

export type PlannersRoot = Record<string, PlannerState>;

export function plannersReducer(state: PlannersRoot = {}, action: any): PlannersRoot {
  const tabId = action?.meta?.tabId;
  if (!tabId) return state;

  const existing = state[tabId] || createEmptyPlannerState();
  const updated = tabReducer(existing, action);

  if (updated === existing) return state;
  return { ...state, [tabId]: updated as PlannerState };
}
