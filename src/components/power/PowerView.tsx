/**
 * PowerView Component
 * 
 * Main component for the power consumption view, showing machine power statistics
 * and consumption details.
 */

import React, { useState, useMemo, useCallback } from "react";
import { Machine } from "../../types/core";
import Card from "../common/Card";
import PowerViewHeader from "./PowerViewHeader";
import PowerViewFilters from "./PowerViewFilters";
import PowerViewSummary from "./PowerViewSummary";
import PowerViewItem from "./PowerViewItem";
import { theme } from "../../styles/theme";

export interface PowerViewProps {
  /**
   * List of machines to display power information for
   */
  machines: Machine[];
  
  /**
   * Whether the data is currently loading
   */
  isLoading?: boolean;
  
  /**
   * Error message if data loading failed
   */
  error?: string;
}

/**
 * Component for displaying power consumption information for all machines
 */
const PowerView: React.FC<PowerViewProps> = ({
  machines,
  isLoading = false,
  error,
}) => {
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'powerConsumption' | 'efficiency'>('powerConsumption');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for filters
  const [filters, setFilters] = useState({
    showManufacturerMk1: true,
    showManufacturerMk2: true,
    showManufacturerMk3: true,
    showExtractors: true,
    showGenerators: true,
  });
  
  // State for view mode
  const [compactView, setCompactView] = useState(false);
  
  // Filter change handlers
  const handleShowManufacturerMk1Change = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showManufacturerMk1: show }));
  }, []);
  
  const handleShowManufacturerMk2Change = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showManufacturerMk2: show }));
  }, []);
  
  const handleShowManufacturerMk3Change = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showManufacturerMk3: show }));
  }, []);
  
  const handleShowExtractorsChange = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showExtractors: show }));
  }, []);
  
  const handleShowGeneratorsChange = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showGenerators: show }));
  }, []);
  
  const handleCompactViewChange = useCallback((compact: boolean) => {
    setCompactView(compact);
  }, []);
  
  // Search and sort handlers
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);
  
  const handleSortByChange = useCallback((sort: 'name' | 'powerConsumption' | 'efficiency') => {
    setSortBy(sort);
  }, []);
  
  const handleSortDirectionChange = useCallback((direction: 'asc' | 'desc') => {
    setSortDirection(direction);
  }, []);
  
  // Filter and sort machines
  const filteredAndSortedMachines = useMemo(() => {
    if (!machines) return [];
    
    // Filter by search term and machine type
    const filtered = machines.filter(machine => {
      // Filter by machine type
      if (machine.type === 'manufacturer-mk1' && !filters.showManufacturerMk1) return false;
      if (machine.type === 'manufacturer-mk2' && !filters.showManufacturerMk2) return false;
      if (machine.type === 'manufacturer-mk3' && !filters.showManufacturerMk3) return false;
      if (machine.type === 'extractor' && !filters.showExtractors) return false;
      if (machine.type === 'generator' && !filters.showGenerators) return false;
      
      // Filter by search term
      if (searchTerm && !machine.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    // Sort the filtered machines
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'powerConsumption') {
        // For generators, use power production
        const aValue = a.type === 'generator' ? (a.powerProduction || 0) : (a.powerConsumption || 0);
        const bValue = b.type === 'generator' ? (b.powerProduction || 0) : (b.powerConsumption || 0);
        comparison = aValue - bValue;
      } else if (sortBy === 'efficiency') {
        const aEff = a.efficiency || 1;
        const bEff = b.efficiency || 1;
        comparison = aEff - bEff;
      }
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [machines, searchTerm, sortBy, sortDirection, filters]);
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <Card title="Power View">
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "200px",
          color: theme.colors.textSecondary 
        }}>
          Loading power data...
        </div>
      </Card>
    );
  }
  
  // If error, show error message
  if (error) {
    return (
      <Card title="Power View">
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "200px",
          color: theme.colors.error 
        }}>
          Error loading power data: {error}
        </div>
      </Card>
    );
  }
  
  // If no machines, show empty state
  if (!machines || machines.length === 0) {
    return (
      <Card title="Power View">
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "200px",
          color: theme.colors.textSecondary 
        }}>
          No machines found. Add machines to view power consumption.
        </div>
      </Card>
    );
  }
  
  return (
    <div className="power-view">
      {/* Search and sort controls */}
      <PowerViewHeader 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        sortDirection={sortDirection}
        onSortDirectionChange={handleSortDirectionChange}
      />
      
      {/* Filter controls */}
      <PowerViewFilters 
        showManufacturerMk1={filters.showManufacturerMk1}
        onShowManufacturerMk1Change={handleShowManufacturerMk1Change}
        showManufacturerMk2={filters.showManufacturerMk2}
        onShowManufacturerMk2Change={handleShowManufacturerMk2Change}
        showManufacturerMk3={filters.showManufacturerMk3}
        onShowManufacturerMk3Change={handleShowManufacturerMk3Change}
        showExtractors={filters.showExtractors}
        onShowExtractorsChange={handleShowExtractorsChange}
        showGenerators={filters.showGenerators}
        onShowGeneratorsChange={handleShowGeneratorsChange}
        compactView={compactView}
        onCompactViewChange={handleCompactViewChange}
      />
      
      {/* Summary component */}
      <PowerViewSummary 
        machines={machines}
        filters={filters}
      />
      
      {/* No results message */}
      {filteredAndSortedMachines.length === 0 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          padding: "32px",
          color: theme.colors.textSecondary,
          backgroundColor: theme.colors.cardBackground,
          borderRadius: theme.border.radius,
          border: `1px solid ${theme.colors.border}`,
        }}>
          No machines match your search criteria
        </div>
      )}
      
      {/* Machine list */}
      <div className="power-view-items">
        {filteredAndSortedMachines.map(machine => (
          <PowerViewItem 
            key={machine.id}
            machine={machine}
            compactView={compactView}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(PowerView); 