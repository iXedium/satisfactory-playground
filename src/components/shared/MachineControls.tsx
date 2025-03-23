import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../../styles/theme';
import StyledInput from './StyledInput';

interface MachineControlsProps {
  machineCount: number;
  onMachineCountChange: (count: number) => void;
  machineMultiplier?: number;
  onMachineMultiplierChange?: (multiplier: number) => void;
  showMachineMultiplier?: boolean;
  onOptimizeMachines: () => void;
}

const MachineControls: React.FC<MachineControlsProps> = ({
  machineCount,
  onMachineCountChange,
  machineMultiplier = 1,
  onMachineMultiplierChange,
  showMachineMultiplier = false,
  onOptimizeMachines,
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
    e.preventDefault(); // Prevent page scrolling
    
    let step = 1;
    if (e.ctrlKey) step = 10;
    if (e.shiftKey) step = 100;
    
    // Wheel delta is negative when scrolling down, positive when scrolling up
    const delta = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(min, currentValue + (delta * step));
    setter(newValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.select();
    }, 0);
  };

  // Button styles
  const buttonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "12px",
    backgroundColor: theme.colors.buttonDefault,
    color: theme.colors.text,
    border: "none",
    borderRadius: theme.border.radius,
    cursor: "pointer",
    fontWeight: "bold",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "30px",
  };

  // Input field styles
  const inputFieldStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: "4px 8px",
    height: "28px",
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        width: '100%'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Machine count */}
      <StyledInput
        ref={machineCountRef}
        type="number"
        value={localMachineCount}
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
        style={{
          ...inputFieldStyle,
          position: "relative",
          zIndex: 2,
          flex: "0 0 40px",
          maxWidth: "40px",
        }}
        min={1}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Optimize button */}
      <button
        style={{
          ...buttonStyle,
          backgroundColor: theme.colors.secondary,
          position: "relative",
          zIndex: 2,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOptimizeMachines();
        }}
        title="Set machine count for 100% efficiency"
      >
        M
      </button>

      {/* Multiplier - conditionally rendered based on global setting */}
      {showMachineMultiplier && onMachineMultiplierChange && (
        <StyledInput
          ref={machineMultiplierRef}
          type="number"
          value={localMachineMultiplier}
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
          style={{
            ...inputFieldStyle,
            position: "relative",
            zIndex: 2,
            flex: "0 0 40px",
            maxWidth: "40px",
          }}
          min={1}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
};

export default MachineControls; 