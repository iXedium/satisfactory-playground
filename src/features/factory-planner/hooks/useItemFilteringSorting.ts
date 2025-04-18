import { useState, useCallback } from 'react';
import { GroupedItem } from './useGroupedAccumulatedItems'; // Import the type

type SortKey = "name" | "amount" | "depth" | "hierarchy";
type SortDirection = "asc" | "desc";

interface UseItemFilteringSortingReturn {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  sortBy: SortKey;
  setSortBy: React.Dispatch<React.SetStateAction<SortKey>>;
  sortDirection: SortDirection;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  showByproducts: boolean;
  setShowByproducts: React.Dispatch<React.SetStateAction<boolean>>;
  showRawMaterials: boolean;
  setShowRawMaterials: React.Dispatch<React.SetStateAction<boolean>>;
  showIntermediates: boolean;
  setShowIntermediates: React.Dispatch<React.SetStateAction<boolean>>;
  getFilteredAndSortedItems: (items: GroupedItem[]) => GroupedItem[];
}

export const useItemFilteringSorting = (): UseItemFilteringSortingReturn => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("hierarchy");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showByproducts, setShowByproducts] = useState(true);
  const [showRawMaterials, setShowRawMaterials] = useState(true);
  const [showIntermediates, setShowIntermediates] = useState(true);

  const getFilteredAndSortedItems = useCallback((items: GroupedItem[]): GroupedItem[] => {
    return items
      .filter(item => {
        // Apply search filter
        const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm && !nameMatch) return false;
        
        // Apply type filters (using the new isRaw flag)
        if (item.isByproduct && !showByproducts) return false;
        if (item.isRaw && !showRawMaterials) return false;
        const isIntermediate = !item.isByproduct && !item.isRaw;
        if (isIntermediate && !showIntermediates) return false;
        
        return true;
      })
      .sort((a, b) => {
        let compareResult = 0;
        
        if (sortBy === "hierarchy") {
          // 1. Byproduct check (true > false, so byproducts sort last)
          if (a.isByproduct !== b.isByproduct) {
            compareResult = a.isByproduct ? 1 : -1;
          } 
          // 2. Raw material check (true > false, so raw materials sort after others)
          else if (a.isRaw !== b.isRaw) {
            compareResult = a.isRaw ? 1 : -1;
          }
          // 3. Depth check (apply asc/desc only here)
          else {
            const depthA = a.depth ?? Infinity;
            const depthB = b.depth ?? Infinity;
            compareResult = depthA - depthB;
            // Apply direction ONLY to the depth comparison
            return sortDirection === "asc" ? compareResult : -compareResult;
          }
          // For hierarchy sort, byproduct/raw order is fixed, ignore sortDirection here
          return compareResult; 
          
        } else if (sortBy === "name") {
          compareResult = (a.name || "").localeCompare(b.name || "");
        } else if (sortBy === "amount") {
          compareResult = a.amount - b.amount;
        } else if (sortBy === "depth") {
          // This case now behaves differently from hierarchy's depth sort
          // It sorts purely by depth without considering byproduct/raw status first.
          compareResult = (a.depth ?? Infinity) - (b.depth ?? Infinity);
        }
        
        // Apply direction for non-hierarchy sorts
        return sortDirection === "asc" ? compareResult : -compareResult;
      });
  }, [searchTerm, sortBy, sortDirection, showByproducts, showRawMaterials, showIntermediates]);

  return {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    showByproducts,
    setShowByproducts,
    showRawMaterials,
    setShowRawMaterials,
    showIntermediates,
    setShowIntermediates,
    getFilteredAndSortedItems,
  };
}; 