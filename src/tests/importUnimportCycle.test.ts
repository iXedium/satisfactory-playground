import { DependencyNode } from '../utils/calculateDependencyTree';
import { 
  setImportReference,
  clearImportReference, 
  isNodeImporting,
  getImportReference
} from '../utils/nodeReferenceUtils';

describe('Import/Unimport Cycle', () => {
  // Create a realistic test node with children and UI properties
  const createTestNode = (): DependencyNode => ({
    id: 'iron-rod',
    amount: 30,
    uniqueId: 'test-iron-rod-1',
    selectedRecipeId: 'recipe-iron-rod-standard',
    availableRecipes: [
      { id: 'recipe-iron-rod-standard', name: 'Standard Iron Rod' },
      { id: 'recipe-iron-rod-alt', name: 'Steel Rod' }
    ],
    children: [
      {
        id: 'iron-ingot',
        amount: 15,
        uniqueId: 'test-iron-rod-1-iron-ingot-2',
        selectedRecipeId: 'recipe-iron-ingot-standard',
        availableRecipes: [
          { id: 'recipe-iron-ingot-standard', name: 'Standard Iron Ingot' },
          { id: 'recipe-iron-ingot-alt', name: 'Pure Iron Ingot' }
        ],
        children: [
          {
            id: 'iron-ore',
            amount: 30,
            uniqueId: 'test-iron-rod-1-iron-ingot-2-iron-ore-3',
            children: [],
            excess: 0
          }
        ],
        excess: 0
      }
    ],
    excess: 0
  });

  test('should preserve node properties and children structure through import/unimport cycle', () => {
    // Create an original node with children
    const originalNode = createTestNode();
    
    // Import the node
    const importedNode = setImportReference(originalNode, 'target-tree-1', 'target-node-1');
    
    // Verify import worked correctly
    expect(isNodeImporting(importedNode)).toBe(true);
    
    const importRef = getImportReference(importedNode);
    expect(importRef).toEqual({
      targetTreeId: 'target-tree-1',
      targetNodeId: 'target-node-1'
    });
    
    // Verify children are hidden but preserved
    expect(importedNode.childrenVisible).toBe(false);
    expect(importedNode.children).toEqual([]);
    expect(importedNode.originalChildren).toEqual(originalNode.children);
    
    // Verify recipe selection is preserved
    expect(importedNode.selectedRecipeId).toBe('recipe-iron-rod-standard');
    expect(importedNode.availableRecipes).toEqual([
      { id: 'recipe-iron-rod-standard', name: 'Standard Iron Rod' },
      { id: 'recipe-iron-rod-alt', name: 'Steel Rod' }
    ]);
    
    // Now unimport the node
    const unimportedNode = clearImportReference(importedNode);
    
    // Verify unimport worked correctly
    expect(isNodeImporting(unimportedNode)).toBe(false);
    expect(unimportedNode.childrenVisible).toBe(true);
    
    // Helper function to remove childrenVisible for comparison
    const removeChildrenVisible = (node) => {
      const result = { ...node };
      delete result.childrenVisible;
      
      if (result.children) {
        result.children = result.children.map(child => removeChildrenVisible(child));
      }
      
      return result;
    };
    
    // Compare structures without childrenVisible property
    const cleanUnimportedNode = removeChildrenVisible(unimportedNode);
    const cleanOriginalNode = removeChildrenVisible(originalNode);
    
    // Verify children are restored (ignoring childrenVisible property)
    expect(cleanUnimportedNode.children).toEqual(cleanOriginalNode.children);
    
    // Verify children have correct recipe selections
    expect(cleanUnimportedNode.children[0].selectedRecipeId).toBe('recipe-iron-ingot-standard');
    expect(cleanUnimportedNode.children[0].availableRecipes).toEqual([
      { id: 'recipe-iron-ingot-standard', name: 'Standard Iron Ingot' },
      { id: 'recipe-iron-ingot-alt', name: 'Pure Iron Ingot' }
    ]);
    
    // Verify nested children are restored
    expect(cleanUnimportedNode.children[0].children[0].id).toBe('iron-ore');
    expect(cleanUnimportedNode.children[0].children[0].amount).toBe(30);
  });

  test('should preserve excess values and recipe selections throughout import/unimport', () => {
    // Create a node with excess
    const nodeWithExcess = createTestNode();
    nodeWithExcess.excess = 5;
    nodeWithExcess.children[0].excess = 2;
    
    // Import it
    const importedNode = setImportReference(nodeWithExcess, 'target-tree-1', 'target-node-1');
    
    // Verify excess is preserved
    expect(importedNode.excess).toBe(5);
    
    // Change recipe selection on imported node
    importedNode.selectedRecipeId = 'recipe-iron-rod-alt';
    
    // Unimport it
    const unimportedNode = clearImportReference(importedNode);
    
    // Verify excess and recipe selection are preserved
    expect(unimportedNode.excess).toBe(5);
    expect(unimportedNode.selectedRecipeId).toBe('recipe-iron-rod-alt');
    expect(unimportedNode.children[0].excess).toBe(2);
  });
}); 