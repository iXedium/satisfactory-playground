import React, { useState, useRef, useEffect } from 'react';
// import { theme } from '../../styles/theme'; // No longer needed directly for base styles
import { sizes } from '../../styles/constants'; // Re-import for zIndex
import StyledInput from './StyledInput';
import './ExcessControls.css'; // Import the CSS file

interface ExcessControlsProps {
  excess: number;
  onExcessChange: (value: number) => void;
  onMaxExcess: () => void;
  onResetExcess: () => void;
  onMaxExcessAll?: () => void;
  onResetExcessAll?: () => void;
  containerStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  className?: string;
}

const ExcessControls: React.FC<ExcessControlsProps> = ({
  excess,
  onExcessChange,
  onMaxExcess,
  onResetExcess,
  onMaxExcessAll,
  onResetExcessAll,
  containerStyle,
  inputStyle,
  buttonStyle: customButtonStyle,
  className,
}) => {
  const [preciseExcess, setPreciseExcess] = useState(excess);
  const [isExcessFocused, setIsExcessFocused] = useState(false);
  const excessRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // console.debug(`[EXCESS DEBUG] ExcessControls received new excess prop: ${excess}`);
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
    // console.debug(`[EXCESS DEBUG] ExcessControls handleExcessChange: ${inputValue}`);
    
    // Handle empty input or invalid numbers
    if (inputValue === "" || isNaN(parseFloat(inputValue))) {
      // console.debug('[EXCESS DEBUG] Empty or invalid input, setting excess to 0');
      setPreciseExcess(0);
      onExcessChange(0);
    } else {
      // Store the full precision number
      const numValue = parseFloat(inputValue);
      // console.debug(`[EXCESS DEBUG] Setting excess to ${numValue}`);
      setPreciseExcess(numValue);
      onExcessChange(numValue);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: number,
    setter: (value: number) => void,
    baseStep: number = 1,
    min: number = 0
  ) => {
    let step = baseStep;
    if (e.ctrlKey) step = baseStep * 10;
    if (e.shiftKey) step = baseStep * 100;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newValue = Math.max(min, Math.round((currentValue + step) * 10000) / 10000);
      setter(newValue); // Store full precision
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newValue = Math.max(min, Math.round((currentValue - step) * 10000) / 10000);
      setter(newValue); // Store full precision
    }
  };

  const handleWheel = (
    e: React.WheelEvent<HTMLInputElement>,
    currentValue: number,
    setter: (value: number) => void,
    baseStep: number = 1,
    min: number = 0
  ) => { 
    e.preventDefault(); // Prevent page scrolling
    
    let step = baseStep;
    if (e.ctrlKey) step = baseStep * 10;
    if (e.shiftKey) step = baseStep * 100;
    
    // Wheel delta is negative when scrolling down, positive when scrolling up
    const delta = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(min, Math.round((currentValue + (delta * step)) * 10000) / 10000);
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

  return (
    <div
      className={`excess-controls-container ${className || ""}`.trim()}
      style={containerStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="excess-controls-button excess-controls-button--reset"
        style={customButtonStyle}
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey && onResetExcessAll) {
            onResetExcessAll();
          } else {
            onResetExcess();
          }
        }}
        title="Reset excess to zero (Shift+Click for All)"
      >
        R
      </button>

      <StyledInput
        ref={excessRef}
        type="number"
        className="excess-controls-input"
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
            0.01, // Use a smaller step for excess
            0     // min: 0
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
              0.1, // Larger step for wheel
              0    // min: 0
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
          ...inputStyle,
          position: "relative",
          zIndex: sizes.zIndex.controls,
          flex: 1,
          maxWidth: sizes.inputField.excessWidth,
        }}
        min={0}
        onClick={(e) => e.stopPropagation()}
      />

      <button
        className="excess-controls-button excess-controls-button--max"
        style={customButtonStyle}
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey && onMaxExcessAll) {
            onMaxExcessAll();
          } else {
            onMaxExcess();
          }
        }}
        title="Set excess for 100% efficiency (Shift+Click for All)"
      >
        M
      </button>
    </div>
  );
};

export default ExcessControls; 