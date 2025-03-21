import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import ImportExportSection from './ImportExportSection';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Import/Export Modal Component
 * 
 * Modal dialog for importing and exporting application data
 */
const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Import/Export Data
          </DialogTitle>
          <DialogDescription>
            Manage your application data by importing or exporting it
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <ImportExportSection />
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportExportModal; 