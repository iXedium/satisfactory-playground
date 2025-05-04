/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { DependencyNode, Recipe } from '../../../types'; // Assuming types are needed
import { loadSavedState, loadRecipeSelections } from '../store'; // Actions to load Redux state
import { usePlannerNodeState } from './usePlannerNodeState'; // Need this for state access
import { usePlannerDisplayOptions } from './usePlannerDisplayOptions'; // Need this for state access
import { TreeSortKey, SortDirection } from './useFactoryPlanner'; // Import sort types
import { DependencyState } from '../store'; // Import full DependencyState type

// --- Local Storage Key ---
const PLANNER_SETUPS_KEY = 'plannerSetups';

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
    // Add other states if needed, e.g., from usePlannerItemSelection?
}

// --- Define the structure for all saved setups ---
type PlannerSetups = Record<string, SavedPlannerState>;

// --- Define the hook's return type ---
export interface UsePlannerSaveLoadResult {
    getSaveNames: () => string[];
    saveSetup: (name: string) => Promise<void>; // Needs access to current state
    loadSetup: (name: string) => Promise<void>; // Needs access to dispatch & setters
    deleteSetup: (name: string) => Promise<void>;
    // Potentially add a function to check if a name exists?
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
    setViewDensity: React.Dispatch<React.SetStateAction<any>>; // Use specific type later
    setShowExtensions: React.Dispatch<React.SetStateAction<boolean>>;
    setAccumulateExtensions: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMachines: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMachineMultiplier: React.Dispatch<React.SetStateAction<boolean>>;
    setAutoImport: React.Dispatch<React.SetStateAction<boolean>>;
    // Add setters from useFactoryPlanner for sorting
    setTreeSortKey: React.Dispatch<React.SetStateAction<any>>; // Use specific type later
    setTreeSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>; // Use imported type

    // Pass current state values needed for saving
    currentExcessMap: Record<string, number>;
    currentMachineCountMap: Record<string, number>;
    currentMachineMultiplierMap: Record<string, number>;
    currentExpandedNodes: Record<string, boolean>;
    currentNodeExtensionOverrides: Record<string, boolean>;

    currentViewDensity: string; // Keep as string or import ViewDensity type
    currentShowExtensions: boolean;
    currentAccumulateExtensions: boolean;
    currentShowMachines: boolean;
    currentShowMachineMultiplier: boolean;
    currentAutoImport: boolean;

    currentTreeSortKey: TreeSortKey; // Use imported type
    currentTreeSortDirection: SortDirection; // Use imported type
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
}: UsePlannerSaveLoadProps): UsePlannerSaveLoadResult => {
    const dispatch: AppDispatch = useDispatch();
    const dependenciesState = useSelector((state: RootState) => state.dependencies);
    const recipeSelectionsState = useSelector((state: RootState) => state.recipeSelections.selections);

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

    // --- Function to save the current state ---
    const saveSetup = useCallback(async (name: string) => {
        if (!name?.trim()) {
            console.error("Save name cannot be empty.");
            alert("Save name cannot be empty.");
            return;
        }
        
        // Gather current state
        const currentState: SavedPlannerState = {
            dependencies: JSON.parse(JSON.stringify(dependenciesState)), // Save full state, deep copy
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
            }
        };

        // Read existing setups, update the specific one, and save back
        const setups = getAllSetups();
        setups[name] = currentState; 

        try {
            localStorage.setItem(PLANNER_SETUPS_KEY, JSON.stringify(setups));
            console.log(`Setup "${name}" saved successfully.`);
            alert(`Setup "${name}" saved.`); // Provide feedback
        } catch (error) {
            console.error(`Error saving setup "${name}":`, error);
            // Check for quota exceeded error specifically
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                alert(`Failed to save setup "${name}": LocalStorage quota exceeded. Please delete some setups or clear browser data.`);
            } else {
                alert(`Failed to save setup "${name}". Check console for details.`);
            }
        }

    }, [
        getAllSetups, dependenciesState, recipeSelectionsState,
        currentExcessMap, currentMachineCountMap, currentMachineMultiplierMap, 
        currentExpandedNodes, currentNodeExtensionOverrides,
        currentViewDensity, currentShowExtensions, currentAccumulateExtensions,
        currentShowMachines, currentShowMachineMultiplier, currentAutoImport,
        currentTreeSortKey, currentTreeSortDirection
        // No need for dispatch/setters in saveSetup dependencies
    ]);

    // --- Function to load a specific state ---
    const loadSetup = useCallback(async (name: string) => {
        const setups = getAllSetups();
        const stateToLoad = setups[name];

        if (!stateToLoad) {
            console.error(`Setup "${name}" not found.`);
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
                setViewDensity(stateToLoad.displayOptions.viewDensity || 'compact'); // Provide default
                setShowExtensions(stateToLoad.displayOptions.showExtensions ?? false); // Provide default
                setAccumulateExtensions(stateToLoad.displayOptions.accumulateExtensions ?? true); // Provide default
                setShowMachines(stateToLoad.displayOptions.showMachines ?? true); // Provide default
                setShowMachineMultiplier(stateToLoad.displayOptions.showMachineMultiplier ?? false); // Provide default
                setAutoImport(stateToLoad.displayOptions.autoImport ?? true); // Provide default
            }
             if (stateToLoad.sortOptions) {
                setTreeSortKey(stateToLoad.sortOptions.key as TreeSortKey || 'originalDepth'); // Cast loaded key
                // Validate or cast loaded direction
                const direction = stateToLoad.sortOptions.direction;
                setTreeSortDirection((direction === 'asc' || direction === 'desc') ? direction : 'asc'); 
            }

            console.log(`Setup "${name}" loaded successfully.`);
            // Feedback to user might be good here

        } catch (error) {
            console.error(`Error loading setup "${name}":`, error);
            alert(`Failed to load setup "${name}". Check console for details.`);
            // Should we attempt to revert state? Probably too complex.
        }

    }, [
        getAllSetups, dispatch,
        setExcessMap, setMachineCountMap, setMachineMultiplierMap, setExpandedNodes, setNodeExtensionOverrides,
        setViewDensity, setShowExtensions, setAccumulateExtensions, setShowMachines, setShowMachineMultiplier, setAutoImport,
        setTreeSortKey, setTreeSortDirection
    ]);

    // --- Function to delete a specific state ---
    const deleteSetup = useCallback(async (name: string) => {
        const setups = getAllSetups();
        if (!setups[name]) {
            console.warn(`Attempted to delete non-existent setup "${name}".`);
            return; // Or provide feedback
        }

        delete setups[name];

        try {
            localStorage.setItem(PLANNER_SETUPS_KEY, JSON.stringify(setups));
            console.log(`Setup "${name}" deleted successfully.`);
            // Provide feedback / update UI if necessary
        } catch (error) {
            console.error(`Error deleting setup "${name}":`, error);
            alert(`Failed to delete setup "${name}". Check console for details.`);
            // Should we add the setup back to the 'setups' object?
        }
    }, [getAllSetups]);


    return {
        getSaveNames,
        saveSetup,
        loadSetup,
        deleteSetup,
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