/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { DependencyNode, Recipe } from '../../../types'; // Assuming types are needed
import { loadSavedState, loadRecipeSelections } from '../store'; // Actions to load Redux state
import { usePlannerNodeState } from './usePlannerNodeState'; // Need this for state access
import { usePlannerDisplayOptions, ViewDensity } from './usePlannerDisplayOptions'; // Need this for state access
import { TreeSortKey, SortDirection } from './useFactoryPlanner'; // Import sort types
import { DependencyState } from '../store'; // Import full DependencyState type
import _isEqual from 'lodash/isEqual'; // Import deep comparison utility
import { useDebouncedCallback } from 'use-debounce'; // Import debounce utility

// --- Local Storage Keys ---
const PLANNER_SETUPS_KEY = 'plannerSetups';
const LAST_ACTIVE_SETUP_KEY = 'plannerLastActiveSetupName'; // Key for last saved/loaded name

// --- Define the structure for a single saved setup ---
interface SavedPlannerState {
    dependencies: DependencyState; // Save the full state slice
    recipeSelections: Record<string, string>;

    // Local Hook States
    nodeState: {
        excessMap: Record<string, number>;
        machineCountMap: Record<string, number>;
        machineMultiplierMap: Record<string, number>;
        expandedNodes: Record<string, boolean>;
        nodeExtensionOverrides: Record<string, boolean>;
    };
    displayOptions: {
        viewDensity: string; // Using string for now, adjust if needed
        showExtensions: boolean;
        accumulateExtensions: boolean;
        showMachines: boolean;
        showMachineMultiplier: boolean;
        autoImport: boolean;
    };
    sortOptions: {
        key: string; // Using string for now
        direction: string; // Using string for now
    };
    manualTreeOrder: string[]; // Added for manual sort order
    // Add other states if needed, e.g., from usePlannerItemSelection?
}

// --- Define the structure for all saved setups ---
type PlannerSetups = Record<string, SavedPlannerState>;

// --- Define the hook's return type ---
export interface UsePlannerSaveLoadResult {
    getSaveNames: () => string[];
    saveSetup: (name: string) => Promise<void>;
    loadSetup: (name: string) => Promise<void>;
    deleteSetup: (name: string) => Promise<void>;
    isDirty: boolean; // Add dirty flag
    activeSetupName: string | null; // Add name of currently loaded setup
}

// --- Props for the hook (to receive setters/state if needed) ---
interface UsePlannerSaveLoadProps {
    // Pass setters from other hooks here
    setExcessMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setMachineCountMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setMachineMultiplierMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setNodeExtensionOverrides: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    // Add setters from usePlannerDisplayOptions
    setViewDensity: React.Dispatch<React.SetStateAction<ViewDensity>>; // Use imported ViewDensity type
    setShowExtensions: React.Dispatch<React.SetStateAction<boolean>>;
    setAccumulateExtensions: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMachines: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMachineMultiplier: React.Dispatch<React.SetStateAction<boolean>>;
    setAutoImport: React.Dispatch<React.SetStateAction<boolean>>;
    // Add setters from useFactoryPlanner for sorting
    setTreeSortKey: React.Dispatch<React.SetStateAction<TreeSortKey>>; // Use imported TreeSortKey type
    setTreeSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
    setManualTreeOrder: React.Dispatch<React.SetStateAction<string[]>>; // Added setter for manual order

    // Pass current state values needed for saving
    currentExcessMap: Record<string, number>;
    currentMachineCountMap: Record<string, number>;
    currentMachineMultiplierMap: Record<string, number>;
    currentExpandedNodes: Record<string, boolean>;
    currentNodeExtensionOverrides: Record<string, boolean>;

    currentViewDensity: ViewDensity; // Use imported ViewDensity type
    currentShowExtensions: boolean;
    currentAccumulateExtensions: boolean;
    currentShowMachines: boolean;
    currentShowMachineMultiplier: boolean;
    currentAutoImport: boolean;

    currentTreeSortKey: TreeSortKey;
    currentTreeSortDirection: SortDirection;
    currentManualTreeOrder: string[]; // Added for manual sort order state
}


export const usePlannerSaveLoad = ({
    // Destructure setters
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
    setManualTreeOrder, // Destructure setter for manual order
    // Destructure current state values
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
    currentManualTreeOrder, // Destructure manual order state
}: UsePlannerSaveLoadProps): UsePlannerSaveLoadResult => {
    const dispatch: AppDispatch = useDispatch();
    const dependenciesState = useSelector((state: RootState) => state.dependencies);
    const recipeSelectionsState = useSelector((state: RootState) => state.recipeSelections.selections);

    // State for tracking dirty status
    const [lastSavedStateInMemory, setLastSavedStateInMemory] = useState<SavedPlannerState | null>(null);
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [activeSetupName, setActiveSetupName] = useState<string | null>(null);

    // Load active setup name on mount
    useEffect(() => {
        // console.log("[Init] Loading last active setup info...");
        const name = localStorage.getItem(LAST_ACTIVE_SETUP_KEY);
        setActiveSetupName(name);
        // console.log(`[Init] Last active setup name from localStorage: ${name}`);
        if (name) {
            const setups = getAllSetups();
            if (setups[name]) {
                // console.log(`[Init] Found state for "${name}", setting lastSavedStateInMemory.`);
                setLastSavedStateInMemory(setups[name]);
            } else {
                console.warn(`[Init] Name "${name}" found in localStorage, but no matching setup found in plannerSetups.`);
                localStorage.removeItem(LAST_ACTIVE_SETUP_KEY); // Clean up inconsistent state
                setActiveSetupName(null);
            }
        } else {
            //  console.log("[Init] No last active setup name found.");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    // --- Helper to get all setups from localStorage ---
    const getAllSetups = useCallback((): PlannerSetups => {
        try {
            const rawData = localStorage.getItem(PLANNER_SETUPS_KEY);
            return rawData ? JSON.parse(rawData) : {};
        } catch (error) {
            console.error("Error reading planner setups from localStorage:", error);
            return {}; // Return empty object on error
        }
    }, []);

    // --- Function to get list of save names ---
    const getSaveNames = useCallback((): string[] => {
        const setups = getAllSetups();
        return Object.keys(setups).sort(); // Sort names alphabetically
    }, [getAllSetups]);

    // Function to gather the current state (Helper)
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
            manualTreeOrder: JSON.parse(JSON.stringify(currentManualTreeOrder)), // Save manual order
        };
    }, [
        dependenciesState, recipeSelectionsState,
        currentExcessMap, currentMachineCountMap, currentMachineMultiplierMap, 
        currentExpandedNodes, currentNodeExtensionOverrides,
        currentViewDensity, currentShowExtensions, currentAccumulateExtensions,
        currentShowMachines, currentShowMachineMultiplier, currentAutoImport,
        currentTreeSortKey, currentTreeSortDirection,
        currentManualTreeOrder, // Add to dependency array
    ]);

    // --- Debounced Dirty Check --- 
    const checkDirtyState = useDebouncedCallback(() => {
        // console.log("[Dirty Check] Debounced check executing..."); 
        if (!lastSavedStateInMemory) {
            // console.log("[Dirty Check] No last saved state in memory, setting isDirty: false");
            setIsDirty(false); 
            return;
        }
        const currentState = gatherCurrentState();
        
        // console.log("[Dirty Check] Current State:", JSON.stringify(currentState).substring(0, 200) + "..."); // Log potentially large state carefully
        // console.log("[Dirty Check] Last Saved State:", JSON.stringify(lastSavedStateInMemory).substring(0, 200) + "...");

        const areEqual = _isEqual(currentState, lastSavedStateInMemory);
        
        // console.log(`[Dirty Check] States Equal: ${areEqual}. Setting isDirty: ${!areEqual}`);

        setIsDirty(!areEqual);
    }, 500); // Debounce for 500ms

    // --- Effect to Run Dirty Check on State Change ---
    useEffect(() => {
        // Log when this effect is triggered
        // console.log("[Dirty Check Trigger] State changed, queuing dirty check."); 
        checkDirtyState();
    }, [
        dependenciesState, recipeSelectionsState,
        currentExcessMap, currentMachineCountMap, currentMachineMultiplierMap, 
        currentExpandedNodes, currentNodeExtensionOverrides,
        currentViewDensity, currentShowExtensions, currentAccumulateExtensions,
        currentShowMachines, currentShowMachineMultiplier, currentAutoImport,
        currentTreeSortKey, currentTreeSortDirection,
        checkDirtyState,
        currentManualTreeOrder, // Add to dependency array
    ]);

    // --- Function to save the current state ---
    const saveSetup = useCallback(async (name: string) => {
        // console.log(`[Save Setup] Attempting to save as "${name}"...`);
        if (!name?.trim()) {
            console.error("Save name cannot be empty.");
            alert("Save name cannot be empty.");
            return;
        }
        
        const currentState = gatherCurrentState(); // Use helper
        const setups = getAllSetups();
        setups[name] = currentState; 

        try {
            localStorage.setItem(PLANNER_SETUPS_KEY, JSON.stringify(setups));
            localStorage.setItem(LAST_ACTIVE_SETUP_KEY, name); // Track last saved name
            setLastSavedStateInMemory(currentState); // Update in-memory copy
            setActiveSetupName(name); // Update active name state
            setIsDirty(false); // Explicitly setting dirty to false
            // console.log(`[Save Setup] Success. Active: "${name}", isDirty: false.`);
            alert(`Setup "${name}" saved.`);
        } catch (error) {
            console.error(`[Save Setup] Error saving setup "${name}":`, error);
            // Check for quota exceeded error specifically
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                alert(`Failed to save setup "${name}": LocalStorage quota exceeded. Please delete some setups or clear browser data.`);
            } else {
                alert(`Failed to save setup "${name}". Check console for details.`);
            }
        }
    }, [getAllSetups, gatherCurrentState]); // Dependencies include helpers

    // --- Function to load a specific state ---
    const loadSetup = useCallback(async (name: string) => {
        // console.log(`[Load Setup] Attempting to load "${name}"...`);
        const setups = getAllSetups();
        const stateToLoad = setups[name];

        if (!stateToLoad) {
            console.error(`[Load Setup] Setup "${name}" not found.`);
            alert(`Setup "${name}" not found.`);
            return;
        }

        try {
            // TODO: Clear existing state first? Or does loading overwrite?
            // Need to clear local states before setting them.

            // Dispatch actions to load Redux state
            if (stateToLoad.dependencies) {
                dispatch(loadSavedState(stateToLoad.dependencies)); // Now passing the full state
            }
            if (stateToLoad.recipeSelections) {
                dispatch(loadRecipeSelections(stateToLoad.recipeSelections));
            }

            // Call setters to load local hook states
             if (stateToLoad.nodeState) {
                setExcessMap(stateToLoad.nodeState.excessMap || {});
                setMachineCountMap(stateToLoad.nodeState.machineCountMap || {});
                setMachineMultiplierMap(stateToLoad.nodeState.machineMultiplierMap || {});
                setExpandedNodes(stateToLoad.nodeState.expandedNodes || {});
                setNodeExtensionOverrides(stateToLoad.nodeState.nodeExtensionOverrides || {});
            }
            if (stateToLoad.displayOptions) {
                // Cast the loaded viewDensity or use default
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
                // Validate or cast loaded direction
                const direction = stateToLoad.sortOptions.direction;
                setTreeSortDirection((direction === 'asc' || direction === 'desc') ? direction : 'asc'); 
            }
            if (stateToLoad.manualTreeOrder) {
                setManualTreeOrder(stateToLoad.manualTreeOrder);
            }

            localStorage.setItem(LAST_ACTIVE_SETUP_KEY, name); // Track last loaded name
            setLastSavedStateInMemory(stateToLoad); // Update in-memory copy
            setActiveSetupName(name); // Update active name state
            setIsDirty(false); // Explicitly setting dirty to false
            // console.log(`[Load Setup] Success. Active: "${name}", isDirty: false.`);
            // Feedback to user might be good here

        } catch (error) {
            console.error(`[Load Setup] Error loading setup "${name}":`, error);
            alert(`Failed to load setup "${name}". Check console for details.`);
            // Should we attempt to revert state? Probably too complex.
        }

    }, [
        getAllSetups, dispatch,
        setExcessMap, setMachineCountMap, setMachineMultiplierMap, setExpandedNodes, setNodeExtensionOverrides,
        setViewDensity, setShowExtensions, setAccumulateExtensions, setShowMachines, setShowMachineMultiplier, setAutoImport,
        setTreeSortKey, setTreeSortDirection,
        setManualTreeOrder
    ]);

    // --- Function to delete a specific state ---
    const deleteSetup = useCallback(async (name: string) => {
        // Confirmation prompt comes from PlannerActions now
        // if (!window.confirm(...)) return; // Removed from here

        // console.log(`[Delete Setup] Attempting to delete "${name}"...`);
        const setups = getAllSetups();
        if (!setups[name]) { console.warn(`[Delete Setup] Attempted to delete non-existent setup "${name}".`); return; }

        const wasActive = localStorage.getItem(LAST_ACTIVE_SETUP_KEY) === name;
        delete setups[name];

        try {
            localStorage.setItem(PLANNER_SETUPS_KEY, JSON.stringify(setups));
            // console.log(`[Delete Setup] Removed "${name}" from plannerSetups.`);
            if (wasActive) {
                // console.log(`[Delete Setup] "${name}" was the active setup. Clearing active state.`);
                localStorage.removeItem(LAST_ACTIVE_SETUP_KEY);
                setLastSavedStateInMemory(null); // Clear in-memory state
                setActiveSetupName(null); // Clear active name
                // Should it become dirty now? Depends on definition.
                // Let's assume deleting the active save makes state dirty relative to nothing.
                setIsDirty(true); 
                // console.log(`[Delete Setup] Cleared active setup. isDirty: true.`);
            } else {
                //  console.log(`[Delete Setup] "${name}" was not the active setup. No change to active state or dirty flag.`);
            }
        } catch (error) {
            console.error(`[Delete Setup] Error deleting setup "${name}":`, error);
            alert(`Failed to delete setup "${name}". Check console for details.`);
        }
    }, [getAllSetups]);

    // Log whenever isDirty state changes
    useEffect(() => {
        // console.log(`[State Change] isDirty is now: ${isDirty}`);
    }, [isDirty]);

    return {
        getSaveNames,
        saveSetup,
        loadSetup,
        deleteSetup,
        isDirty,
        activeSetupName,
    };
};

// --- Helper Function (Example - needs refinement based on actual store/hook state) ---
// This function would live inside usePlannerSaveLoad or be imported
// const gatherCurrentState = (
//     reduxState: RootState, // Get via useSelector in the hook maybe?
//     nodeState: any, // Pass from props or get via another hook?
//     displayOptions: any,
//     sortOptions: any
// ): SavedPlannerState => {
//     return {
//         dependencies: { // Deep copy? Select specific parts?
//             dependencyTrees: JSON.parse(JSON.stringify(reduxState.dependencies.dependencyTrees)),
//         },
//         recipeSelections: { ...reduxState.recipeSelections.selections },
//         nodeState: { ...nodeState }, // Need to get this state
//         displayOptions: { ...displayOptions }, // Need to get this state
//         sortOptions: { ...sortOptions }, // Need to get this state
//     };
// }; 