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

describe('Node Reference Utilities', () => {
  let mockNode: DependencyNode;
  let mockTreesMap: Record<string, DependencyNode>;
  
  beforeEach(() => {
    // Set up a clean node for each test
    mockNode = {
      id: 'iron_ingot',
      amount: 15,
      uniqueId: 'tree-1-iron_ingot-1',
      children: [
        {
          id: 'iron_ore',
          amount: 15,
          uniqueId: 'tree-1-iron_ingot-1-iron_ore-2',
          children: [],
          excess: 0
        }
      ],
      excess: 0
    };
    
    // Set up mock trees map
    mockTreesMap = {
      'tree-1': {
        id: 'iron_rod',
        amount: 15,
        uniqueId: 'tree-1',
        isRoot: true,
        children: [mockNode],
        excess: 0
      },
      'tree-2': {
        id: 'iron_ingot',
        amount: 30,
        uniqueId: 'tree-2',
        isRoot: true,
        children: [
          {
            id: 'iron_ore',
            amount: 30,
            uniqueId: 'tree-2-iron_ore-1',
            children: [],
            excess: 0
          }
        ],
        excess: 0
      }
    };
  });
  
  describe('isNodeImporting', () => {
    it('should detect a node as importing with new reference system', () => {
      const importingNode = {
        ...mockNode,
        importReference: {
          targetTreeId: 'tree-2',
          targetNodeId: 'tree-2'
        }
      };
      
      expect(isNodeImporting(importingNode)).toBe(true);
    });
    
    it('should detect a node as importing with legacy system', () => {
      const importingNode = {
        ...mockNode,
        isImport: true,
        importedFrom: 'tree-2'
      };
      
      expect(isNodeImporting(importingNode)).toBe(true);
    });
    
    it('should return false for non-importing nodes', () => {
      expect(isNodeImporting(mockNode)).toBe(false);
    });
  });
  
  describe('getImportReference', () => {
    it('should get reference from new system', () => {
      const importingNode = {
        ...mockNode,
        importReference: {
          targetTreeId: 'tree-2',
          targetNodeId: 'tree-2-specific-node'
        }
      };
      
      const reference = getImportReference(importingNode);
      expect(reference).toEqual({
        targetTreeId: 'tree-2',
        targetNodeId: 'tree-2-specific-node'
      });
    });
    
    it('should convert from legacy system', () => {
      const importingNode = {
        ...mockNode,
        isImport: true,
        importedFrom: 'tree-2'
      };
      
      const reference = getImportReference(importingNode);
      expect(reference).toEqual({
        targetTreeId: 'tree-2',
        targetNodeId: 'root'
      });
    });
    
    it('should return null for non-importing nodes', () => {
      expect(getImportReference(mockNode)).toBeNull();
    });
  });
  
  describe('setImportReference', () => {
    it('should set reference properties and maintain backward compatibility', () => {
      const updatedNode = setImportReference(mockNode, 'tree-2', 'tree-2-specific-node');
      
      // Check new system properties
      expect(updatedNode.importReference).toEqual({
        targetTreeId: 'tree-2',
        targetNodeId: 'tree-2-specific-node'
      });
      expect(updatedNode.childrenVisible).toBe(false);
      
      // Check legacy properties
      expect(updatedNode.isImport).toBe(true);
      expect(updatedNode.importedFrom).toBe('tree-2');
    });
    
    it('should not modify the original node', () => {
      setImportReference(mockNode, 'tree-2', 'tree-2-specific-node');
      
      // Original should be unchanged
      expect(mockNode.importReference).toBeUndefined();
      expect(mockNode.isImport).toBeUndefined();
    });
  });
  
  describe('clearImportReference', () => {
    it('should clear all import-related properties', () => {
      // Set up an importing node
      const importingNode = setImportReference(mockNode, 'tree-2', 'tree-2-specific-node');
      
      // Clear the reference
      const clearedNode = clearImportReference(importingNode);
      
      // Check new system properties
      expect(clearedNode.importReference).toBeUndefined();
      expect(clearedNode.childrenVisible).toBe(true);
      
      // Check legacy properties
      expect(clearedNode.isImport).toBe(false);
      expect(clearedNode.importedFrom).toBeUndefined();
    });
  });
  
  describe('findNodeById', () => {
    it('should find a node by its uniqueId', () => {
      const tree = mockTreesMap['tree-1'];
      const found = findNodeById(tree, 'tree-1-iron_ingot-1-iron_ore-2');
      
      expect(found).toBeDefined();
      expect(found?.id).toBe('iron_ore');
    });
    
    it('should return null if node not found', () => {
      const tree = mockTreesMap['tree-1'];
      const found = findNodeById(tree, 'non-existent-id');
      
      expect(found).toBeNull();
    });
  });
  
  describe('findTargetNode', () => {
    it('should find the target node with new reference system', () => {
      // Use the actual ID of a child node
      const importingNode = setImportReference(
        mockNode, 
        'tree-2', 
        'tree-2-iron_ore-1'
      );
      
      const targetNode = findTargetNode(mockTreesMap, importingNode);
      
      expect(targetNode).toBeDefined();
      expect(targetNode?.id).toBe('iron_ore');
    });
    
    it('should find the target node with legacy system', () => {
      const importingNode = {
        ...mockNode,
        isImport: true,
        importedFrom: 'tree-2'
      };
      
      const targetNode = findTargetNode(mockTreesMap, importingNode);
      
      expect(targetNode).toBeDefined();
      expect(targetNode?.id).toBe('iron_ingot');
    });
    
    it('should return null if target tree not found', () => {
      const importingNode = setImportReference(
        mockNode, 
        'non-existent-tree', 
        'some-node-id'
      );
      
      expect(findTargetNode(mockTreesMap, importingNode)).toBeNull();
    });
  });
  
  describe('toggleChildrenVisibility', () => {
    it('should toggle children visibility from undefined to false', () => {
      const toggled = toggleChildrenVisibility(mockNode);
      expect(toggled.childrenVisible).toBe(false);
    });
    
    it('should toggle children visibility from false to true', () => {
      const hiddenNode = { ...mockNode, childrenVisible: false };
      const toggled = toggleChildrenVisibility(hiddenNode);
      expect(toggled.childrenVisible).toBe(true);
    });
  });
  
  describe('traverseVisibleNodes', () => {
    it('should traverse all nodes when visibility is not set', () => {
      const visitedNodes: string[] = [];
      
      traverseVisibleNodes(mockTreesMap['tree-1'], (node) => {
        visitedNodes.push(node.id);
      });
      
      expect(visitedNodes).toEqual(['iron_rod', 'iron_ingot', 'iron_ore']);
    });
    
    it('should not traverse children when visibility is false', () => {
      const tree = {
        ...mockTreesMap['tree-1'],
        children: [{
          ...mockNode,
          childrenVisible: false
        }]
      };
      
      const visitedNodes: string[] = [];
      
      traverseVisibleNodes(tree, (node) => {
        visitedNodes.push(node.id);
      });
      
      // Should only visit root and iron_ingot, but not its children
      expect(visitedNodes).toEqual(['iron_rod', 'iron_ingot']);
    });
  });
}); 