import React, { useState, useRef, useEffect } from 'react';
import StyledInput from './StyledInput';

interface BaselineValues {
  machineCount: number;
  machineMultiplier: number;
}

type ChangeType = 'increased' | 'decreased' | 'unchanged';

interface MachineControlsProps {
  machineCount: number;
  onMachineCountChange: (count: number) => void;
  machineMultiplier?: number;
  onMachineMultiplierChange?: (multiplier: number) => void;
  showMachineMultiplier?: boolean;
  onOptimizeMachines: () => void;
  onOptimizeAllMachines?: () => void;
  // Comparison baseline props
  showBaseline?: boolean;
  baselineValues?: BaselineValues | null;
  changes?: {
    machineCount: ChangeType;
    machineMultiplier: ChangeType;
  };
  isNew?: boolean;
}

const getChangeClass = (change: ChangeType): string => {
  switch (change) {
    case 'increased': return 'baseline-increased';
    case 'decreased': return 'baseline-decreased';
    default: return 'baseline-unchanged';
  }
};

const MachineControls: React.FC<MachineControlsProps> = ({
  machineCount,
  onMachineCountChange,
  machineMultiplier = 1,
  onMachineMultiplierChange,
  showMachineMultiplier = false,
  onOptimizeMachines,
  onOptimizeAllMachines,
  showBaseline = false,
  baselineValues = null,
  changes,
  isNew = false,
}) => {
  const [localMachineCount, setLocalMachineCount] = useState(machineCount);
  const [localMachineMultiplier, setLocalMachineMultiplier] = useState(machineMultiplier);
  const machineCountRef = useRef<HTMLInputElement>(null);
  const machineMultiplierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalMachineCount(machineCount);
  }, [machineCount]);

  useEffect(() => {
    setLocalMachineMultiplier(machineMultiplier);
  }, [machineMultiplier]);

  const handleMachineCountChange = (value: string) => {
    const numValue = Math.max(1, value === "" ? 1 : Math.floor(Number(value)));
    setLocalMachineCount(numValue);
    onMachineCountChange(numValue);
  };

  const handleMachineMultiplierChange = (value: string) => {
    if (!onMachineMultiplierChange) return;
    
    const numValue = Math.max(1, value === "" ? 1 : Math.floor(Number(value)));
    setLocalMachineMultiplier(numValue);
    onMachineMultiplierChange(numValue);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: number,
    setter: (value: number) => void,
    min: number = 0
  ) => {
    let step = 1;
    if (e.ctrlKey) step = 10;
    if (e.shiftKey) step = 100;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newValue = Math.max(min, currentValue + step);
      setter(newValue);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newValue = Math.max(min, currentValue - step);
      setter(newValue);
    }
  };

  const handleWheel = (
    e: React.WheelEvent<HTMLInputElement>,
    currentValue: number,
    setter: (value: number) => void,
    min: number = 0
  ) => {
    let step = 1;
    if (e.ctrlKey) step = 10;
    if (e.shiftKey) step = 100;
    
    const delta = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(min, currentValue + (delta * step));
    setter(newValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.select();
    }, 0);
  };

  return (
    <div
      className="machine-controls machine-controls-wrapper"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Machine count column (stacks current + baseline) */}
      <div className="machine-control-column machine-count-column">
        <StyledInput
          ref={machineCountRef}
          type="number"
          value={localMachineCount}
          className="machine-control-input machine-count-input"
          onChange={(e) => {
            e.stopPropagation();
            handleMachineCountChange(e.target.value);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            handleKeyDown(
              e,
              localMachineCount,
              (val) => {
                setLocalMachineCount(val);
                onMachineCountChange(val);
              },
              1
            );
          }}
          onWheel={(e) => {
            e.stopPropagation();
            if (document.activeElement === machineCountRef.current) {
              handleWheel(
                e,
                localMachineCount,
                (val) => {
                  setLocalMachineCount(val);
                  onMachineCountChange(val);
                },
                1
              );
            }
          }}
          onFocus={(e) => {
            e.stopPropagation();
            handleFocus(e);
          }}
          variant="compact"
          min={1}
          onClick={(e) => e.stopPropagation()}
        />
        {showBaseline && baselineValues && !isNew && (
          <span 
            className={`baseline-value baseline-machine-count ${getChangeClass(changes?.machineCount || 'unchanged')}`}
            title={`Baseline: ${baselineValues.machineCount}`}
          >
            {baselineValues.machineCount}
          </span>
        )}
        {showBaseline && isNew && (
          <span className="baseline-new-badge">NEW</span>
        )}
      </div>

      {/* Optimize button column */}
      <button
        className="machine-control-button optimize-button"
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey && onOptimizeAllMachines) {
            onOptimizeAllMachines();
          } else {
            onOptimizeMachines();
          }
        }}
        title="Set machine count for 100% efficiency (Shift+Click for All)"
      >
        M
      </button>

      {/* Multiplier column (conditionally rendered, stacks current + baseline) */}
      {showMachineMultiplier && onMachineMultiplierChange && (
        <div className="machine-control-column machine-multiplier-column">
          <StyledInput
            ref={machineMultiplierRef}
            type="number"
            value={localMachineMultiplier}
            className="machine-control-input multiplier-input"
            onChange={(e) => {
              e.stopPropagation();
              handleMachineMultiplierChange(e.target.value);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              handleKeyDown(
                e,
                localMachineMultiplier,
                (val) => {
                  setLocalMachineMultiplier(val);
                  onMachineMultiplierChange?.(val);
                },
                1
              );
            }}
            onWheel={(e) => {
              e.stopPropagation();
              if (document.activeElement === machineMultiplierRef.current) {
                handleWheel(
                  e,
                  localMachineMultiplier,
                  (val) => {
                    setLocalMachineMultiplier(val);
                    onMachineMultiplierChange?.(val);
                  },
                  1
                );
              }
            }}
            onFocus={(e) => {
              e.stopPropagation();
              handleFocus(e);
            }}
            variant="compact"
            min={1}
            onClick={(e) => e.stopPropagation()}
          />
          {showBaseline && baselineValues && !isNew && (
            <span 
              className={`baseline-value baseline-machine-multiplier ${getChangeClass(changes?.machineMultiplier || 'unchanged')}`}
              title={`Baseline: ${baselineValues.machineMultiplier}x`}
            >
              {baselineValues.machineMultiplier}x
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MachineControls; 