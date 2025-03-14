import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Item, Recipe } from "../data/dexieDB";
import { calculateDependencyTree } from "../utils/calculateDependencyTree";
import { calculateAccumulatedFromTree } from "../utils/calculateAccumulatedFromTree";
import { setDependencies } from "../features/dependencySlice";
import DependencyTree from "./DependencyTree";
import { dependencyStyles } from "../styles/dependencyStyles";
import ItemSelect from "./ItemSelect";
import RecipeSelect from "./RecipeSelect";
import { getComponents, getRecipesForItem } from "../data/dbQueries";
import ViewModeSwitch from "./ViewModeSwitch"; // new import for view mode switch
import { setRecipeSelection } from "../features/recipeSelectionsSlice";
import { findAffectedBranches } from "../utils/treeDiffing";
import ItemNode from "./ItemNode";
import { theme } from '../styles/theme';

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

  // Add new states for input focus and hover
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isInputHovered, setIsInputHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isButtonActive, setIsButtonActive] = useState(false);

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
    <div className="container">
      <div style={{
        padding: '16px',
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
          gap: '16px'
        }}>
          {/* Left group: Production controls */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'center',
            flexWrap: 'wrap',
            flex: '1'
          }}>
            <div style={{ 
              minWidth: '250px',
              maxWidth: '300px',
              flex: '1'
            }}>
              <ItemSelect
                items={items}
                value={selectedItem}
                onChange={setSelectedItem}
                placeholder="Select an Item"
              />
            </div>
            {filteredRecipes.length > 0 && (
              <div style={{ 
                minWidth: '250px',
                maxWidth: '300px',
                flex: '1'
              }}>
                <RecipeSelect
                  recipes={filteredRecipes}
                  value={selectedRecipe}
                  onChange={setSelectedRecipe}
                  placeholder="Select a Recipe"
                />
              </div>
            )}
            <input
              type="number"
              min="1"
              value={itemCount}
              onChange={(e) => setItemCount(Number(e.target.value))}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onMouseEnter={() => setIsInputHovered(true)}
              onMouseLeave={() => setIsInputHovered(false)}
              placeholder="Count"
              style={{
                width: '120px',
                height: '40px',
                textAlign: 'right',
                paddingRight: '12px',
                paddingLeft: '12px',
                border: `2px solid ${isInputFocused ? theme.colors.primary : isInputHovered ? theme.colors.dropdown.border : theme.colors.dropdown.border}`,
                borderRadius: theme.border.radius,
                background: theme.colors.dark,
                color: theme.colors.text,
                fontSize: '14px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease-in-out',
                outline: 'none'
              }}
            />
          </div>

          {/* Right group: Calculate button and view toggle */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'center',
            flexShrink: 0
          }}>
            <button
              onClick={handleCalculate}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              onMouseDown={() => setIsButtonActive(true)}
              onMouseUp={() => setIsButtonActive(false)}
              style={{
                height: '40px',
                padding: '0 24px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: theme.border.radius,
                background: isButtonHovered ? theme.colors.buttonHover : theme.colors.buttonDefault,
                color: theme.colors.text,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out',
                boxShadow: isButtonActive ? '0 2px 4px rgba(0, 0, 0, 0.2)' : isButtonHovered ? '0 3px 6px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                transform: isButtonActive ? 'translateY(0)' : isButtonHovered ? 'translateY(-1px)' : 'none'
              }}
            >
              Calculate
            </button>
            <ViewModeSwitch
              mode={viewMode === "tree" ? "tree" : "list"}
              onToggle={(mode) =>
                setViewMode(mode === "list" ? "accumulated" : "tree")
              }
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
                />
              </li>
            )}
            {Object.entries(dependencies.accumulatedDependencies).map(([item, amount]) => (
              <li key={item} style={{ marginBottom: "8px" }}>
                <ItemNode
                  itemId={item}
                  amount={amount}
                  isByproduct={amount < 0}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dependencies.dependencyTree && (
        <div style={{ display: viewMode === "tree" ? "block" : "none", width: "100%", marginTop: "16px" }}>
          <div style={{ ...dependencyStyles.listContainer }}>
            <DependencyTree 
              dependencyTree={dependencies.dependencyTree}
              onRecipeChange={handleTreeRecipeChange}
              onExcessChange={handleExcessChange}
              excessMap={excessMap}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyTester;
