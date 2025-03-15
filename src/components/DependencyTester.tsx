import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item, Recipe } from "../data/dexieDB";
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

type ViewMode = "accumulated" | "tree";

const DependencyTester: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dependencies = useSelector((state: RootState) => state.dependencies);
  const recipeSelections = useSelector((state: RootState) => state.recipeSelections.selections);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [itemCount, setItemCount] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [excessMap, setExcessMap] = useState<Record<string, number>>({});

  // Add state to track last calculated values
  const [lastCalculated, setLastCalculated] = useState<{
    item: string;
    recipe: string;
    count: number;
  } | null>(null);

  // Load components on mount
  useEffect(() => {
    getComponents().then(setItems).catch(console.error);
  }, []);

  // Fetch recipes when item changes
  useEffect(() => {
    if (selectedItem) {
      getRecipesForItem(selectedItem)
        .then((recipes) => {
          setFilteredRecipes(recipes);
          if (recipes.length > 0) {
            const defaultRecipe = recipes.find((r) => r.id === selectedItem) || recipes[0];
            setSelectedRecipe(defaultRecipe.id);
          } else {
            setSelectedRecipe("");
          }
        })
        .catch(console.error);
    }
  }, [selectedItem]);

  // Update calculate handler with dependency checking
  const handleCalculate = async () => {
    if (selectedItem && selectedRecipe) {
      // Check if calculation is needed
      const needsCalculation = !lastCalculated 
        || lastCalculated.item !== selectedItem
        || lastCalculated.recipe !== selectedRecipe
        || lastCalculated.count !== itemCount;

      if (needsCalculation) {
        const tree = await calculateDependencyTree(
          selectedItem,
          itemCount,
          selectedRecipe,
          recipeSelections
        );
        const accumulated = calculateAccumulatedFromTree(tree);
        dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
        
        // Update last calculated state
        setLastCalculated({
          item: selectedItem,
          recipe: selectedRecipe,
          count: itemCount
        });
      }
    }
  };

  const handleTreeRecipeChange = async (nodeId: string, recipeId: string) => {
    const affectedBranches = dependencies.dependencyTree 
      ? findAffectedBranches(dependencies.dependencyTree, nodeId)
      : [];
    
    const updatedRecipeSelections = {
      ...recipeSelections,
      [nodeId]: recipeId
    };
    
    dispatch(setRecipeSelection({ nodeId, recipeId }));

    if (selectedItem && selectedRecipe) {
      const tree = await calculateDependencyTree(
        selectedItem, 
        itemCount, 
        selectedRecipe, 
        updatedRecipeSelections,
        0,
        affectedBranches
      );
      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));

      setLastCalculated({
        item: selectedItem,
        recipe: selectedRecipe,
        count: itemCount
      });
    }
  };

  const handleExcessChange = async (nodeId: string, excess: number) => {
    const newExcessMap = { ...excessMap, [nodeId]: excess };
    setExcessMap(newExcessMap);

    if (selectedItem && selectedRecipe) {
      const tree = await calculateDependencyTree(
        selectedItem,
        itemCount,
        selectedRecipe,
        recipeSelections,
        0,
        [], // No affected branches needed
        '',
        newExcessMap
      );
      const accumulated = calculateAccumulatedFromTree(tree);
      dispatch(setDependencies({ item: selectedItem, count: itemCount, tree, accumulated }));
    }
  };

  return (
    <div className="container" >
      <div style={{
        padding: '12px',
        background: theme.colors.dark,
        borderRadius: theme.border.radius,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left group: Production controls */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            flexWrap: 'wrap',
            flex: '1'
          }}>
            <StyledSelect
              value={selectedItem}
              onChange={setSelectedItem}
              options={items}
              placeholder="Select an Item"
              style={{ minWidth: '250px', maxWidth: '300px', flex: '1' }}
              renderOption={(option) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon itemId={option.id} size="small" showWrapper={false} style={{ backgroundColor: theme.colors.dark }} />
                  {option.name}
                </div>
              )}
            />
            {filteredRecipes.length > 0 && (
              <StyledSelect
                value={selectedRecipe}
                onChange={setSelectedRecipe}
                options={filteredRecipes}
                placeholder="Select a Recipe"
                style={{ minWidth: '250px', maxWidth: '300px', flex: '1' }}
              />
            )}
            <StyledInput
              type="number"
              min="1"
              value={itemCount}
              onChange={(e) => setItemCount(Number(e.target.value))}
              placeholder="Count"
              style={{ width: '120px' }}
            />
          </div>

          {/* Right group: Calculate button and view toggle */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            flexShrink: 0
          }}>
            <button
              onClick={handleCalculate}
              style={{
                height: '32px',
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
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.buttonDefault}
            >
              Calculate
            </button>
            <ViewModeSwitch
              mode={viewMode === "tree" ? "tree" : "list"}
              onToggle={(mode) => setViewMode(mode === "list" ? "accumulated" : "tree")}
            />
          </div>
        </div>
      </div>

      {Object.keys(dependencies.accumulatedDependencies || {}).length > 0 && (
        <div style={{ ...dependencyStyles.listContainer, display: viewMode === "accumulated" ? "block" : "none" }}>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {dependencies.selectedItem && (
              <li style={{ marginBottom: "8px" }}>
                <ItemNode
                  itemId={dependencies.selectedItem}
                  amount={dependencies.itemCount}
                  isRoot={true}
                  index={0}
                />
              </li>
            )}
            {Object.entries(dependencies.accumulatedDependencies).map(([item, amount], index) => (
              <li key={item} style={{ marginBottom: "8px" }}>
                <ItemNode
                  itemId={item}
                  amount={amount}
                  isByproduct={amount < 0}
                  index={index + 1}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dependencies.dependencyTree && (
        <div style={{ 
          ...dependencyStyles.listContainer, 
          display: viewMode === "tree" ? "block" : "none"
        }}>
          <DependencyTree 
            dependencyTree={dependencies.dependencyTree}
            onRecipeChange={handleTreeRecipeChange}
            onExcessChange={handleExcessChange}
            excessMap={excessMap}
          />
        </div>
      )}
    </div>
  );
};

export default DependencyTester;
