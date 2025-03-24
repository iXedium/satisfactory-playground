import React, { forwardRef, ForwardRefRenderFunction, useState, useRef } from "react";
import { Item } from "../data/dexieDB";
import SearchSection from "./shared/SearchSection";
import ActionButtons from "./shared/ActionButtons";
import ViewOptionsPanel from "./shared/ViewOptionsPanel";
import SettingsPanel from "./shared/SettingsPanel";
import ViewModeToggle from "./shared/ViewModeToggle";

type ViewMode = "accumulated" | "tree";

interface CommandBarProps {
  items: Item[];
  selectedItem: string;
  onItemSelect: (itemId: string) => void;
  selectedRecipe: string;
  onRecipeSelect: (recipeId: string) => void;
  onCalculate: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExpandCollapseAll: (expand: boolean) => void;
  showExtensions: boolean;
  onShowExtensionsChange: (show: boolean) => void;
  accumulateExtensions: boolean;
  onAccumulateExtensionsChange: (accumulate: boolean) => void;
  showMachines: boolean;
  onShowMachinesChange: (show: boolean) => void;
  showMachineMultiplier: boolean;
  onShowMachineMultiplierChange: (show: boolean) => void;
  isAddItemCollapsed: boolean;
  onAddItemCollapsedChange: (collapsed: boolean) => void;
  onClearSavedData: () => void;
}

/**
 * The refactored command bar component that uses smaller shared components
 */
const RefactoredCommandBar: ForwardRefRenderFunction<HTMLDivElement, CommandBarProps> = (
  {
    items,
    selectedItem,
    onItemSelect,
    selectedRecipe,
    onRecipeSelect,
    onCalculate,
    viewMode,
    onViewModeChange,
    onExpandCollapseAll,
    showExtensions,
    onShowExtensionsChange,
    accumulateExtensions,
    onAccumulateExtensionsChange,
    showMachines,
    onShowMachinesChange,
    showMachineMultiplier,
    onShowMachineMultiplierChange,
    isAddItemCollapsed,
    onAddItemCollapsedChange,
    onClearSavedData
  },
  ref
) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [compactView, setCompactView] = useState(false);
  const [selectedDepth, setSelectedDepth] = useState("0");

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "8px",
        backgroundColor: "#1a1e24", // Using theme color from the original
        borderBottom: "1px solid #4a5664", // Using theme color from the original
      }}
    >
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <SearchSection
          items={items}
          selectedItem={selectedItem}
          onItemSelect={onItemSelect}
          selectedRecipe={selectedRecipe}
          onRecipeSelect={onRecipeSelect}
          onCalculate={onCalculate}
          isCollapsed={isAddItemCollapsed}
          containerStyle={{}}
        />
        
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          <ActionButtons
            viewMode={viewMode}
            onExpandCollapseAll={onExpandCollapseAll}
            onClearSavedData={onClearSavedData}
          />
          
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
          
          <ViewOptionsPanel
            compactView={compactView}
            onCompactViewChange={setCompactView}
            selectedDepth={selectedDepth}
            onDepthChange={setSelectedDepth}
            containerStyle={{}}
          />
          
          <button 
            ref={settingsButtonRef}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ⚙️ Settings
          </button>
          
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            buttonRef={settingsButtonRef as React.RefObject<HTMLButtonElement>}
            showExtensions={showExtensions}
            onShowExtensionsChange={onShowExtensionsChange}
            accumulateExtensions={accumulateExtensions}
            onAccumulateExtensionsChange={onAccumulateExtensionsChange}
            showMachines={showMachines}
            onShowMachinesChange={onShowMachinesChange}
            showMachineMultiplier={showMachineMultiplier}
            onShowMachineMultiplierChange={onShowMachineMultiplierChange}
            compactView={compactView}
            onCompactViewChange={setCompactView}
          />
        </div>
      </div>
    </div>
  );
};

export default forwardRef(RefactoredCommandBar); 