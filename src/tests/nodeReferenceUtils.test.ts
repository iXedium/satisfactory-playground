import {
  isNodeImporting,
  getImportReference,
  setImportReference,
  clearImportReference,
  findNodeById,
  findTargetNode,
  toggleChildrenVisibility,
  traverseVisibleNodes
} from '../utils/nodeReferenceUtils';
import { DependencyNode } from '../utils/calculateDependencyTree';

describe('Node Reference Utils', () => {
  // Sample nodes for testing
  const basicNode: DependencyNode = {
    id: 'iron-rod',
    amount: 10,
    uniqueId: 'iron-rod-1',
    children: [],
    selectedRecipeId: 'recipe-1',
    availableRecipes: ['recipe-1', 'recipe-2']
  };
  
  const legacyImportNode: DependencyNode = {
    id: 'iron-rod',
    amount: 10,
    uniqueId: 'iron-rod-1',
    isImport: true,
    importedFrom: 'tree-1',
    children: [],
    originalChildren: [],
    selectedRecipeId: 'recipe-1'
  };
  
  const newImportNode: DependencyNode = {
    id: 'iron-rod',
    amount: 10,
    uniqueId: 'iron-rod-1',
    importReference: {
      targetTreeId: 'tree-1',
      targetNodeId: 'root'
    },
    children: [],
    childrenVisible: false,
    selectedRecipeId: 'recipe-1',
    availableRecipes: ['recipe-1', 'recipe-2']
  };
  
  describe('isNodeImporting', () => {
    it('should return false for regular nodes', () => {
      expect(isNodeImporting(basicNode)).toBe(false);
    });
    
    it('should return true for legacy import nodes', () => {
      expect(isNodeImporting(legacyImportNode)).toBe(true);
    });
    
    it('should return true for new import nodes', () => {
      expect(isNodeImporting(newImportNode)).toBe(true);
    });
  });
  
  describe('getImportReference', () => {
    it('should return null for regular nodes', () => {
      expect(getImportReference(basicNode)).toBeNull();
    });
    
    it('should return reference for legacy import nodes', () => {
      const reference = getImportReference(legacyImportNode);
      expect(reference).toEqual({
        targetTreeId: 'tree-1',
        targetNodeId: 'root'
      });
    });
    
    it('should return reference for new import nodes', () => {
      const reference = getImportReference(newImportNode);
      expect(reference).toEqual({
        targetTreeId: 'tree-1',
        targetNodeId: 'root'
      });
    });
  });
  
  describe('setImportReference', () => {
    it('should set import reference on a regular node', () => {
      const updatedNode = setImportReference(basicNode, 'tree-2', 'node-123');
      
      // Should add the reference
      expect(updatedNode.importReference).toEqual({
        targetTreeId: 'tree-2',
        targetNodeId: 'node-123'
      });
      
      // Should hide children
      expect(updatedNode.childrenVisible).toBe(false);
      
      // Should set legacy properties too
      expect(updatedNode.isImport).toBe(true);
      expect(updatedNode.importedFrom).toBe('tree-2');
      
      // Should maintain other properties
      expect(updatedNode.id).toBe(basicNode.id);
      expect(updatedNode.amount).toBe(basicNode.amount);
      expect(updatedNode.selectedRecipeId).toBe(basicNode.selectedRecipeId);
      expect(updatedNode.availableRecipes).toBe(basicNode.availableRecipes);
    });
    
    it('should update import reference on an existing import node', () => {
      const updatedNode = setImportReference(newImportNode, 'tree-3', 'node-456');
      
      expect(updatedNode.importReference).toEqual({
        targetTreeId: 'tree-3',
        targetNodeId: 'node-456'
      });
    });
  });
  
  describe('clearImportReference', () => {
    it('should clear import reference from a node', () => {
      const updatedNode = clearImportReference(newImportNode);
      
      // Should remove the reference
      expect(updatedNode.importReference).toBeUndefined();
      
      // Should show children
      expect(updatedNode.childrenVisible).toBe(true);
      
      // Should clear legacy properties
      expect(updatedNode.isImport).toBe(false);
      expect(updatedNode.importedFrom).toBeUndefined();
      
      // Should maintain other properties
      expect(updatedNode.id).toBe(newImportNode.id);
      expect(updatedNode.amount).toBe(newImportNode.amount);
      expect(updatedNode.selectedRecipeId).toBe(newImportNode.selectedRecipeId);
      expect(updatedNode.availableRecipes).toEqual(newImportNode.availableRecipes);
    });
    
    it('should preserve recipe selection when clearing import', () => {
      // Create a node with recipe selection
      const nodeWithRecipe = {
        ...newImportNode,
        selectedRecipeId: 'special-recipe',
        availableRecipes: ['recipe-1', 'special-recipe']
      };
      
      const updatedNode = clearImportReference(nodeWithRecipe);
      
      // Recipe selection should be preserved
      expect(updatedNode.selectedRecipeId).toBe('special-recipe');
      expect(updatedNode.availableRecipes).toEqual(['recipe-1', 'special-recipe']);
    });
  });
  
  describe('findNodeById', () => {
    // Create a tree structure for testing
    const treeRoot: DependencyNode = {
      id: 'iron-plate',
      amount: 20,
      uniqueId: 'root',
      children: [
        {
          id: 'iron-rod',
          amount: 10,
          uniqueId: 'child-1',
          children: [
            {
              id: 'screw',
              amount: 5,
              uniqueId: 'grandchild-1',
              children: []
            }
          ]
        },
        {
          id: 'copper-wire',
          amount: 15,
          uniqueId: 'child-2',
          children: []
        }
      ]
    };
    
    it('should find a node at the root level', () => {
      const found = findNodeById(treeRoot, 'root');
      expect(found).toBe(treeRoot);
    });
    
    it('should find a node at the first level', () => {
      const found = findNodeById(treeRoot, 'child-1');
      expect(found?.id).toBe('iron-rod');
    });
    
    it('should find a node at a deeper level', () => {
      const found = findNodeById(treeRoot, 'grandchild-1');
      expect(found?.id).toBe('screw');
    });
    
    it('should return null if node is not found', () => {
      const found = findNodeById(treeRoot, 'non-existent');
      expect(found).toBeNull();
    });
    
    it('should search in originalChildren for an import node', () => {
      // Create a node with originalChildren
      const importNodeWithOriginals: DependencyNode = {
        id: 'motor',
        amount: 10,
        uniqueId: 'import-node',
        importReference: {
          targetTreeId: 'tree-1',
          targetNodeId: 'root'
        },
        children: [],
        originalChildren: [
          {
            id: 'stator',
            amount: 5,
            uniqueId: 'original-child-1',
            children: []
          }
        ]
      };
      
      const found = findNodeById(importNodeWithOriginals, 'original-child-1');
      expect(found?.id).toBe('stator');
    });
  });
  
  describe('toggleChildrenVisibility', () => {
    it('should toggle children visibility from true to false', () => {
      const node = { ...basicNode, childrenVisible: true };
      const updated = toggleChildrenVisibility(node);
      expect(updated.childrenVisible).toBe(false);
    });
    
    it('should toggle children visibility from false to true', () => {
      const node = { ...basicNode, childrenVisible: false };
      const updated = toggleChildrenVisibility(node);
      expect(updated.childrenVisible).toBe(true);
    });
    
    it('should toggle children visibility from undefined to false', () => {
      const node = { ...basicNode }; // childrenVisible is undefined
      const updated = toggleChildrenVisibility(node);
      expect(updated.childrenVisible).toBe(false);
    });
    
    it('should set explicit visibility when provided', () => {
      const node = { ...basicNode, childrenVisible: true };
      
      // Force to false
      const updatedToFalse = toggleChildrenVisibility(node, false);
      expect(updatedToFalse.childrenVisible).toBe(false);
      
      // Force to true
      const updatedToTrue = toggleChildrenVisibility(node, true);
      expect(updatedToTrue.childrenVisible).toBe(true);
    });
  });
  
  describe('traverseVisibleNodes', () => {
    // Create a tree with visibility settings
    const visibilityTree: DependencyNode = {
      id: 'root',
      amount: 10,
      uniqueId: 'root',
      childrenVisible: true,
      children: [
        {
          id: 'child1',
          amount: 5,
          uniqueId: 'child1',
          childrenVisible: false, // Hidden children
          children: [
            {
              id: 'grandchild1',
              amount: 2,
              uniqueId: 'grandchild1',
              children: []
            }
          ]
        },
        {
          id: 'child2',
          amount: 5,
          uniqueId: 'child2',
          childrenVisible: true, // Visible children
          children: [
            {
              id: 'grandchild2',
              amount: 2,
              uniqueId: 'grandchild2',
              children: []
            }
          ]
        }
      ]
    };
    
    it('should only traverse visible nodes', () => {
      const visitedNodes: string[] = [];
      
      traverseVisibleNodes(visibilityTree, (node) => {
        visitedNodes.push(node.id);
      });
      
      // Should visit root, both children, but only grandchild of visible child
      expect(visitedNodes).toContain('root');
      expect(visitedNodes).toContain('child1');
      expect(visitedNodes).toContain('child2');
      expect(visitedNodes).toContain('grandchild2');
      expect(visitedNodes).not.toContain('grandchild1');
      expect(visitedNodes.length).toBe(4);
    });
  });
}); 