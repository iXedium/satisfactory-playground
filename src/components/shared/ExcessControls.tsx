import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { sizes } from '../../styles/constants';
import StyledInput from './StyledInput';

interface ExcessControlsProps {
  excess: number;
  onExcessChange: (value: number) => void;
  onMaxExcess: () => void;
  onResetExcess: () => void;
  containerStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
}

const ExcessControls: React.FC<ExcessControlsProps> = ({
  excess,
  onExcessChange,
  onMaxExcess,
  onResetExcess,
  containerStyle,
  inputStyle,
  buttonStyle: customButtonStyle,
}) => {
  const [preciseExcess, setPreciseExcess] = useState(excess);
  const [isExcessFocused, setIsExcessFocused] = useState(false);
  const excessRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.debug(`[EXCESS DEBUG] ExcessControls received new excess prop: ${excess}`);
    setPreciseExcess(excess);
  }, [excess]);

  // Format the excess value based on focus state
  const formattedExcess = isExcessFocused 
    ? preciseExcess 
    : Number(preciseExcess.toFixed(2));

  // For display in the input control
  const displayExcess = isExcessFocused
    ? preciseExcess.toString()
    : formattedExcess.toFixed(2);

  const handleExcessChange = (value: string) => {
    // Parse and store the full precision value
    const inputValue = value;
    console.debug(`[EXCESS DEBUG] ExcessControls handleExcessChange: ${inputValue}`);
    
    // Handle empty input or invalid numbers
    if (inputValue === "" || isNaN(parseFloat(inputValue))) {
      console.debug('[EXCESS DEBUG] Empty or invalid input, setting excess to 0');
      setPreciseExcess(0);
      onExcessChange(0);
    } else {
      // Store the full precision number
      const numValue = parseFloat(inputValue);
      console.debug(`[EXCESS DEBUG] Setting excess to ${numValue}`);
      setPreciseExcess(numValue);
      onExcessChange(numValue);
    }
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
      setter(newValue); // Store full precision
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newValue = Math.max(min, currentValue - step);
      setter(newValue); // Store full precision
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
    setter(newValue); // Store full precision
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Need to use setTimeout to work around issues with number inputs in some browsers
    setTimeout(() => {
      e.target.select();
    }, 0);
    setIsExcessFocused(true);
    
    // When focused, directly set the full precision value in the DOM
    if (excessRef.current) {
      excessRef.current.value = preciseExcess.toString();
    }
  };

  const handleBlur = () => {
    setIsExcessFocused(false);
    // When blurred, format to 2 decimal places for display only
  };

  // Button styles
  const buttonStyle: React.CSSProperties = {
    padding: `${sizes.spacing.small} ${sizes.spacing.small}`,
    fontSize: sizes.fontSize.small,
    backgroundColor: theme.colors.buttonDefault,
    color: theme.colors.text,
    border: "none",
    borderRadius: theme.border.radius,
    cursor: "pointer",
    fontWeight: "bold",
    height: sizes.button.standardHeight,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: sizes.button.standardWidth,
    ...customButtonStyle
  };

  // Input field styles
  const inputFieldStyle: React.CSSProperties = {
    backgroundColor: theme.colors.darker,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    padding: `${sizes.spacing.small} ${sizes.spacing.small}`,
    height: sizes.inputField.standardHeight,
    ...inputStyle
  };

  return (
    <div
      style={{
        display: "flex",
        gap: sizes.spacing.xsmall,
        alignItems: "center",
        width: "100%",
        justifyContent: "space-between",
        position: "relative",
        zIndex: sizes.zIndex.controls,
        ...containerStyle
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        style={{
          ...buttonStyle,
          position: "relative",
          zIndex: sizes.zIndex.controls,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onResetExcess();
        }}
        title="Reset excess to zero"
      >
        R
      </button>

      <StyledInput
        ref={excessRef}
        type="number"
        value={displayExcess}
        onChange={(e) => {
          e.stopPropagation();
          handleExcessChange(e.target.value);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          handleKeyDown(
            e,
            preciseExcess,
            (val) => {
              setPreciseExcess(val);
              onExcessChange?.(val);
            },
            0.01 // Use a smaller step for excess
          );
        }}
        onWheel={(e) => {
          e.stopPropagation();
          if (document.activeElement === excessRef.current) {
            handleWheel(
              e,
              preciseExcess,
              (val) => {
                setPreciseExcess(val);
                onExcessChange?.(val);
              },
              0.1 // Larger step for wheel
            );
          }
        }}
        onFocus={(e) => {
          e.stopPropagation();
          handleFocus(e);
        }}
        onBlur={(e) => {
          e.stopPropagation();
          handleBlur();
        }}
        variant="compact"
        style={{
          ...inputFieldStyle,
          position: "relative",
          zIndex: sizes.zIndex.controls,
          flex: 1,
          maxWidth: sizes.inputField.excessWidth,
        }}
        min={0}
        onClick={(e) => e.stopPropagation()}
      />

      <button
        style={{
          ...buttonStyle,
          backgroundColor: theme.colors.secondary,
          position: "relative",
          zIndex: sizes.zIndex.controls,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onMaxExcess();
        }}
        title="Set excess for 100% efficiency"
      >
        M
      </button>
    </div>
  );
};

export default ExcessControls; 