import React from 'react';
// import { theme } from '../../styles/theme'; // REMOVED - No longer needed directly
import { sizes } from '../../styles/constants';
import Icon, { IconSize } from '../Icon';
import MachineControls from './MachineControls';

interface Machine {
  id: string;
  name: string;
  speed: number;
  type: string;
  usage: number;
  modules?: number;
}

interface MachineDetailsProps {
  machine: Machine;
  machineCount: number;
  onMachineCountChange: (count: number) => void;
  machineMultiplier?: number;
  onMachineMultiplierChange?: (multiplier: number) => void;
  showMachineMultiplier?: boolean;
  onOptimizeMachines: () => void;
  size?: IconSize;
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}

const MachineDetails: React.FC<MachineDetailsProps> = ({
  machine,
  machineCount,
  onMachineCountChange,
  machineMultiplier = 1,
  onMachineMultiplierChange,
  showMachineMultiplier = false,
  onOptimizeMachines,
  size = "large",
  containerStyle,
  contentStyle,
}) => {
  return (
    <div
      className="machine-details"
      style={containerStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Machine icon */}
      <div 
        className="machine-details-icon-container"
      >
        <Icon itemId={machine.id} size={size} />
      </div>

      {/* Machine details content */}
      <div
        className="machine-details-content"
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          zIndex: sizes.zIndex.base,
          ...contentStyle
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Machine name */}
        <div
          className="machine-details-name"
        >
          {machine.name}
        </div>

        {/* Machine controls container */}
        <div
          className="machine-details-controls-container"
          onClick={(e) => e.stopPropagation()}
        >
          <MachineControls
            machineCount={machineCount}
            onMachineCountChange={onMachineCountChange}
            machineMultiplier={machineMultiplier}
            onMachineMultiplierChange={onMachineMultiplierChange}
            showMachineMultiplier={showMachineMultiplier}
            onOptimizeMachines={onOptimizeMachines}
          />
        </div>
      </div>
    </div>
  );
};

export default MachineDetails; 