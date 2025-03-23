import { RootState } from '../../store';

interface ExportData {
  dependencies: any;
  recipeSelections: any;
  excessMap: any;
  machineCountMap: any;
  machineMultiplierMap: any;
  viewMode: string;
  expandedNodes: Record<string, boolean>;
  nodeExtensionOverrides: any;
  settings: any;
}

/**
 * Exports application data to a JSON file
 * @param state Current Redux state
 */
export const exportData = (state: RootState): void => {
  try {
    const exportData: ExportData = {
      dependencies: state.dependencies,
      recipeSelections: state.recipeSelections,
      excessMap: {}, // Stub - this property isn't in the current state structure
      machineCountMap: state.machines?.machineCount || {},
      machineMultiplierMap: state.machines?.machineMultiplier || {},
      viewMode: state.ui.viewMode,
      expandedNodes: state.ui.expandedNodes,
      nodeExtensionOverrides: state.ui.nodeExtensionOverrides,
      settings: state.settings,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileName = `satisfactory-planner-data-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

/**
 * Imports application data from a JSON file
 * @param fileContent JSON content to import
 * @returns Parsed data or throws an error
 */
export const importData = (fileContent: string): ExportData => {
  try {
    const data = JSON.parse(fileContent) as ExportData;
    
    // Validate required data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }
    
    return data;
  } catch (error) {
    console.error('Failed to import data:', error);
    throw new Error('Failed to import data. Please check the file format and try again.');
  }
};

/**
 * Reads a file and returns its contents as a string
 * @param file File to read
 * @returns Promise resolving to the file contents
 */
export const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}; 