import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { logger } from '../../../utils/logger';
import { getRecipeById } from '../../../data';
import { DependencyNode } from '../../../types';
import { 
  setRecipeSelection, 
  updateNodeProperties
} from '../store';
import { 
  autoImportNodeChildrenThunk, 
  requestDependencyCheckThunk, 
} from '../store/importExportLogic';
import { getImportReference } from '../../../utils/nodeReferenceUtils';
import { 
  calculateDependencyTree,
  findNodeById,
} from '../../../utils';
import { 
  beginHistoryTransaction, 
  commitHistoryTransaction 
} from '../store/historyMiddleware';

interface PlannerRecipeManagementProps {
  autoImportEnabled: boolean;
  excessMap: Record<string, number>;
}

export const usePlannerRecipeManagement = ({
  autoImportEnabled,
  excessMap,
}: PlannerRecipeManagementProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const tabId = useSelector((s: RootState) => s.workspace.activeTabId) || 'default';
  const dependencies = useSelector((state: RootState) => state.planners[tabId]?.dependencies ?? {
    dependencyTrees: {} as Record<string, DependencyNode>,
    accumulatedDependencies: {},
    highlightedNodeId: null,
    manualTreeOrder: [] as string[],
    externalImports: {},
    errors: [],
    lastUpdateTime: 0,
  });
  const recipeSelections = useSelector((state: RootState) => state.planners[tabId]?.recipeSelections.selections ?? {});

  const handleTreeRecipeChange = useCallback(async (nodeId: string, recipeId: string) => {
    const currentTrees = dependencies.dependencyTrees;
    
    let treeId = '';
    let nodeToUpdate: DependencyNode | null = null;
    for (const id in currentTrees) {
      nodeToUpdate = findNodeById(currentTrees[id], nodeId);
      if (nodeToUpdate) {
        treeId = id;
        break;
      }
    }

    if (!nodeToUpdate || !treeId) {
      logger.error(`[Recipe Change] Node ${nodeId} not found in any tree.`);
      return;
    }

    // Start history transaction for recipe change
    dispatch(beginHistoryTransaction(`Change recipe for ${nodeToUpdate.id}`) as unknown as Parameters<typeof dispatch>[0]);

    try {
      const oldImportTargetIds = (nodeToUpdate.children || [])
          .map(child => getImportReference(child)?.targetTreeId)
          .filter((id): id is string => !!id);

      const newRecipe = await getRecipeById(recipeId);
      if (!newRecipe) {
          logger.error(`[Recipe Change] Recipe ${recipeId} not found.`);
          dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
          return;
      }

      dispatch(setRecipeSelection({ nodeId, recipeId }));

      const drivingAmount = (nodeToUpdate.amount || 0) + (excessMap[nodeId] || 0);
      let newChildren: DependencyNode[] = [];
      try {
          const tempRecalculatedNode = await calculateDependencyTree(
              nodeToUpdate.id,         
              drivingAmount,
              recipeId,                
              { ...recipeSelections, [nodeId]: recipeId }, 
              nodeToUpdate.depth ?? 0, 
              [],                      
              nodeToUpdate.uniqueId, // Use this node's uniqueId as parentId for children
              excessMap,
              {},                      
              currentTrees,
              [], // visited
              dependencies.externalImports
          );
          newChildren = tempRecalculatedNode?.children || [];
      } catch (error) {
          logger.error('[Recipe Change] Error recalculating children:', error);
          dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
          return;
      }

      try {
          await dispatch(updateNodeProperties({ 
              nodeId: nodeId, 
              updatedNode: { recipe: newRecipe, children: newChildren }
          }));
      } catch (error) {
          logger.error(`[Recipe Change] Error dispatching node update for ${nodeId}:`, error);
          dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
          return;
      }
      
      if (autoImportEnabled) {
          try {
              await dispatch(autoImportNodeChildrenThunk({ parentNodeId: nodeId, tabId }));
          } catch (error) {
              logger.error(`[Recipe Change] Error during autoImportNodeChildrenThunk for ${nodeId}:`, error);
          }
        }
        

      for (const oldTargetId of oldImportTargetIds) {
          try {
              dispatch(requestDependencyCheckThunk({ 
                  tabId,
                  nodeIdToCheck: oldTargetId, 
                  disconnectedConsumerId: nodeId
              }));
          } catch (error) {
              logger.error(`[Recipe Change] Error dispatching check for old target ${oldTargetId}:`, error);
          }
      }

      // Commit transaction
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
    } catch (error) {
      dispatch(commitHistoryTransaction() as unknown as Parameters<typeof dispatch>[0]);
      throw error;
    }

  }, [dependencies, recipeSelections, dispatch, autoImportEnabled, excessMap]);

  return {
    handleTreeRecipeChange,
  };
}; 