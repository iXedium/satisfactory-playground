import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import { getComponents, getRecipesForItem } from "../data/dbQueries";
import ViewModeSwitch from "./ViewModeSwitch";
import { setRecipeSelection } from "../features/recipeSelectionsSlice";
import { findAffectedBranches } from "../utils/treeDiffing";
import ItemNode from "./ItemNode";
import { theme } from '../styles/theme';
import StyledSelect from "./shared/StyledSelect";
import StyledInput from "./shared/StyledInput";
import Icon from "./Icon";
const DependencyTester = () => {
    const dispatch = useDispatch();
    const dependencies = useSelector((state) => state.dependencies);
    const recipeSelections = useSelector((state) => state.recipeSelections.selections);
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedRecipe, setSelectedRecipe] = useState("");
    const [itemCount, setItemCount] = useState(1);
    const [viewMode, setViewMode] = useState("tree");
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [excessMap, setExcessMap] = useState({});
    const [machineCountMap, setMachineCountMap] = useState({});
    const [machineMultiplierMap, setMachineMultiplierMap] = useState({});
    // Add state to track last calculated values
    const [lastCalculated, setLastCalculated] = useState(null);
    // Load components on mount
    useEffect(() => {
        getComponents().then(setItems).catch(console.error);
    }, []);
    // Fetch recipes when item changes
    useEffect(() => {
        if (selectedItem) {
            console.log(`Fetching recipes for item: ${selectedItem}`);
            // Clear previous recipe selection
            setSelectedRecipe("");
            getRecipesForItem(selectedItem)
                .then((recipes) => {
                console.log(`Found ${recipes.length} recipes for ${selectedItem}:`, recipes);
                if (recipes.length > 0) {
                    setFilteredRecipes(recipes);
                    // Find the default recipe (either matching the item ID or the first one)
                    const defaultRecipe = recipes.find((r) => r.id === selectedItem) || recipes[0];
                    console.log(`Setting default recipe: ${defaultRecipe.id}`);
                    // Use setTimeout to ensure the state update happens after the filteredRecipes are set
                    setTimeout(() => {
                        setSelectedRecipe(defaultRecipe.id);
                        console.log(`Selected recipe set to: ${defaultRecipe.id}`);
                    }, 0);
                }
                else {
                    console.warn(`No recipes found for ${selectedItem}`);
                    setFilteredRecipes([]);
                    setSelectedRecipe("");
                }
            })
                .catch(error => {
                console.error(`Error fetching recipes for ${selectedItem}:`, error);
                setFilteredRecipes([]);
                setSelectedRecipe("");
            });
        }
        else {
            console.log('No item selected, clearing recipes');
            setFilteredRecipes([]);
            setSelectedRecipe("");
        }
    }, [selectedItem]);
    // Debug when recipe selection changes
    useEffect(() => {
        console.log(`Recipe selection changed to: ${selectedRecipe}`);
    }, [selectedRecipe]);
    // Debug when filtered recipes change
    useEffect(() => {
        console.log(`Filtered recipes updated: ${filteredRecipes.length} recipes available`);
    }, [filteredRecipes]);
    // Update calculate handler with dependency checking
    const handleCalculate = async () => {
        if (selectedItem && selectedRecipe) {
            try {
                console.log(`Calculating dependencies for ${selectedItem} using recipe ${selectedRecipe} with count ${itemCount}`);
                // Check if calculation is needed
                const needsCalculation = !lastCalculated
                    || lastCalculated.item !== selectedItem
                    || lastCalculated.recipe !== selectedRecipe
                    || lastCalculated.count !== itemCount;
                if (needsCalculation) {
                    console.log("Recalculation needed, fetching dependency tree...");
                    const tree = await calculateDependencyTree(selectedItem, itemCount, selectedRecipe, recipeSelections);
                    if (!tree) {
                        console.error("Failed to calculate dependency tree");
                        return;
                    }
                    console.log("Calculating accumulated dependencies...");
                    const accumulated = calculateAccumulatedFromTree(tree);
                    console.log("Dispatching dependencies to store...");
                    dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
                    // Update last calculated state
                    setLastCalculated({
                        item: selectedItem,
                        recipe: selectedRecipe,
                        count: itemCount
                    });
                    console.log("Calculation complete");
                }
                else {
                    console.log("No recalculation needed, using cached results");
                }
            }
            catch (error) {
                console.error("Error in handleCalculate:", error);
            }
        }
        else {
            console.warn("Cannot calculate: Missing item or recipe selection");
        }
    };
    const handleTreeRecipeChange = async (nodeId, recipeId) => {
        const affectedBranches = dependencies.dependencyTree
            ? findAffectedBranches(dependencies.dependencyTree, nodeId)
            : [];
        const updatedRecipeSelections = {
            ...recipeSelections,
            [nodeId]: recipeId
        };
        dispatch(setRecipeSelection({ nodeId, recipeId }));
        if (selectedItem && selectedRecipe) {
            const tree = await calculateDependencyTree(selectedItem, itemCount, selectedRecipe, updatedRecipeSelections, 0, affectedBranches);
            const accumulated = calculateAccumulatedFromTree(tree);
            dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
            setLastCalculated({
                item: selectedItem,
                recipe: selectedRecipe,
                count: itemCount
            });
        }
    };
    const handleExcessChange = async (nodeId, excess) => {
        const newExcessMap = { ...excessMap, [nodeId]: excess };
        setExcessMap(newExcessMap);
        if (selectedItem && selectedRecipe) {
            const tree = await calculateDependencyTree(selectedItem, itemCount, selectedRecipe, recipeSelections, 0, [], // No affected branches needed
            '', newExcessMap);
            const accumulated = calculateAccumulatedFromTree(tree);
            dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
        }
    };
    const handleMachineCountChange = (nodeId, count) => {
        setMachineCountMap(prev => ({
            ...prev,
            [nodeId]: count
        }));
    };
    const handleMachineMultiplierChange = (nodeId, multiplier) => {
        setMachineMultiplierMap(prev => ({
            ...prev,
            [nodeId]: multiplier
        }));
    };
    return (_jsxs("div", { className: "container", children: [_jsx("div", { style: {
                    padding: '12px',
                    background: theme.colors.dark,
                    borderRadius: theme.border.radius,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    marginBottom: '24px'
                }, children: _jsxs("div", { style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }, children: [_jsxs("div", { style: {
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                flex: '1'
                            }, children: [_jsx(StyledSelect, { value: selectedItem, onChange: setSelectedItem, options: items, placeholder: "Select an Item", style: { minWidth: '250px', maxWidth: '300px', flex: '1' }, renderOption: (option) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Icon, { itemId: option.id, size: "small", showWrapper: false, style: { backgroundColor: theme.colors.dark } }), option.name] })) }), _jsx(StyledSelect, { value: selectedRecipe, onChange: setSelectedRecipe, options: filteredRecipes, placeholder: selectedItem ? "Select a Recipe" : "Select an item first", style: {
                                        minWidth: '250px',
                                        maxWidth: '300px',
                                        flex: '1',
                                        opacity: selectedItem ? 1 : 0.7
                                    }, disabled: !selectedItem || filteredRecipes.length === 0, renderOption: (option) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: _jsx("span", { style: { fontWeight: 'bold' }, children: option.name }) }), option.id === selectedRecipe && (_jsx("div", { style: {
                                                    fontSize: '12px',
                                                    color: theme.colors.textSecondary,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }, children: _jsx("span", { children: "Selected" }) }))] })) }), _jsx(StyledInput, { type: "number", min: "1", value: itemCount, onChange: (e) => setItemCount(Number(e.target.value)), placeholder: "Count", style: { width: '120px' } })] }), _jsxs("div", { style: {
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'center',
                                flexShrink: 0
                            }, children: [_jsx("button", { onClick: handleCalculate, style: {
                                        height: '44px',
                                        padding: '0 24px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        borderRadius: theme.border.radius,
                                        background: theme.colors.buttonDefault,
                                        color: theme.colors.text,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease-in-out',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                    }, onMouseEnter: (e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover, onMouseLeave: (e) => e.currentTarget.style.backgroundColor = theme.colors.buttonDefault, children: "Calculate" }), _jsx(ViewModeSwitch, { mode: viewMode === "tree" ? "tree" : "list", onToggle: (mode) => setViewMode(mode === "list" ? "accumulated" : "tree") })] })] }) }), Object.keys(dependencies.accumulatedDependencies || {}).length > 0 && (_jsx("div", { style: { ...dependencyStyles.listContainer, display: viewMode === "accumulated" ? "block" : "none" }, children: _jsxs("ul", { style: { listStyle: "none", padding: 0 }, children: [dependencies.selectedItem && (_jsx("li", { style: { marginBottom: "8px" }, children: _jsx(ItemNode, { itemId: dependencies.selectedItem, amount: dependencies.itemCount, isRoot: true, index: 0, recipes: filteredRecipes, selectedRecipeId: selectedRecipe, onRecipeChange: (recipeId) => {
                                    setSelectedRecipe(recipeId);
                                    handleCalculate();
                                }, excess: excessMap[dependencies.selectedItem] || 0, onExcessChange: (excess) => {
                                    if (dependencies.selectedItem) {
                                        handleExcessChange(dependencies.selectedItem, excess);
                                    }
                                }, machineCount: machineCountMap[dependencies.selectedItem] || 1, onMachineCountChange: (count) => {
                                    if (dependencies.selectedItem) {
                                        handleMachineCountChange(dependencies.selectedItem, count);
                                    }
                                }, machineMultiplier: machineMultiplierMap[dependencies.selectedItem] || 1, onMachineMultiplierChange: (multiplier) => {
                                    if (dependencies.selectedItem) {
                                        handleMachineMultiplierChange(dependencies.selectedItem, multiplier);
                                    }
                                } }) })), Object.entries(dependencies.accumulatedDependencies).map(([item, amount], index) => {
                            const nodeId = `${item}-0`;
                            const recipes = filteredRecipes.filter((r) => r.id === item) || [];
                            return (_jsx("li", { style: { marginBottom: "8px" }, children: _jsx(ItemNode, { itemId: item, amount: amount, isByproduct: amount < 0, index: index + 1, recipes: recipes, selectedRecipeId: recipeSelections[nodeId] || '', onRecipeChange: (recipeId) => handleTreeRecipeChange(nodeId, recipeId), excess: excessMap[item] || 0, onExcessChange: (excess) => handleExcessChange(item, excess), machineCount: machineCountMap[item] || 1, onMachineCountChange: (count) => handleMachineCountChange(item, count), machineMultiplier: machineMultiplierMap[item] || 1, onMachineMultiplierChange: (multiplier) => handleMachineMultiplierChange(item, multiplier) }) }, item));
                        })] }) })), dependencies.dependencyTree && (_jsx("div", { style: {
                    ...dependencyStyles.listContainer,
                    display: viewMode === "tree" ? "block" : "none"
                }, children: _jsx(DependencyTree, { dependencyTree: dependencies.dependencyTree, onRecipeChange: handleTreeRecipeChange, onExcessChange: handleExcessChange, excessMap: excessMap, machineCountMap: machineCountMap, onMachineCountChange: handleMachineCountChange, machineMultiplierMap: machineMultiplierMap, onMachineMultiplierChange: handleMachineMultiplierChange }) }))] }));
};
export default DependencyTester;
