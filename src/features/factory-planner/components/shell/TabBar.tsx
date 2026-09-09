import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store';
import { addTab, removeTab, setActiveTab, renameTab, reorderTabs } from '../../../../store/workspaceSlice';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface TabBarProps {
  dirtyMap: Record<string, boolean>;
  linkedMap: Record<string, string | null>;
  saveNames: string[];
  onUnlinkTab: (tabId: string) => void;
}

function getDraggableTabStyle(
  style: React.CSSProperties | undefined,
  isDragging: boolean
): React.CSSProperties | undefined {
  if (!style) return style;
  if (!isDragging || !style.transform) return style;

  // Lock Y-axis movement to 0px so the dragged tab stays strictly inside the tab switcher bar
  const transform = style.transform
    .replace(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/g, 'translate($1px, 0px)')
    .replace(/translate3d\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*,\s*([^)]+)\)/g, 'translate3d($1px, 0px, $3)');

  return {
    ...style,
    transform,
  };
}

const TabBar: React.FC<TabBarProps> = ({ dirtyMap, linkedMap, saveNames, onUnlinkTab }) => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((state: RootState) => state.workspace.tabs);
  const activeTabId = useSelector((state: RootState) => state.workspace.activeTabId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [nameConflict, setNameConflict] = useState(false);
  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [hoveredCloseTabId, setHoveredCloseTabId] = useState<string | null>(null);
  const [unlinkClickTimers, setUnlinkClickTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(tabs);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    dispatch(reorderTabs(reordered));
  };

  useEffect(() => {
    if (!confirmCloseTabId) return;
    const handleOutside = () => setConfirmCloseTabId(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmCloseTabId(null);
    };
    window.addEventListener('click', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [confirmCloseTabId]);

  const handleAddTab = () => {
    dispatch(addTab());
  };

  const handleCloseTab = (tabId: string) => {
    dispatch(removeTab(tabId));
  };

  const requestCloseTab = (tabId: string) => {
    const isLinked = linkedMap[tabId] !== null && linkedMap[tabId] !== undefined;
    const isDirty = !!dirtyMap[tabId];
    if (isLinked && isDirty) {
      setConfirmCloseTabId(tabId);
      return;
    }
    handleCloseTab(tabId);
  };

  const handleSelectTab = (tabId: string) => {
    dispatch(setActiveTab(tabId));
  };

  const handleDoubleClick = (tabId: string, currentName: string) => {
    const isLinked = linkedMap[tabId] !== null && linkedMap[tabId] !== undefined;
    if (isLinked) return;
    setEditingTabId(tabId);
    setEditName(currentName);
    setNameConflict(false);
  };

  const handleRenameSubmit = () => {
    if (!editingTabId || !editName.trim()) {
      setEditingTabId(null);
      return;
    }

    const trimmed = editName.trim();
    const isConflict = saveNames.some(
      n => n.toLowerCase() === trimmed.toLowerCase()
    );

    if (isConflict) {
      setNameConflict(true);
      return;
    }

    dispatch(renameTab({ tabId: editingTabId, name: trimmed }));
    setEditingTabId(null);
    setNameConflict(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setEditingTabId(null);
      setNameConflict(false);
    }
  };

  const handleLinkIconClick = (tabId: string) => {
    handleSelectTab(tabId);
    const existing = unlinkClickTimers[tabId];
    if (existing) {
      clearTimeout(existing);
      const next = { ...unlinkClickTimers };
      delete next[tabId];
      setUnlinkClickTimers(next);
      onUnlinkTab(tabId);
      return;
    }
    const timer = setTimeout(() => {
      setUnlinkClickTimers(prev => {
        const next = { ...prev };
        delete next[tabId];
        return next;
      });
    }, 300);
    setUnlinkClickTimers(prev => ({ ...prev, [tabId]: timer }));
  };

  const showWarning = tabs.length >= 10;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="tab-bar" direction="horizontal">
        {(providedDroppable) => (
          <div
            ref={providedDroppable.innerRef}
            {...providedDroppable.droppableProps}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#1e1e1e',
              borderBottom: '1px solid #333',
              padding: '4px 8px 0',
              gap: '2px',
              flexWrap: 'wrap',
            }}
          >
            {tabs.map((tab, index) => {
              const isLinked = linkedMap[tab.tabId] !== null && linkedMap[tab.tabId] !== undefined;
              const isSelected = tab.tabId === activeTabId;
              const isHovered = hoveredTabId === tab.tabId && !isSelected;

              return (
                <Draggable
                  key={tab.tabId}
                  draggableId={tab.tabId}
                  index={index}
                  isDragDisabled={editingTabId !== null}
                >
                  {(providedDraggable, snapshot) => (
                    <div
                      ref={providedDraggable.innerRef}
                      {...providedDraggable.draggableProps}
                      {...providedDraggable.dragHandleProps}
                      onClick={() => handleSelectTab(tab.tabId)}
                      onMouseEnter={() => setHoveredTabId(tab.tabId)}
                      onMouseLeave={() => setHoveredTabId(null)}
                      onMouseDown={(e) => {
                        if (e.button === 1) {
                          e.preventDefault();
                          e.stopPropagation();
                          if (tabs.length > 1) {
                            if (editingTabId === tab.tabId) {
                              setEditingTabId(null);
                              setNameConflict(false);
                            } else {
                              requestCloseTab(tab.tabId);
                            }
                          }
                        }
                      }}
                      onDoubleClick={() => handleDoubleClick(tab.tabId, tab.name)}
                      title={
                        isLinked && editingTabId !== tab.tabId
                          ? 'Unlink to rename'
                          : undefined
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: isSelected
                          ? '#2d2d2d'
                          : snapshot.isDragging
                          ? '#383838'
                          : isHovered
                          ? '#242424'
                          : 'transparent',
                        borderTop: isSelected ? '1px solid #444' : isHovered ? '1px solid #333' : '1px solid transparent',
                        borderLeft: isSelected ? '1px solid #444' : isHovered ? '1px solid #333' : '1px solid transparent',
                        borderRight: isSelected ? '1px solid #444' : isHovered ? '1px solid #333' : '1px solid transparent',
                        borderBottom: 'none',
                        borderRadius: '4px 4px 0 0',
                        cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
                        color: isSelected ? '#fff' : isHovered ? '#e2e2e2' : '#aaa',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.5)' : undefined,
                        zIndex: snapshot.isDragging ? 100 : undefined,
                        transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        ...getDraggableTabStyle(providedDraggable.draggableProps.style, snapshot.isDragging),
                      }}
                    >
            {dirtyMap[tab.tabId] && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff9f43', flexShrink: 0 }} />
            )}
            {isLinked && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkIconClick(tab.tabId);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                }}
                title={`Linked to: ${linkedMap[tab.tabId]}`}
                style={{
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: 0.8,
                  userSelect: 'none',
                }}
              >🔗</span>
            )}
            {editingTabId === tab.tabId ? (
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <input
                  value={editName}
                  onChange={e => {
                    setEditName(e.target.value);
                    setNameConflict(false);
                  }}
                  onKeyDown={handleRenameKeyDown}
                  autoFocus
                  onFocus={e => e.target.select()}
                  ref={el => el?.select()}
                  style={{
                    background: '#3d3d3d',
                    border: `1px solid ${nameConflict ? '#ff6b6b' : '#555'}`,
                    color: '#fff',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '13px',
                    width: '120px',
                  }}
                  onClick={e => e.stopPropagation()}
                />
                {nameConflict && (
                  <span style={{
                    color: '#ff6b6b',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                  }}>
                    This name is already a saved setup.
                  </span>
                )}
              </span>
            ) : (
              <span>{tab.name}</span>
            )}
            {confirmCloseTabId === tab.tabId ? (
              <span
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#3a1e1e',
                  border: '1px solid #ff6b6b',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontSize: '11px',
                  color: '#fff',
                  marginLeft: '4px',
                  zIndex: 10,
                }}
              >
                <span>Unsaved! Close?</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.tabId);
                    setConfirmCloseTabId(null);
                  }}
                  style={{
                    background: '#e74c3c',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '2px',
                    padding: '0 4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmCloseTabId(null);
                  }}
                  style={{
                    background: '#555',
                    border: 'none',
                    color: '#ccc',
                    borderRadius: '2px',
                    padding: '0 4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  No
                </button>
              </span>
            ) : tabs.length > 1 && (
              <span
                onClick={e => {
                  e.stopPropagation();
                  if (editingTabId === tab.tabId) {
                    setEditingTabId(null);
                    setNameConflict(false);
                    return;
                  }
                  requestCloseTab(tab.tabId);
                }}
                onMouseEnter={() => setHoveredCloseTabId(tab.tabId)}
                onMouseLeave={() => setHoveredCloseTabId(null)}
                style={{
                  marginLeft: '4px',
                  fontSize: '14px',
                  color: hoveredCloseTabId === tab.tabId ? '#ff6b6b' : '#666',
                  background: hoveredCloseTabId === tab.tabId ? 'rgba(255, 107, 107, 0.18)' : 'transparent',
                  borderRadius: '3px',
                  padding: '0 3px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                title={editingTabId === tab.tabId ? "Cancel rename (Esc)" : "Close tab"}
              >×</span>
            )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {providedDroppable.placeholder}
            <button
              onClick={handleAddTab}
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                color: '#888',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '2px 8px',
                borderRadius: '4px',
                lineHeight: 1,
              }}
              title="Add new tab"
            >+</button>
            {showWarning && (
              <span style={{
                marginLeft: '8px',
                color: '#ff9f43',
                fontSize: '12px',
              }}>
                ⚠ {tabs.length} tabs open
              </span>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default TabBar;
