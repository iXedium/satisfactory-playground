import React from 'react';
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

interface BaselineValues {
  machineCount: number;
  machineMultiplier: number;
}

type ChangeType = 'increased' | 'decreased' | 'unchanged';

interface MachineDetailsProps {
  machine: Machine;
  machineCount: number;
  onMachineCountChange: (count: number) => void;
  machineMultiplier?: number;
  onMachineMultiplierChange?: (multiplier: number) => void;
  showMachineMultiplier?: boolean;
  onOptimizeMachines: () => void;
  onOptimizeAllMachines?: () => void;
  size?: IconSize;
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  // Comparison baseline props
  showBaseline?: boolean;
  baselineValues?: BaselineValues | null;
  changes?: {
    machineCount: ChangeType;
    machineMultiplier: ChangeType;
  };
  isNew?: boolean;
}

const MachineDetails: React.FC<MachineDetailsProps> = ({
  machine,
  machineCount,
  onMachineCountChange,
  machineMultiplier = 1,
  onMachineMultiplierChange,
  showMachineMultiplier = false,
  onOptimizeMachines,
  onOptimizeAllMachines,
  size = "large",
  containerStyle,
  contentStyle,
  showBaseline = false,
  baselineValues = null,
  changes,
  isNew = false,
}) => {

  return (
    <div
      className={`machine-details ${showBaseline ? 'machine-details--with-baseline' : ''}`}
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
            onOptimizeAllMachines={onOptimizeAllMachines}
            showBaseline={showBaseline}
            baselineValues={baselineValues}
            changes={changes}
            isNew={isNew}
          />
        </div>
      </div>
    </div>
  );
};

export default MachineDetails; 