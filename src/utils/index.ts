export * from './calculateAccumulatedFromTree';
export * from './calculateDependencyTree';
// Explicitly export only needed things from nodeReferenceUtils to avoid ambiguity
export type { ImportReference } from './nodeReferenceUtils';
export { 
  isNodeImporting, 
  hasImportReference, 
  getImportReference, 
  getImportReferenceOnly, 
  setImportReference, 
  clearImportReference, 
  wouldCreateCircularReference, 
  findTargetNode, 
  toggleChildrenVisibility, 
  traverseVisibleNodes 
} from './nodeReferenceUtils';
export * from './treeDiffing'; 
export * from './treeUtils';
