import { getNamespacedKey } from '../../../../utils';
import { SavedPlannerState } from '../../hooks/usePlannerSaveLoad';

// In-memory registry for initial tab states (bypasses localStorage size limits)
const tabInitialStateMap = new Map<string, SavedPlannerState>();

export function setTabInitialState(tabId: string, state: SavedPlannerState): void {
  tabInitialStateMap.set(tabId, state);
}

export function getTabInitialState(tabId: string): SavedPlannerState | undefined {
  return tabInitialStateMap.get(tabId);
}

export function consumeTabInitialState(tabId: string): SavedPlannerState | undefined {
  const state = tabInitialStateMap.get(tabId);
  tabInitialStateMap.delete(tabId);
  return state;
}

/**
 * Removes all localStorage keys for a specific tab
 */
export function cleanupSingleTabState(tabId: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.includes(tabId)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('Failed to clean up tab storage for', tabId, e);
  }
}

/**
 * Scans localStorage and purges all tab-related keys belonging to tabs
 * that are no longer active, reclaiming valuable browser storage space.
 */
export function purgeOrphanedTabState(activeTabIds: string[]): void {
  try {
    const activeSet = new Set(activeTabIds);
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Matches lastSession_<tabId>_<baseKey>
      const sessionMatch = key.match(/^lastSession_([^_]+)_(.+)$/);
      if (sessionMatch) {
        const tabId = sessionMatch[1];
        if (!activeSet.has(tabId)) {
          keysToRemove.push(key);
        }
        continue;
      }

      // Matches plannerManualTreeOrder_<tabId>
      const manualOrderMatch = key.match(/^plannerManualTreeOrder_(.+)$/);
      if (manualOrderMatch) {
        const tabId = manualOrderMatch[1];
        if (!activeSet.has(tabId)) {
          keysToRemove.push(key);
        }
        continue;
      }

      // Matches activeSetupName_<tabId>
      const setupNameMatch = key.match(/^activeSetupName_(.+)$/);
      if (setupNameMatch) {
        const tabId = setupNameMatch[1];
        if (!activeSet.has(tabId)) {
          keysToRemove.push(key);
        }
        continue;
      }

      // Matches workspaceBaseline_<tabId>
      const baselineMatch = key.match(/^workspaceBaseline_(.+)$/);
      if (baselineMatch) {
        const tabId = baselineMatch[1];
        if (!activeSet.has(tabId)) {
          keysToRemove.push(key);
        }
        continue;
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('Failed to purge orphaned tab storage:', e);
  }
}

/**
 * Safely sets an item in localStorage, handling QuotaExceededError by purging
 * orphaned data and gracefully logging without throwing.
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Attempt emergency purge of orphaned data if quota exceeded
    try {
      // Find active tabs from workspaceState
      const stored = localStorage.getItem('workspaceState');
      const activeIds: string[] = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed?.tabs)) {
          activeIds.push(...parsed.tabs.map((t: { tabId: string }) => t.tabId));
        }
      }
      purgeOrphanedTabState(activeIds);
      localStorage.setItem(key, value);
    } catch {
      console.warn(`[localStorage] Quota exceeded while setting ${key}. In-memory state preserved.`);
    }
  }
}

export function cloneTabState(newTabId: string, state: SavedPlannerState): void {
  // Always register in-memory initial state first
  setTabInitialState(newTabId, state);

  try {
    safeSetItem(`workspaceBaseline_${newTabId}`, JSON.stringify(state));
    if (state.dependencies) {
      safeSetItem(getNamespacedKey('savedDependencies', newTabId), JSON.stringify(state.dependencies));
    }
    if (state.recipeSelections) {
      safeSetItem(getNamespacedKey('savedRecipeSelections', newTabId), JSON.stringify(state.recipeSelections));
    }
    if (state.nodeState) {
      if (state.nodeState.excessMap) {
        safeSetItem(getNamespacedKey('savedExcessMap', newTabId), JSON.stringify(state.nodeState.excessMap));
      }
      if (state.nodeState.machineCountMap) {
        safeSetItem(getNamespacedKey('savedMachineCountMap', newTabId), JSON.stringify(state.nodeState.machineCountMap));
      }
      if (state.nodeState.machineMultiplierMap) {
        safeSetItem(getNamespacedKey('savedMachineMultiplierMap', newTabId), JSON.stringify(state.nodeState.machineMultiplierMap));
      }
      if (state.nodeState.expandedNodes) {
        safeSetItem(getNamespacedKey('plannerExpandedNodes', newTabId), JSON.stringify(state.nodeState.expandedNodes));
      }
      if (state.nodeState.nodeExtensionOverrides) {
        safeSetItem(getNamespacedKey('plannerNodeExtensionOverrides', newTabId), JSON.stringify(state.nodeState.nodeExtensionOverrides));
      }
    }
    if (state.displayOptions) {
      if (state.displayOptions.viewDensity) {
        safeSetItem(getNamespacedKey('savedViewDensity', newTabId), state.displayOptions.viewDensity);
      }
      if (state.displayOptions.showExtensions !== undefined) {
        safeSetItem(getNamespacedKey('savedShowExtensions', newTabId), JSON.stringify(state.displayOptions.showExtensions));
      }
      if (state.displayOptions.accumulateExtensions !== undefined) {
        safeSetItem(getNamespacedKey('savedAccumulateExtensions', newTabId), JSON.stringify(state.displayOptions.accumulateExtensions));
      }
      if (state.displayOptions.showMachines !== undefined) {
        safeSetItem(getNamespacedKey('savedShowMachines', newTabId), JSON.stringify(state.displayOptions.showMachines));
      }
      if (state.displayOptions.showMachineMultiplier !== undefined) {
        safeSetItem(getNamespacedKey('savedShowMachineMultiplier', newTabId), JSON.stringify(state.displayOptions.showMachineMultiplier));
      }
      if (state.displayOptions.autoImport !== undefined) {
        safeSetItem(getNamespacedKey('plannerAutoImport', newTabId), JSON.stringify(state.displayOptions.autoImport));
      }
    }
    if (state.sortOptions) {
      if (state.sortOptions.key) {
        safeSetItem(getNamespacedKey('plannerTreeSortKey', newTabId), state.sortOptions.key);
      }
      if (state.sortOptions.direction) {
        safeSetItem(getNamespacedKey('plannerTreeSortDirection', newTabId), state.sortOptions.direction);
      }
    }
    if (state.manualTreeOrder) {
      safeSetItem(`plannerManualTreeOrder_${newTabId}`, JSON.stringify(state.manualTreeOrder));
    }
    if (state.comparison) {
      safeSetItem(getNamespacedKey('savedComparison', newTabId), JSON.stringify(state.comparison));
    } else {
      localStorage.removeItem(getNamespacedKey('savedComparison', newTabId));
    }
    localStorage.removeItem(`activeSetupName_${newTabId}`);
  } catch (e) {
    console.warn('Failed to clone tab state into localStorage (in-memory state preserved):', e);
  }
}

export function getDuplicateTabName(originalName: string, existingNames: string[]): string {
  const copyMatch = originalName.match(/^(.*?)(?: \(Copy(?: (\d+))?\))?$/);
  const baseName = copyMatch ? copyMatch[1] : originalName;

  const firstTry = `${baseName} (Copy)`;
  if (!existingNames.some(n => n.toLowerCase() === firstTry.toLowerCase())) {
    return firstTry;
  }

  let counter = 2;
  while (existingNames.some(n => n.toLowerCase() === `${baseName} (Copy ${counter})`.toLowerCase())) {
    counter++;
  }
  return `${baseName} (Copy ${counter})`;
}
