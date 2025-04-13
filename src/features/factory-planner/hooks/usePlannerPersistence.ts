import { useEffect } from 'react';
import { DependencyNode } from '../../../types';

// Define the expected shape of the dependencies state slice locally
// Needs the full shape that is being serialized
interface DependencySliceStateForPersistence {
  dependencyTrees: Record<string, DependencyNode>;
  accumulatedDependencies: Record<string, any>; // Use any for now, or import AccumulatedNode
  errors: unknown[];
}

interface PlannerPersistenceProps {
  dependencies: DependencySliceStateForPersistence;
  recipeSelections: Record<string, string>;
}

// This hook manages saving core Redux state to localStorage
export const usePlannerPersistence = ({
  dependencies,
  recipeSelections,
}: PlannerPersistenceProps) => {

  // Save dependencies state to localStorage
  useEffect(() => {
    // Only save if we have dependencies to save, prevents wiping on initial load
    if (dependencies && Object.keys(dependencies.dependencyTrees).length > 0) {
      try {
        const serialized = JSON.stringify(dependencies);
        localStorage.setItem('savedDependencies', serialized);
        console.log('[Persistence] Saved dependencies state.');
      } catch (error) {
        console.error("Error saving dependencies:", error);
        localStorage.removeItem('savedDependencies'); // Clear on error
      }
    } 
    // Optional: Clear storage if dependencies become empty?
    // else if (localStorage.getItem('savedDependencies')) {
    //   localStorage.removeItem('savedDependencies');
    // }
  }, [dependencies]);

  // Save recipe selections state to localStorage
  useEffect(() => {
    // Only save if we have selections
    if (recipeSelections && Object.keys(recipeSelections).length > 0) {
      try {
        localStorage.setItem('savedRecipeSelections', JSON.stringify(recipeSelections));
        console.log('[Persistence] Saved recipe selections state.');
      } catch (error) {
        console.error("Error saving recipe selections:", error);
        localStorage.removeItem('savedRecipeSelections'); // Clear on error
      }
    } 
    // Optional: Clear storage if selections become empty?
    // else if (localStorage.getItem('savedRecipeSelections')) {
    //  localStorage.removeItem('savedRecipeSelections');
    // }
  }, [recipeSelections]);

  // No return value needed, hook is for side effects
}; 