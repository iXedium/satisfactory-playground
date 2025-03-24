import React from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import { DependencyNode } from '../../utils/calculateDependencyTree';

interface ImportExportProps {
  dependencyTrees: Record<string, DependencyNode>;
  recipeSelections: Record<string, string>;
  excessMap: Record<string, number>;
  machineCountMap: Record<string, number>;
  machineMultiplierMap: Record<string, number>;
  onImport: (data: any) => void;
  onClearData: () => void;
  containerStyle?: React.CSSProperties;
}

const ImportExport: React.FC<ImportExportProps> = ({
  dependencyTrees,
  recipeSelections,
  excessMap,
  machineCountMap,
  machineMultiplierMap,
  onImport,
  onClearData,
  containerStyle,
}) => {
  // Export all data as JSON
  const handleExport = () => {
    try {
      const exportData = {
        dependencies: {
          dependencyTrees
        },
        recipeSelections,
        excessMap,
        machineCountMap,
        machineMultiplierMap,
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `satisfactory-planner-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. See console for details.");
    }
  };
  
  // Import data from a JSON file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (e.target?.result) {
          const importedData = JSON.parse(e.target.result as string);
          onImport(importedData);
        }
      } catch (error) {
        console.error("Error importing data:", error);
        alert("Failed to import data. The file may be corrupted or in the wrong format.");
      }
    };
    
    reader.readAsText(file);
  };
  
  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme.colors.primary,
    color: theme.colors.buttonText,
    border: 'none',
    borderRadius: theme.border.radius,
    padding: `${sizes.spacing.small} ${sizes.spacing.large}`,
    fontSize: sizes.fontSize.standard,
    cursor: 'pointer',
    transition: 'all 0.2s',
    margin: `${sizes.spacing.small} 0`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sizes.spacing.small,
  };
  
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: sizes.spacing.medium,
        padding: sizes.spacing.medium,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.border.radius,
        border: `1px solid ${theme.colors.dropdown.border}`,
        ...containerStyle
      }}
    >
      <h3 style={{ margin: `0 0 ${sizes.spacing.small} 0`, color: theme.colors.text }}>
        Import / Export
      </h3>
      
      <div style={{ display: 'flex', gap: sizes.spacing.medium }}>
        <button 
          style={buttonStyle}
          onClick={handleExport}
          title="Export all data to a JSON file"
        >
          <span>Export Data</span>
          <span>↓</span>
        </button>
        
        <label 
          style={{
            ...buttonStyle,
            backgroundColor: theme.colors.secondary,
          }}
          title="Import data from a JSON file"
        >
          <span>Import Data</span>
          <span>↑</span>
          <input 
            type="file" 
            accept=".json" 
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      
      <button
        style={{
          ...buttonStyle,
          backgroundColor: theme.colors.error,
          marginTop: sizes.spacing.small,
        }}
        onClick={onClearData}
        title="Clear all saved data"
      >
        Clear Saved Data
      </button>
    </div>
  );
};

export default ImportExport; 