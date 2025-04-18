/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback } from 'react';
import { DependencyNode } from '../../../types';

// Define the expected shape of the dependencies state slice locally
interface DependencySliceStateForDebug {
  dependencyTrees: Record<string, DependencyNode>;
}

interface PlannerDebugToolsProps {
  dependencies: DependencySliceStateForDebug;
  excessMap: Record<string, number>;
  handleExcessChange: (nodeId: string, excess: number) => Promise<void>; // Match signature from usePlannerExcessHandling
}

export const usePlannerDebugTools = ({
  dependencies,
  excessMap,
  handleExcessChange,
}: PlannerDebugToolsProps) => {

  // Utility function (needed by tests)
  const findImportNodes = useCallback((node: DependencyNode): DependencyNode[] => {
    let importNodes: DependencyNode[] = [];
    if (node.isImport || (node.importReference && Object.keys(node.importReference).length > 0)) {
      importNodes.push(node);
    }
    if (node.children) {
      node.children.forEach(child => {
        importNodes = [...importNodes, ...findImportNodes(child)];
      });
    }
    return importNodes;
  }, []);

  const findFirstNonRootNode = useCallback((node: DependencyNode): DependencyNode | null => {
    if (node.children && node.children.length > 0) {
      return node.children[0];
    }
    // If no children, check siblings (though less common for tree root)
    // This might need adjustment depending on the exact tree structure desired for testing
    return null; 
  }, []);

  // Test cascade function
  const testExcessCascade = useCallback(async () => {
    const anyTreeId = Object.keys(dependencies.dependencyTrees)[0];
    if (!anyTreeId) {
      console.error("[TEST] No trees found for testing");
      return "FAILED: No trees available for testing";
    }
    
    const tree = dependencies.dependencyTrees[anyTreeId];
    const rootNode = tree;
    const childNode = findFirstNonRootNode(tree); // Use helper
    
    if (!childNode) {
      console.error("[TEST] Tree has no child nodes for testing");
      return "FAILED: Selected tree has no child nodes";
    }
    
    console.log("[TEST] Starting excess cascade test with:");
    console.log(`  - Tree: ${anyTreeId} (${rootNode.id})`);
    console.log(`  - Root node ID: ${rootNode.uniqueId}`);
    console.log(`  - Child node ID: ${childNode.uniqueId} (${childNode.id})`);
    
    const initialRootExcess = excessMap[rootNode.uniqueId] || 0;
    const initialChildExcess = excessMap[childNode.uniqueId] || 0;
    const testRootExcess = initialRootExcess + 10;
    
    console.log("\n[TEST] PART 1: Testing root node excess change");
    console.log(`  - Changing root excess from ${initialRootExcess} to ${testRootExcess}`);
    const originalChildAmount = childNode.amount;
    await handleExcessChange(rootNode.uniqueId, testRootExcess);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Need to read updated state. Since we don't have direct access to the LATEST dependencies state
    // from Redux within this hook after the dispatch in handleExcessChange, this test's verification part
    // becomes problematic here. The original implementation read dependencies directly from the outer scope after the await.
    // This highlights a challenge in extracting state-dependent test logic.
    // For now, we'll log the map change but cannot reliably verify the recalculated child amount here.
    const rootTestResult = excessMap[rootNode.uniqueId] === testRootExcess;
    console.log("\n[TEST] Root excess test results (Verification limited within hook):");
    console.log(`  - Root excess requested change: ${initialRootExcess} -> ${testRootExcess}`);
    console.log(`  - Current root excess in map: ${excessMap[rootNode.uniqueId]}`);
    // Cannot reliably check childNode.amount here as dependencies state isn't updated synchronously within this hook scope.

    await handleExcessChange(rootNode.uniqueId, initialRootExcess); // Reset
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log("\n[TEST] PART 2: Testing child node excess change");
    const testChildExcess = initialChildExcess + 10;
    console.log(`  - Changing child excess from ${initialChildExcess} to ${testChildExcess}`);
    await handleExcessChange(childNode.uniqueId, testChildExcess);
    await new Promise(resolve => setTimeout(resolve, 100));
    const childTestResult = excessMap[childNode.uniqueId] === testChildExcess;
    console.log("\n[TEST] Child excess test results:");
    console.log(`  - Child excess changed in map: ${initialChildExcess} -> ${excessMap[childNode.uniqueId]}`);
    console.log(`  - Child excess should be ${testChildExcess}: ${childTestResult ? "SUCCESS" : "FAILED"}`);
    
    await handleExcessChange(childNode.uniqueId, initialChildExcess); // Reset

    // Result is now less reliable due to verification limitation
    if (rootTestResult && childTestResult) {
      return "PARTIAL SUCCESS (Verification Limited): Both root and child excess map changes were observed.";
    } else {
      return "FAILED (Verification Limited): One or both excess map changes failed.";
    }
  }, [dependencies, excessMap, handleExcessChange, findFirstNonRootNode]);

  // Manual test function
  const manualTestExcessPropagation = useCallback(() => {
    const anyTreeId = Object.keys(dependencies.dependencyTrees)[0];
    if (!anyTreeId) {
      console.error("No trees found for testing");
      return;
    }
    const tree = dependencies.dependencyTrees[anyTreeId];
    const nodeToTest = findFirstNonRootNode(tree);
    
    if (!nodeToTest) {
      console.error("Could not find a non-root node for testing");
      return;
    }
    
    console.debug(`[TEST] Testing excess propagation with node: ${nodeToTest.id}, uniqueId: ${nodeToTest.uniqueId}`);
    const initialExcess = excessMap[nodeToTest.uniqueId] || 0;
    const newExcess = initialExcess + 10;
    console.debug(`[TEST] Changing excess from ${initialExcess} to ${newExcess}`);
    handleExcessChange(nodeToTest.uniqueId, newExcess);

  }, [dependencies, excessMap, handleExcessChange, findFirstNonRootNode]);

  // Window assignments (consider wrapping in useEffect for safety)
  // Note: Direct window assignment inside a hook can be problematic.
  // A better approach might be to return these functions and let the calling component handle assignment.
  // For simplicity of refactoring, we keep it here for now but mark as potential issue.
  if (typeof window !== 'undefined') {
    interface CustomWindow extends Window {
      findImportNodes?: (node: DependencyNode) => DependencyNode[];
      testExcessPropagation?: () => void;
      runExcessCascadeTest?: () => Promise<string>;
      debugExcessMap?: () => void;
      // Add debugDependencies if needed
    }
    
    const customWindow = window as CustomWindow;
    // customWindow.findImportNodes = findImportNodes; // Expose if needed
    customWindow.testExcessPropagation = manualTestExcessPropagation;
    customWindow.runExcessCascadeTest = testExcessCascade;
    
    // Debug functions need access to the latest state passed as props
    customWindow.debugExcessMap = () => {
      console.debug('[EXCESS DEBUG] Current excess map (from hook prop):', excessMap);
      console.debug('[DEPENDENCIES DEBUG] Current dependencies (from hook prop):', dependencies);
    };
  }

  // Return utilities if they need to be called explicitly from elsewhere,
  // otherwise, the window assignment handles exposure.
  return {
    // findImportNodes, // Only if needed outside tests
    // testExcessCascade, // Only if called from UI
    // manualTestExcessPropagation // Only if called from UI
  };
}; 