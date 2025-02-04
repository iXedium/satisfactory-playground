import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem2, TreeItem2Props } from "@mui/x-tree-view/TreeItem2";
import { DependencyNode } from "../utils/calculateDependencyTree";
import ItemNode from "./ItemNode";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { setExpandedNodes } from "../features/treeUiSlice";
import { styled } from '@mui/system';
import { TreeItemProps } from '@mui/x-tree-view';

interface DependencyTreeProps {
  dependencyTree: DependencyNode;
  onRecipeChange?: (nodeId: string, recipeId: string) => void;
}

// Create a type for memoization keys
type TreeItemKey = {
  nodeId: string;
  amount: number;
  isRoot: boolean;
  selectedRecipe?: string;
};

const logPerf = (label: string, start: number) => {
  const elapsed = performance.now() - start;
  // console.log(`[${new Date().toISOString()}] ${label}: ${elapsed.toFixed(2)}ms`);
};

// Add new MemoizedItemNode component to prevent label re-renders
const MemoizedItemNode = React.memo(({ 
  node,
  isRoot,
  onRecipeChange 
}: { 
  node: DependencyNode;
  isRoot: boolean;
  onRecipeChange: (nodeId: string, recipeId: string) => void;
}) => (
  <ItemNode
    itemId={node.id}
    amount={node.amount}
    isRoot={isRoot}
    isByproduct={node.isByproduct}
    recipes={node.availableRecipes}
    selectedRecipeId={node.selectedRecipeId}
    onRecipeChange={(recipeId) => {
      if (recipeId !== node.selectedRecipeId) {
        onRecipeChange(node.uniqueId, recipeId);
      }
    }}
  />
));

MemoizedItemNode.displayName = 'MemoizedItemNode';

const MemoizedTreeItem = React.memo(({ 
  node, 
  path, 
  isRoot, 
  onRecipeChange 
}: { 
  node: DependencyNode; 
  path: string; 
  isRoot: boolean; 
  onRecipeChange: (nodeId: string, recipeId: string) => void; 
}) => {
  const start = performance.now();
  console.log(`[${new Date().toISOString()}] Starting TreeItem render: ${path}`);

  const result = (
    <TreeItem2
      key={path}
      itemId={path}  // Only use itemId for TreeItem2
      label={
        <MemoizedItemNode
          node={node}
          isRoot={isRoot}
          onRecipeChange={onRecipeChange}
        />
      }
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
      }}
    >
      {node.children?.map((child, index) => (
        <MemoizedTreeItem
          key={`${path}-${index}`}
          node={child}
          path={`${path}-${index}`}
          isRoot={false}
          onRecipeChange={onRecipeChange}
        />
      ))}
    </TreeItem2>
  );
  
  React.useEffect(() => {
    logPerf(`TreeItem ${path} mounted/updated`, start);
  });
  
  return result;
}, (prevProps, nextProps) => {
  // Optimize memo comparison
  return prevProps.path === nextProps.path &&
         prevProps.node.amount === nextProps.node.amount &&
         prevProps.node.selectedRecipeId === nextProps.node.selectedRecipeId &&
         prevProps.isRoot === nextProps.isRoot;
});

MemoizedTreeItem.displayName = 'MemoizedTreeItem';

const noop = (nodeId: string, recipeId: string) => {};

// Create a styled component to override Collapse behavior
const InstantCollapse = styled('div')({
  '& .MuiCollapse-root': {
    transition: 'none !important',
    display: 'block !important'
  },
  '& .MuiCollapse-wrapper': {
    display: 'block !important',
    visibility: 'visible !important',
    transform: 'none !important'
  },
  '& .MuiCollapse-wrapperInner': {
    visibility: 'visible !important',
    transform: 'none !important',
    display: 'block !important'
  },
  '& .MuiTreeItem-content': {
    transition: 'none !important'
  },
  '& .MuiTreeItem2-group': {  // Updated selector for TreeItem2
    margin: 0,
    padding: 0,
    marginLeft: '17px'
  }
});

const DependencyTree: React.FC<DependencyTreeProps> = ({ dependencyTree, onRecipeChange = noop }) => {
  const updateStartTime = React.useRef<number>(0);
  const mutationStartTime = React.useRef<number>(0);
  const dispatch = useDispatch();
  const expandedIds = useSelector((state: RootState) => state.treeUi.expandedNodes);
  const [isExpanding, setIsExpanding] = useState(false);

  // Cache tree structure to prevent recalculation
  const treeStructure = useMemo(() => {
    const structure = new Map<string, DependencyNode>();
    const buildMap = (node: DependencyNode, path: string) => {
      structure.set(path, node);
      node.children?.forEach((child, index) => {
        buildMap(child, `${path}-${index}`);
      });
    };
    buildMap(dependencyTree, dependencyTree.uniqueId);
    return structure;
  }, [dependencyTree]);

  // Optimize expanded state handling
  const handleExpandedChange = useCallback((_event: any, newExpandedIds: string[]) => {
    updateStartTime.current = performance.now();
    mutationStartTime.current = performance.now();
    console.log(`[${new Date().toISOString()}] Expansion cycle started`);
    
    dispatch(setExpandedNodes(newExpandedIds));
  }, [dispatch]);

  // Track actual DOM updates
  const treeRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (treeRef.current) {
      // Use ResizeObserver instead of MutationObserver
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === treeRef.current) {
            console.log(`[${new Date().toISOString()}] Tree size changed`, {
              height: entry.contentRect.height,
              timeSinceStart: performance.now() - mutationStartTime.current
            });
          }
        }
      });

      resizeObserver.observe(treeRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Replace the two useEffects that track layout/expansion completion with a single effect:
  useEffect(() => {
    if (updateStartTime.current > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          logPerf('Complete visual update', updateStartTime.current);
          updateStartTime.current = 0;
        });
      });
    }
  }, [expandedIds]);

  // Track tree rendering
  useEffect(() => {
    const renderStart = performance.now();
    return () => {
      logPerf('Tree render cycle', renderStart);
    };
  });

  // Create a stable callback with guaranteed function
  const handleRecipeChange = React.useCallback((nodeId: string, recipeId: string) => {
    onRecipeChange(nodeId, recipeId);
  }, [onRecipeChange]);

  return (
    <InstantCollapse>
      <div 
        ref={treeRef}
        style={{ 
          textAlign: "left",
          position: 'relative',
          overflow: 'visible'
        }}
      >
        <SimpleTreeView
          aria-label="dependency-tree"
          expandedItems={expandedIds}
          onExpandedItemsChange={handleExpandedChange}
          disableSelection
          sx={{ 
            '& .MuiTreeItem2-root': {  // Updated selector
              display: 'block',
              contain: 'content'
            }
          }}
        >
          {useMemo(() => (
            <MemoizedTreeItem
              node={dependencyTree}
              path={dependencyTree.uniqueId}
              isRoot={true}
              onRecipeChange={handleRecipeChange}
            />
          ), [dependencyTree, handleRecipeChange])}
        </SimpleTreeView>
      </div>
    </InstantCollapse>
  );
};

export default React.memo(DependencyTree);
