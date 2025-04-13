import { useState, useCallback, useMemo } from 'react';
import { GroupedItem } from './useGroupedAccumulatedItems'; // Import the type

type SortKey = "name" | "amount" | "depth";
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
  const [sortBy, setSortBy] = useState<SortKey>("name");
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
        
        // Apply type filters
        if (item.isByproduct && !showByproducts) return false;
        
        // Determine if it's a raw material (no recipe)
        const isRawMaterial = !item.recipes || item.recipes.length === 0;
        if (isRawMaterial && !showRawMaterials) return false;
        
        // Determine if it's an intermediate product
        const isIntermediate = !item.isByproduct && !isRawMaterial;
        if (isIntermediate && !showIntermediates) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Apply sorting
        let compareResult = 0;
        if (sortBy === "name") {
          compareResult = (a.name || "").localeCompare(b.name || "");
        } else if (sortBy === "amount") {
          compareResult = a.amount - b.amount;
        } else if (sortBy === "depth") {
          // Handle potential undefined depth gracefully
          compareResult = (a.depth ?? Infinity) - (b.depth ?? Infinity);
        }
        
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