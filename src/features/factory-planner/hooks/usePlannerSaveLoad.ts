/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logger } from '../../../utils/logger';
import { RootState, AppDispatch } from '../../../store';
import { DependencyNode, Recipe } from '../../../types';
import { loadSavedState, loadRecipeSelections } from '../store';
import { usePlannerNodeState } from './usePlannerNodeState';
import { usePlannerDisplayOptions, ViewDensity } from './usePlannerDisplayOptions';
import { TreeSortKey, SortDirection } from './useFactoryPlanner';
import { DependencyState } from '../store';
import _isEqual from 'lodash/isEqual';
import { useDebouncedCallback } from 'use-debounce';
import { saveService } from '../../../services/saveService';

interface SavedPlannerState {
    dependencies: DependencyState;
    recipeSelections: Record<string, string>;
    nodeState: {
        excessMap: Record<string, number>;
        machineCountMap: Record<string, number>;
        machineMultiplierMap: Record<string, number>;
        expandedNodes: Record<string, boolean>;
        nodeExtensionOverrides: Record<string, boolean>;
    };
    displayOptions: {
        viewDensity: string;
        showExtensions: boolean;
        accumulateExtensions: boolean;
        showMachines: boolean;
        showMachineMultiplier: boolean;
        autoImport: boolean;
    };
    sortOptions: {
        key: string;
        direction: string;
    };
    manualTreeOrder: string[];
}

export interface UsePlannerSaveLoadResult {
    getSaveNames: () => string[];
    saveSetup: (name: string) => Promise<void>;
    loadSetup: (name: string) => Promise<void>;
    deleteSetup: (name: string) => Promise<void>;
    isDirty: boolean;
    activeSetupName: string | null;
    saveError: string | null;
    clearSaveError: () => void;
}

interface UsePlannerSaveLoadProps {
    setExcessMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setMachineCountMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setMachineMultiplierMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setNodeExtensionOverrides: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setViewDensity: React.Dispatch<React.SetStateAction<ViewDensity>>;
    setShowExtensions: React.Dispatch<React.SetStateAction<boolean>>;
    setAccumulateExtensions: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMachines: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMachineMultiplier: React.Dispatch<React.SetStateAction<boolean>>;
    setAutoImport: React.Dispatch<React.SetStateAction<boolean>>;
    setTreeSortKey: React.Dispatch<React.SetStateAction<TreeSortKey>>;
    setTreeSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
    setManualTreeOrder: React.Dispatch<React.SetStateAction<string[]>>;
    currentExcessMap: Record<string, number>;
    currentMachineCountMap: Record<string, number>;
    currentMachineMultiplierMap: Record<string, number>;
    currentExpandedNodes: Record<string, boolean>;
    currentNodeExtensionOverrides: Record<string, boolean>;
    currentViewDensity: ViewDensity;
    currentShowExtensions: boolean;
    currentAccumulateExtensions: boolean;
    currentShowMachines: boolean;
    currentShowMachineMultiplier: boolean;
    currentAutoImport: boolean;
    currentTreeSortKey: TreeSortKey;
    currentTreeSortDirection: SortDirection;
    currentManualTreeOrder: string[];
}


export const usePlannerSaveLoad = ({
    setExcessMap,
    setMachineCountMap,
    setMachineMultiplierMap,
    setExpandedNodes,
    setNodeExtensionOverrides,
    setViewDensity,
    setShowExtensions,
    setAccumulateExtensions,
    setShowMachines,
    setShowMachineMultiplier,
    setAutoImport,
    setTreeSortKey,
    setTreeSortDirection,
    setManualTreeOrder,
    currentExcessMap,
    currentMachineCountMap,
    currentMachineMultiplierMap,
    currentExpandedNodes,
    currentNodeExtensionOverrides,
    currentViewDensity,
    currentShowExtensions,
    currentAccumulateExtensions,
    currentShowMachines,
    currentShowMachineMultiplier,
    currentAutoImport,
    currentTreeSortKey,
    currentTreeSortDirection,
    currentManualTreeOrder,
}: UsePlannerSaveLoadProps): UsePlannerSaveLoadResult => {
    const dispatch: AppDispatch = useDispatch();
    const dependenciesState = useSelector((state: RootState) => state.dependencies);
    const recipeSelectionsState = useSelector((state: RootState) => state.recipeSelections.selections);

    const [saveNames, setSaveNames] = useState<string[]>([]);
    const [lastSavedStateInMemory, setLastSavedStateInMemory] = useState<SavedPlannerState | null>(null);
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [activeSetupName, setActiveSetupName] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function init() {
            const namesResult = await saveService.getNames();
            if (!cancelled && namesResult.ok && namesResult.data) {
                setSaveNames(namesResult.data);
            }
            const activeResult = await saveService.getActiveName();
            if (!cancelled && activeResult.ok && activeResult.data) {
                setActiveSetupName(activeResult.data);
            }
        }
        init();
        return () => { cancelled = true; };
    }, []);

    const getSaveNames = useCallback((): string[] => {
        return saveNames;
    }, [saveNames]);

    const clearSaveError = useCallback(() => {
        setSaveError(null);
    }, []);

    const gatherCurrentState = useCallback((): SavedPlannerState => {
         return {
            dependencies: JSON.parse(JSON.stringify(dependenciesState)),
            recipeSelections: JSON.parse(JSON.stringify(recipeSelectionsState || {})),
            nodeState: {
                excessMap: JSON.parse(JSON.stringify(currentExcessMap)),
                machineCountMap: JSON.parse(JSON.stringify(currentMachineCountMap)),
                machineMultiplierMap: JSON.parse(JSON.stringify(currentMachineMultiplierMap)),
                expandedNodes: JSON.parse(JSON.stringify(currentExpandedNodes)),
                nodeExtensionOverrides: JSON.parse(JSON.stringify(currentNodeExtensionOverrides)),
            },
            displayOptions: {
                viewDensity: currentViewDensity,
                showExtensions: currentShowExtensions,
                accumulateExtensions: currentAccumulateExtensions,
                showMachines: currentShowMachines,
                showMachineMultiplier: currentShowMachineMultiplier,
                autoImport: currentAutoImport,
            },
            sortOptions: {
                key: currentTreeSortKey,
                direction: currentTreeSortDirection,
            },
            manualTreeOrder: JSON.parse(JSON.stringify(currentManualTreeOrder)),
        };
    }, [
        dependenciesState, recipeSelectionsState,
        currentExcessMap, currentMachineCountMap, currentMachineMultiplierMap,
        currentExpandedNodes, currentNodeExtensionOverrides,
        currentViewDensity, currentShowExtensions, currentAccumulateExtensions,
        currentShowMachines, currentShowMachineMultiplier, currentAutoImport,
        currentTreeSortKey, currentTreeSortDirection,
        currentManualTreeOrder,
    ]);

    const checkDirtyState = useDebouncedCallback(() => {
        if (!lastSavedStateInMemory) {
            setIsDirty(false);
            return;
        }
        const currentState = gatherCurrentState();
        const areEqual = _isEqual(currentState, lastSavedStateInMemory);
        setIsDirty(!areEqual);
    }, 500);

    useEffect(() => {
        checkDirtyState();
    }, [
        dependenciesState, recipeSelectionsState,
        currentExcessMap, currentMachineCountMap, currentMachineMultiplierMap,
        currentExpandedNodes, currentNodeExtensionOverrides,
        currentViewDensity, currentShowExtensions, currentAccumulateExtensions,
        currentShowMachines, currentShowMachineMultiplier, currentAutoImport,
        currentTreeSortKey, currentTreeSortDirection,
        checkDirtyState,
        currentManualTreeOrder,
    ]);

    const refreshNames = useCallback(async () => {
        const result = await saveService.getNames();
        if (result.ok && result.data) {
            setSaveNames(result.data);
        }
    }, []);

    const saveSetup = useCallback(async (name: string) => {
        if (!name?.trim()) {
            setSaveError("Save name cannot be empty.");
            return;
        }

        const currentState = gatherCurrentState();
        const result = await saveService.save(name, JSON.stringify(currentState));

        if (!result.ok) {
            setSaveError(result.error || `Failed to save "${name}"`);
            return;
        }

        await saveService.setActiveName(name);
        setLastSavedStateInMemory(currentState);
        setActiveSetupName(name);
        setIsDirty(false);
        setSaveError(null);

        setSaveNames(prev => {
            if (prev.includes(name)) return prev;
            return [...prev, name].sort();
        });
    }, [gatherCurrentState]);

    const loadSetup = useCallback(async (name: string) => {
        const result = await saveService.get(name);

        if (!result.ok || !result.data) {
            setSaveError(result.error || `Setup "${name}" not found`);
            return;
        }

        try {
            const stateToLoad: SavedPlannerState = JSON.parse(result.data);

            if (stateToLoad.dependencies) {
                dispatch(loadSavedState(stateToLoad.dependencies));
            }
            if (stateToLoad.recipeSelections) {
                dispatch(loadRecipeSelections(stateToLoad.recipeSelections));
            }

            if (stateToLoad.nodeState) {
                setExcessMap(stateToLoad.nodeState.excessMap || {});
                setMachineCountMap(stateToLoad.nodeState.machineCountMap || {});
                setMachineMultiplierMap(stateToLoad.nodeState.machineMultiplierMap || {});
                setExpandedNodes(stateToLoad.nodeState.expandedNodes || {});
                setNodeExtensionOverrides(stateToLoad.nodeState.nodeExtensionOverrides || {});
            }
            if (stateToLoad.displayOptions) {
                const density = stateToLoad.displayOptions.viewDensity;
                setViewDensity((density === 'compact' || density === 'relaxed') ? density : 'compact');
                setShowExtensions(stateToLoad.displayOptions.showExtensions ?? false);
                setAccumulateExtensions(stateToLoad.displayOptions.accumulateExtensions ?? true);
                setShowMachines(stateToLoad.displayOptions.showMachines ?? true);
                setShowMachineMultiplier(stateToLoad.displayOptions.showMachineMultiplier ?? false);
                setAutoImport(stateToLoad.displayOptions.autoImport ?? true);
            }
            if (stateToLoad.sortOptions) {
                setTreeSortKey(stateToLoad.sortOptions.key as TreeSortKey || 'originalDepth');
                const direction = stateToLoad.sortOptions.direction;
                setTreeSortDirection((direction === 'asc' || direction === 'desc') ? direction : 'asc');
            }
            if (stateToLoad.manualTreeOrder) {
                setManualTreeOrder(stateToLoad.manualTreeOrder);
            }

            await saveService.setActiveName(name);
            setLastSavedStateInMemory(stateToLoad);
            setActiveSetupName(name);
            setIsDirty(false);
            setSaveError(null);

        } catch (error) {
            logger.error(`[Load Setup] Error loading setup "${name}":`, error);
            setSaveError(`Failed to load "${name}": data may be corrupted`);
        }
    }, [
        dispatch,
        setExcessMap, setMachineCountMap, setMachineMultiplierMap, setExpandedNodes, setNodeExtensionOverrides,
        setViewDensity, setShowExtensions, setAccumulateExtensions, setShowMachines, setShowMachineMultiplier, setAutoImport,
        setTreeSortKey, setTreeSortDirection,
        setManualTreeOrder
    ]);

    const deleteSetup = useCallback(async (name: string) => {
        const result = await saveService.delete(name);

        if (!result.ok) {
            setSaveError(result.error || `Failed to delete "${name}"`);
            return;
        }

        const activeResult = await saveService.getActiveName();
        const wasActive = activeResult.ok && activeResult.data === name;

        if (wasActive) {
            await saveService.setActiveName('');
            setLastSavedStateInMemory(null);
            setActiveSetupName(null);
            setIsDirty(true);
        }

        setSaveNames(prev => prev.filter(n => n !== name));
        setSaveError(null);
    }, []);

    useEffect(() => {
        // isDirty change log placeholder
    }, [isDirty]);

    return {
        getSaveNames,
        saveSetup,
        loadSetup,
        deleteSetup,
        isDirty,
        activeSetupName,
        saveError,
        clearSaveError,
    };
};
