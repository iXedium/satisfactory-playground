import { useCallback, Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { DependencyNode } from '../../../types';
import { updateTreeProduction } from '../store';
import { findNodeById } from '../../../utils';

// Define the expected shape of the dependencies state slice locally
// Matching the one used in usePlannerNodeInteractions
interface DependencySliceStateForExcess {
  dependencyTrees: Record<string, DependencyNode>;
}

interface PlannerExcessHandlingProps {
  dependencies: DependencySliceStateForExcess;
  setExcessMap: Dispatch<SetStateAction<Record<string, number>>>;
  setForceUpdateCounter: Dispatch<SetStateAction<number>>;
}

export const usePlannerExcessHandling = ({
  dependencies,
  setExcessMap,
  setForceUpdateCounter,
}: PlannerExcessHandlingProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleExcessChange = useCallback(async (nodeId: string, excess: number) => {
    console.log(`[SEQUENCE DEBUG] Step 1: handleExcessChange called for ${nodeId} with excess ${excess}`);
    
    console.log(`[SEQUENCE DEBUG] Step 2: Setting excess map state`);
    setExcessMap(prevMap => {
      console.log(`[SEQUENCE DEBUG] Step 2.1: Inside setExcessMap callback`);
      return { ...prevMap, [nodeId]: excess };
    });
    
    console.log(`[SEQUENCE DEBUG] Step 2.2: Waiting for state update to process`);
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for next tick
    console.log(`[SEQUENCE DEBUG] Step 2.3: State update processed`);
    
    console.log(`[SEQUENCE DEBUG] Step 3: Finding tree ID for node ${nodeId}`);
    
    // Check if the nodeId is actually a treeId (root node case)
    if (dependencies.dependencyTrees[nodeId]) {
      const tree = dependencies.dependencyTrees[nodeId];
      console.log(`[SEQUENCE DEBUG] The node ID is actually a tree ID. Using root node's uniqueId: ${tree.uniqueId}`);
      
      console.log(`[SEQUENCE DEBUG] Root node details:`, { /* ... logging */ });
      
      // Ensure excess map is also updated for the actual uniqueId of the root node
      setExcessMap(prevMap => ({ ...prevMap, [tree.uniqueId]: excess })); 
      
      // Dispatch update based on the root node's uniqueId and the treeId
      dispatch(updateTreeProduction(tree.uniqueId, nodeId, 'excess', excess));
      
      console.log(`[SEQUENCE DEBUG] Step 7: Forcing UI refresh after state updates`);
      setTimeout(() => {
        setForceUpdateCounter(prev => prev + 1);
      }, 50);
      
      return;
    }
    
    // Standard case: find the tree containing this non-root node
    let foundTreeId = '';
    let foundNode = null;

    for (const [treeId, tree] of Object.entries(dependencies.dependencyTrees)) {
      const node = findNodeById(tree, nodeId);
      if (node) {
        foundTreeId = treeId;
        foundNode = node; // Store the found node
        console.log(`[SEQUENCE DEBUG] Found node details:`, { /* ... logging */ });
        break;
      }
    }

    if (!foundTreeId) {
      console.error(`[Excess Change ERROR] Node ${nodeId} not found in any tree`);
      return;
    }
      
    console.log(`[SEQUENCE DEBUG] Step 4: Found tree ID: ${foundTreeId}`);
    
    console.log(`[SEQUENCE DEBUG] Step 5: Using node ID: ${nodeId} in tree: ${foundTreeId}`);
    
    // Dispatch update based on the specific node's uniqueId and its containing treeId
    dispatch(updateTreeProduction(nodeId, foundTreeId, 'excess', excess));
    
    console.log(`[SEQUENCE DEBUG] Step 7: Forcing UI refresh after state updates`);
    setTimeout(() => {
      setForceUpdateCounter(prev => prev + 1);
    }, 50);

  }, [dependencies.dependencyTrees, dispatch, setExcessMap, setForceUpdateCounter]);

  return {
    handleExcessChange,
  };
}; 