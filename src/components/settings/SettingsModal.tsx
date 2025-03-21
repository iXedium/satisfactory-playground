/**
 * SettingsModal Component
 * 
 * Modal wrapper for the Settings component.
 */

import React from "react";
import { Modal } from "../../components/common";
import Settings from "./Settings";

export interface SettingsModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  
  /**
   * Callback when the modal is closed
   */
  onClose: () => void;
  
  /**
   * Callback when settings are saved
   */
  onSave?: () => void;
  
  /**
   * Callback when settings are reset
   */
  onReset?: () => void;
}

/**
 * Modal wrapper for the Settings component
 */
const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onReset,
}) => {
  // Handle save and close
  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="large"
    >
      <Settings
        isModal={true}
        onSave={handleSave}
        onReset={onReset}
      />
    </Modal>
  );
};

export default React.memo(SettingsModal); 