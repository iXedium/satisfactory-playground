import { getNamespacedKey } from '../../../../utils';
import { SavedPlannerState } from '../../hooks/usePlannerSaveLoad';

export function cloneTabState(newTabId: string, state: SavedPlannerState): void {
  try {
    if (state.dependencies) {
      localStorage.setItem(getNamespacedKey('savedDependencies', newTabId), JSON.stringify(state.dependencies));
    }
    if (state.recipeSelections) {
      localStorage.setItem(getNamespacedKey('savedRecipeSelections', newTabId), JSON.stringify(state.recipeSelections));
    }
    if (state.nodeState) {
      if (state.nodeState.excessMap) {
        localStorage.setItem(getNamespacedKey('savedExcessMap', newTabId), JSON.stringify(state.nodeState.excessMap));
      }
      if (state.nodeState.machineCountMap) {
        localStorage.setItem(getNamespacedKey('savedMachineCountMap', newTabId), JSON.stringify(state.nodeState.machineCountMap));
      }
      if (state.nodeState.machineMultiplierMap) {
        localStorage.setItem(getNamespacedKey('savedMachineMultiplierMap', newTabId), JSON.stringify(state.nodeState.machineMultiplierMap));
      }
      if (state.nodeState.expandedNodes) {
        localStorage.setItem(getNamespacedKey('plannerExpandedNodes', newTabId), JSON.stringify(state.nodeState.expandedNodes));
      }
      if (state.nodeState.nodeExtensionOverrides) {
        localStorage.setItem(getNamespacedKey('plannerNodeExtensionOverrides', newTabId), JSON.stringify(state.nodeState.nodeExtensionOverrides));
      }
    }
    if (state.displayOptions) {
      if (state.displayOptions.viewDensity) {
        localStorage.setItem(getNamespacedKey('savedViewDensity', newTabId), state.displayOptions.viewDensity);
      }
      if (state.displayOptions.showExtensions !== undefined) {
        localStorage.setItem(getNamespacedKey('savedShowExtensions', newTabId), JSON.stringify(state.displayOptions.showExtensions));
      }
      if (state.displayOptions.accumulateExtensions !== undefined) {
        localStorage.setItem(getNamespacedKey('savedAccumulateExtensions', newTabId), JSON.stringify(state.displayOptions.accumulateExtensions));
      }
      if (state.displayOptions.showMachines !== undefined) {
        localStorage.setItem(getNamespacedKey('savedShowMachines', newTabId), JSON.stringify(state.displayOptions.showMachines));
      }
      if (state.displayOptions.showMachineMultiplier !== undefined) {
        localStorage.setItem(getNamespacedKey('savedShowMachineMultiplier', newTabId), JSON.stringify(state.displayOptions.showMachineMultiplier));
      }
      if (state.displayOptions.autoImport !== undefined) {
        localStorage.setItem(getNamespacedKey('plannerAutoImport', newTabId), JSON.stringify(state.displayOptions.autoImport));
      }
    }
    if (state.sortOptions) {
      if (state.sortOptions.key) {
        localStorage.setItem(getNamespacedKey('plannerTreeSortKey', newTabId), state.sortOptions.key);
      }
      if (state.sortOptions.direction) {
        localStorage.setItem(getNamespacedKey('plannerTreeSortDirection', newTabId), state.sortOptions.direction);
      }
    }
    if (state.manualTreeOrder) {
      localStorage.setItem(`plannerManualTreeOrder_${newTabId}`, JSON.stringify(state.manualTreeOrder));
    }
    if (state.comparison) {
      localStorage.setItem(getNamespacedKey('savedComparison', newTabId), JSON.stringify(state.comparison));
    } else {
      localStorage.removeItem(getNamespacedKey('savedComparison', newTabId));
    }
    localStorage.removeItem(`activeSetupName_${newTabId}`);
  } catch (e) {
    console.error('Failed to clone tab state into localStorage:', e);
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
