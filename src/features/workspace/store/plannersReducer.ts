import { combineReducers } from '@reduxjs/toolkit';
import dependencyReducer from '../../factory-planner/store/dependencySlice';
import recipeSelectionsReducer from '../../factory-planner/store/recipeSelectionsSlice';
import historyReducer from '../../factory-planner/store/historySlice';
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

const tabReducer = combineReducers({
  dependencies: dependencyReducer as any,
  recipeSelections: recipeSelectionsReducer as any,
  history: historyReducer as any,
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
