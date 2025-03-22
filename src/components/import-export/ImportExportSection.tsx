import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { useImportExport } from '../../hooks/useImportExport';
import { CloudArrowUpIcon, CloudArrowDownIcon, ExclamationTriangleIcon } from '../icons';

/**
 * Import/Export Section Component
 * 
 * Displays import and export functionality in the settings panel
 */
const ImportExportSection: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isImporting,
    isExporting,
    importError,
    exportError,
    lastImportDate,
    lastExportDate,
    exportAllData,
    importDataFromFile,
    clearImportError,
    clearExportError
  } = useImportExport();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      importDataFromFile(files[0]);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle import button click
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Card className="mb-4 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Data Management</CardTitle>
        <CardDescription>Import and export your application data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export section */}
        <div>
          <h3 className="font-medium mb-2">Export Data</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Export all your data to a JSON file for backup or transfer.
          </p>
          <Button
            variant="outline"
            onClick={exportAllData}
            disabled={isExporting}
            className="w-full sm:w-auto flex items-center justify-center"
          >
            <CloudArrowDownIcon className="h-5 w-5 mr-2" />
            {isExporting ? "Exporting..." : "Export to File"}
          </Button>
          {lastExportDate && (
            <p className="text-xs text-muted-foreground mt-2">
              Last export: {formatDate(lastExportDate)}
            </p>
          )}
          {exportError && (
            <Alert variant="destructive" className="mt-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Export Error</AlertTitle>
              <AlertDescription>
                {exportError}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={clearExportError}
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Import section */}
        <div>
          <h3 className="font-medium mb-2">Import Data</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Import data from a previously exported JSON file.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isImporting}
            className="w-full sm:w-auto flex items-center justify-center"
          >
            <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            {isImporting ? "Importing..." : "Import from File"}
          </Button>
          {lastImportDate && (
            <p className="text-xs text-muted-foreground mt-2">
              Last import: {formatDate(lastImportDate)}
            </p>
          )}
          {importError && (
            <Alert variant="destructive" className="mt-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Import Error</AlertTitle>
              <AlertDescription>
                {importError}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={clearImportError}
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Warning */}
        <Alert className="mt-4">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Importing data will replace your current application data. Make sure to export your current data as a backup before importing.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ImportExportSection; 