import React from 'react';
import { theme } from '../../styles/theme';
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
  // Section container styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.border.radius,
    border: `1px solid ${theme.colors.dropdown.border}`,
    padding: `${sizes.spacing.medium} ${sizes.spacing.small}`,
    display: "flex",
    alignItems: "center",
    height: "100%",
    borderLeft: `4px solid ${theme.colors.secondary}`,
    flex: 1,
    maxWidth: "265px",
    position: "relative",
    zIndex: sizes.zIndex.base,
    ...containerStyle
  };

  return (
    <div
      style={sectionStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Machine icon */}
      <div style={{ marginRight: sizes.spacing.large }}>
        <Icon itemId={machine.id} size={size} />
      </div>

      {/* Machine details in column layout */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: sizes.spacing.large,
          position: "relative",
          zIndex: sizes.zIndex.base,
          ...contentStyle
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Machine name */}
        <div
          style={{
            fontWeight: "bold",
            color: theme.colors.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: sizes.fontSize.large,
          }}
        >
          {machine.name}
        </div>

        {/* Machine controls in row */}
        <div
          style={{
            display: "flex",
            gap: sizes.spacing.xsmall,
            alignItems: "center",
            position: "relative",
            zIndex: sizes.zIndex.controls,
          }}
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