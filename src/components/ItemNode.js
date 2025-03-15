import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import Icon from './Icon';
import { theme } from '../styles/theme';
import { getItemById, getMachineForRecipe } from "../data/dbQueries";
import StyledSelect from './shared/StyledSelect';
import StyledInput from './shared/StyledInput';
const ItemNode = ({ itemId, amount, isRoot = false, isByproduct = false, recipes, selectedRecipeId, onRecipeChange, size = "large", excess = 0, onExcessChange, style, index = 0, onIconClick, machineCount = 1, onMachineCountChange, machineMultiplier = 1, onMachineMultiplierChange }) => {
    const [item, setItem] = useState(null);
    const [localExcess, setLocalExcess] = useState(excess);
    const [localMachineCount, setLocalMachineCount] = useState(machineCount);
    const [localMachineMultiplier, setLocalMachineMultiplier] = useState(machineMultiplier);
    const [machine, setMachine] = useState(null);
    const [efficiency, setEfficiency] = useState(100);
    const [showEfficiencyTooltip, setShowEfficiencyTooltip] = useState(false);
    const [nominalRate, setNominalRate] = useState(0);
    // Refs for input elements to handle selection
    const machineCountRef = useRef(null);
    const machineMultiplierRef = useRef(null);
    const excessRef = useRef(null);
    useEffect(() => {
        setLocalExcess(excess);
    }, [excess]);
    useEffect(() => {
        setLocalMachineCount(machineCount);
    }, [machineCount]);
    useEffect(() => {
        setLocalMachineMultiplier(machineMultiplier);
    }, [machineMultiplier]);
    useEffect(() => {
        getItemById(itemId).then(item => setItem(item || null));
    }, [itemId]);
    useEffect(() => {
        if (selectedRecipeId) {
            getMachineForRecipe(selectedRecipeId).then(machineData => {
                if (machineData) {
                    setMachine(machineData);
                }
            });
        }
    }, [selectedRecipeId]);
    // Calculate efficiency and nominal rate whenever relevant values change
    useEffect(() => {
        if (machine && selectedRecipeId && recipes) {
            const recipe = recipes.find(r => r.id === selectedRecipeId);
            if (recipe) {
                const outputAmount = recipe.out[itemId] || 1;
                const cyclesPerMinute = 60 / recipe.time;
                const itemsPerMinute = outputAmount * cyclesPerMinute;
                // Calculate nominal production rate (per machine)
                const nominalRatePerMachine = itemsPerMinute * machine.speed;
                setNominalRate(nominalRatePerMachine);
                // Calculate total production capacity with all machines
                const totalMachineCapacity = localMachineCount * localMachineMultiplier * nominalRatePerMachine;
                // Calculate efficiency (actual needed / total capacity)
                const neededAmount = amount + localExcess;
                const newEfficiency = (neededAmount / totalMachineCapacity) * 100;
                setEfficiency(Math.round(newEfficiency * 100) / 100);
            }
        }
    }, [amount, localExcess, localMachineCount, localMachineMultiplier, machine, selectedRecipeId, recipes, itemId]);
    const getItemColor = () => {
        if (isRoot)
            return theme.colors.nodeRoot;
        if (isByproduct)
            return theme.colors.nodeByproduct;
        return theme.colors.nodeDefault;
    };
    const getEfficiencyColor = () => {
        if (efficiency > 100)
            return theme.colors.nodeByproduct; // Red for over 100%
        if (efficiency < 100)
            return '#CCAA00'; // Yellow for under 100%
        return theme.colors.nodeRoot; // Green for exactly 100%
    };
    const handleExcessChange = (value) => {
        const numValue = value === '' ? 0 : Number(value);
        setLocalExcess(numValue);
        onExcessChange?.(numValue);
    };
    const handleMachineCountChange = (value) => {
        const numValue = Math.max(1, value === '' ? 1 : Math.floor(Number(value)));
        setLocalMachineCount(numValue);
        onMachineCountChange?.(numValue);
    };
    const handleMachineMultiplierChange = (value) => {
        const numValue = Math.max(1, value === '' ? 1 : Math.floor(Number(value)));
        setLocalMachineMultiplier(numValue);
        onMachineMultiplierChange?.(numValue);
    };
    const handleResetExcess = () => {
        setLocalExcess(0);
        onExcessChange?.(0);
    };
    const handleMaxExcess = () => {
        if (machine && selectedRecipeId && recipes) {
            const recipe = recipes.find(r => r.id === selectedRecipeId);
            if (recipe) {
                // Calculate the total production capacity
                const totalCapacity = localMachineCount * localMachineMultiplier * nominalRate;
                // Calculate excess needed for 100% efficiency
                const excessNeeded = totalCapacity - amount;
                const roundedExcess = Math.max(0, Math.round(excessNeeded * 100) / 100);
                setLocalExcess(roundedExcess);
                onExcessChange?.(roundedExcess);
            }
        }
    };
    const handleOptimizeMachines = () => {
        if (machine && selectedRecipeId && recipes) {
            const recipe = recipes.find(r => r.id === selectedRecipeId);
            if (recipe) {
                // Calculate optimal machine count for 100% efficiency
                const neededAmount = amount + localExcess;
                const optimalMachines = Math.ceil(neededAmount / (nominalRate * localMachineMultiplier));
                setLocalMachineCount(optimalMachines);
                onMachineCountChange?.(optimalMachines);
            }
        }
    };
    const copyEfficiencyValue = () => {
        const decimalValue = efficiency / 100;
        navigator.clipboard.writeText(decimalValue.toString());
        setShowEfficiencyTooltip(true);
        setTimeout(() => setShowEfficiencyTooltip(false), 2000);
    };
    // Handle keyboard events for numeric inputs
    const handleKeyDown = (e, currentValue, setter, min = 0) => {
        let step = 1;
        if (e.ctrlKey)
            step = 10;
        if (e.shiftKey)
            step = 100;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newValue = Math.max(min, currentValue + step);
            setter(newValue);
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newValue = Math.max(min, currentValue - step);
            setter(newValue);
        }
    };
    // Handle focus to select all content
    const handleFocus = (e) => {
        e.target.select();
    };
    if (!item)
        return null;
    // Button styles
    const buttonStyle = {
        padding: '4px 8px',
        fontSize: '12px',
        backgroundColor: theme.colors.buttonDefault,
        color: theme.colors.text,
        border: 'none',
        borderRadius: theme.border.radius,
        cursor: 'pointer',
        fontWeight: 'bold',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '50px',
    };
    // Input field styles
    const inputFieldStyle = {
        backgroundColor: theme.colors.darker,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.dropdown.border}`,
        borderRadius: theme.border.radius,
        padding: '4px 8px',
        width: '60px',
        height: '28px',
    };
    // Section container styles
    const sectionStyle = {
        backgroundColor: `${theme.colors.dark}`,
        borderRadius: theme.border.radius,
        border: `1px solid ${theme.colors.dropdown.border}`,
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        height: '100%',
    };
    return (_jsxs("div", { style: {
            display: 'flex',
            gap: '8px',
            marginBottom: '8px',
            backgroundColor: index % 2 === 0 ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
            borderRadius: theme.border.radius,
            padding: '8px',
            ...style
        }, children: [_jsxs("div", { style: {
                    ...sectionStyle,
                    borderLeft: `4px solid ${getItemColor()}`,
                    flex: 2,
                    minWidth: '300px',
                }, children: [_jsx("div", { style: {
                            cursor: onIconClick ? 'pointer' : 'default',
                            marginRight: '8px',
                            alignSelf: 'flex-start',
                        }, onClick: onIconClick, children: _jsx(Icon, { itemId: itemId, size: size }) }), _jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            justifyContent: 'space-between',
                            height: '100%',
                        }, children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: 'bold',
                                    color: getItemColor(),
                                }, children: [_jsx("span", { children: item.name }), nominalRate > 0 && (_jsxs("span", { style: { fontSize: '12px', opacity: 0.8 }, children: [nominalRate.toFixed(2), "/min"] }))] }), _jsx("div", { style: { marginTop: 'auto' }, children: recipes && recipes.length > 0 && onRecipeChange && (_jsx(StyledSelect, { value: selectedRecipeId || '', onChange: onRecipeChange, options: recipes, variant: "compact", style: { width: '100%' } })) })] })] }), machine && !isByproduct && (_jsxs("div", { style: {
                    ...sectionStyle,
                    borderLeft: `4px solid ${theme.colors.secondary}`,
                    flex: 1,
                    minWidth: '250px',
                }, children: [_jsx("div", { style: { marginRight: '8px' }, children: _jsx(Icon, { itemId: machine.id, size: size }) }), _jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            gap: '4px',
                        }, children: [_jsx("div", { style: {
                                    fontWeight: 'bold',
                                    color: theme.colors.secondary,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }, children: machine.name }), _jsxs("div", { style: {
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                }, children: [_jsx(StyledInput, { ref: machineCountRef, type: "number", value: localMachineCount, onChange: (e) => handleMachineCountChange(e.target.value), onKeyDown: (e) => handleKeyDown(e, localMachineCount, (val) => {
                                            setLocalMachineCount(val);
                                            onMachineCountChange?.(val);
                                        }, 1), onFocus: handleFocus, variant: "compact", style: inputFieldStyle, min: 1 }), _jsx("button", { style: {
                                            ...buttonStyle,
                                            backgroundColor: theme.colors.secondary,
                                        }, onClick: handleOptimizeMachines, title: "Set machine count for 100% efficiency", children: "MAX" }), _jsx(StyledInput, { ref: machineMultiplierRef, type: "number", value: localMachineMultiplier, onChange: (e) => handleMachineMultiplierChange(e.target.value), onKeyDown: (e) => handleKeyDown(e, localMachineMultiplier, (val) => {
                                            setLocalMachineMultiplier(val);
                                            onMachineMultiplierChange?.(val);
                                        }, 1), onFocus: handleFocus, variant: "compact", style: inputFieldStyle, min: 1 })] })] })] })), _jsx("div", { style: {
                    ...sectionStyle,
                    borderLeft: `4px solid ${getEfficiencyColor()}`,
                    flex: 1,
                    minWidth: '250px',
                }, children: _jsxs("div", { style: {
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: '8px',
                    }, children: [_jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%',
                            }, children: [_jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                    }, children: [_jsx("span", { children: "Efficiency:" }), _jsxs("span", { style: {
                                                color: getEfficiencyColor(),
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                position: 'relative',
                                                marginLeft: '4px',
                                            }, onClick: copyEfficiencyValue, title: "Click to copy decimal value", children: [efficiency.toFixed(2), "%", showEfficiencyTooltip && (_jsx("div", { style: {
                                                        position: 'absolute',
                                                        bottom: '100%',
                                                        right: '0',
                                                        backgroundColor: theme.colors.dark,
                                                        padding: '4px 8px',
                                                        borderRadius: theme.border.radius,
                                                        fontSize: '12px',
                                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                                        zIndex: 10,
                                                    }, children: "Copied!" }))] })] }), _jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontWeight: 'bold',
                                    }, children: [_jsx("span", { children: "Rate:" }), _jsxs("span", { style: { marginLeft: '4px' }, children: [amount.toFixed(2), "/min"] })] })] }), onExcessChange && (_jsxs("div", { style: {
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                width: '100%',
                                justifyContent: 'space-between',
                            }, children: [_jsx("button", { style: buttonStyle, onClick: handleResetExcess, title: "Reset excess to zero", children: "RESET" }), _jsx(StyledInput, { ref: excessRef, type: "number", value: localExcess, onChange: (e) => handleExcessChange(e.target.value), onKeyDown: (e) => handleKeyDown(e, localExcess, (val) => {
                                        setLocalExcess(val);
                                        onExcessChange?.(val);
                                    }), onFocus: handleFocus, variant: "compact", style: { ...inputFieldStyle, width: '80px' }, onClick: (e) => e.stopPropagation() }), _jsx("button", { style: {
                                        ...buttonStyle,
                                        backgroundColor: theme.colors.secondary,
                                    }, onClick: handleMaxExcess, title: "Set excess for 100% efficiency", children: "MAX" })] }))] }) })] }));
};
export default ItemNode;
