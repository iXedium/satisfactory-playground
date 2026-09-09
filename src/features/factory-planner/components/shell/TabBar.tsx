import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store';
import { addTab, removeTab, setActiveTab, renameTab, reorderTabs } from '../../../../store/workspaceSlice';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import WorkspaceMenu from './WorkspaceMenu';
import { cleanupSingleTabState } from './workspaceHelpers';

interface TabBarProps {
  dirtyMap: Record<string, boolean>;
  linkedMap: Record<string, string | null>;
  saveNames: string[];
  onUnlinkTab: (tabId: string) => void;
  onRevertTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  activeWorkspaceName: string | null;
  onSaveWorkspace: (name: string) => Promise<boolean>;
  onLoadWorkspace: (name: string) => Promise<boolean>;
  onDeleteWorkspace: (name: string) => Promise<boolean>;
  onNewWorkspace: () => void;
  getWorkspaceNames: () => Promise<string[]>;
}

const TabBar: React.FC<TabBarProps> = ({
  dirtyMap,
  linkedMap,
  saveNames,
  onUnlinkTab,
  onRevertTab,
  onDuplicateTab,
  onCloseOtherTabs,
  activeWorkspaceName,
  onSaveWorkspace,
  onLoadWorkspace,
  onDeleteWorkspace,
  onNewWorkspace,
  getWorkspaceNames,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((state: RootState) => state.workspace.tabs);
  const activeTabId = useSelector((state: RootState) => state.workspace.activeTabId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [nameConflict, setNameConflict] = useState(false);
  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);
  const [confirmRevertTabId, setConfirmRevertTabId] = useState<string | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [hoveredCloseTabId, setHoveredCloseTabId] = useState<string | null>(null);
  const [hoveredDuplicateTabId, setHoveredDuplicateTabId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const [unlinkClickTimers, setUnlinkClickTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(tabs);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    dispatch(reorderTabs(reordered));
  };

  useEffect(() => {
    if (!confirmCloseTabId && !confirmRevertTabId) return;
    const handleOutside = () => {
      setConfirmCloseTabId(null);
      setConfirmRevertTabId(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmCloseTabId(null);
        setConfirmRevertTabId(null);
      }
    };
    window.addEventListener('click', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [confirmCloseTabId, confirmRevertTabId]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleOutside = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const handleScroll = () => setContextMenu(null);
    window.addEventListener('click', handleOutside);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('wheel', handleScroll);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('wheel', handleScroll);
    };
  }, [contextMenu]);

  const handleAddTab = () => {
    dispatch(addTab());
  };

  const handleCloseTab = (tabId: string) => {
    cleanupSingleTabState(tabId);
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
    <>
      <style>{`
        .tab-bar-scroll-container::-webkit-scrollbar {
          height: 3px;
        }
        .tab-bar-scroll-container::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 2px;
        }
        .tab-bar-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1e1e1e',
          borderBottom: '1px solid #333',
          padding: '0 8px',
          height: '38px',
          minHeight: '38px',
          maxHeight: '38px',
          gap: '8px',
          boxSizing: 'border-box',
        }}
      >
        <div
          ref={tabsScrollRef}
          className="tab-bar-scroll-container"
          style={{
            flex: 1,
            minWidth: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            scrollbarWidth: 'thin',
            scrollbarColor: '#444 transparent',
          }}
        >
          <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tab-bar" direction="horizontal">
            {(providedDroppable) => (
              <div
                ref={providedDroppable.innerRef}
                {...providedDroppable.droppableProps}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  flexWrap: 'nowrap',
                  height: '100%',
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
                      onContextMenu={(e) => {
                        if (editingTabId !== null) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const x = Math.min(e.clientX, window.innerWidth - 180);
                        const y = Math.min(e.clientY, window.innerHeight - 180);
                        setContextMenu({ tabId: tab.tabId, x, y });
                      }}
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
                        ...providedDraggable.draggableProps.style,
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
            ) : confirmRevertTabId === tab.tabId ? (
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
                <span>Revert?</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevertTab(tab.tabId);
                    setConfirmRevertTabId(null);
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
                    setConfirmRevertTabId(null);
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
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateTab(tab.tabId);
                  }}
                  onMouseEnter={() => setHoveredDuplicateTabId(tab.tabId)}
                  onMouseLeave={() => setHoveredDuplicateTabId(null)}
                  style={{
                    padding: '2px 3px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: hoveredDuplicateTabId === tab.tabId ? '#fff' : '#777',
                    background: hoveredDuplicateTabId === tab.tabId ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    opacity: (isHovered || isSelected) ? 1 : 0,
                    transition: 'opacity 0.15s ease, color 0.15s ease, background 0.15s ease',
                  }}
                  title="Duplicate tab"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </span>
                {tabs.length > 1 && (
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
                      marginLeft: '2px',
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
              </span>
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
                marginBottom: '4px',
              }}
              title="Add new tab"
            >+</button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
          {showWarning && (
            <span
              style={{
                color: '#ff9f43',
                fontSize: '11px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                background: 'rgba(255, 159, 67, 0.12)',
                border: '1px solid rgba(255, 159, 67, 0.3)',
                borderRadius: '3px',
                padding: '3px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none',
              }}
              title={`${tabs.length} tabs open`}
            >
              <span>⚠</span>
              <span>{tabs.length} tabs</span>
            </span>
          )}
          <WorkspaceMenu
            activeWorkspaceName={activeWorkspaceName}
            dirtyMap={dirtyMap}
            tabs={tabs}
            onSaveWorkspace={onSaveWorkspace}
            onLoadWorkspace={onLoadWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            onNewWorkspace={onNewWorkspace}
            getWorkspaceNames={getWorkspaceNames}
          />
        </div>
      </div>
    {contextMenu && (() => {
      const targetTab = tabs.find(t => t.tabId === contextMenu.tabId);
      if (!targetTab) return null;
      const isLinked = linkedMap[targetTab.tabId] !== null && linkedMap[targetTab.tabId] !== undefined;

      return (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: '#252526',
            border: '1px solid #454545',
            borderRadius: '5px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            minWidth: '160px',
            padding: '4px 0',
            color: '#ccc',
            fontSize: '12px',
            userSelect: 'none',
          }}
        >
          {/* Duplicate Tab */}
          <div
            onClick={() => {
              onDuplicateTab(targetTab.tabId);
              setContextMenu(null);
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#094771')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Duplicate Tab</span>
          </div>

          {/* Rename Tab */}
          <div
            onClick={() => {
              if (isLinked) return;
              handleDoubleClick(targetTab.tabId, targetTab.name);
              setContextMenu(null);
            }}
            onMouseEnter={(e) => {
              if (!isLinked) e.currentTarget.style.background = '#094771';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            style={{
              padding: '6px 12px',
              cursor: isLinked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: isLinked ? '#666' : '#fff',
            }}
            title={isLinked ? 'Unlink to rename' : undefined}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            <span>Rename Tab</span>
          </div>

          {/* Unlink Setup (when linked) */}
          {isLinked && (
            <div
              onClick={() => {
                onUnlinkTab(targetTab.tabId);
                setContextMenu(null);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#094771')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ff9f43',
              }}
            >
              <span style={{ fontSize: '13px' }}>🔗</span>
              <span>Unlink Setup</span>
            </div>
          )}

          {/* Revert Tab Changes (when linked) */}
          {isLinked && (
            <div
              onClick={() => {
                setConfirmRevertTabId(targetTab.tabId);
                setContextMenu(null);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#721c24')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ff6b6b',
              }}
              title="Discard changes and reload saved setup"
            >
              <span style={{ fontSize: '13px' }}>↺</span>
              <span>Revert Changes</span>
            </div>
          )}

          {tabs.length > 1 && (
            <>
              <div style={{ height: '1px', background: '#383838', margin: '4px 0' }} />

              {/* Close Tab */}
              <div
                onClick={() => {
                  requestCloseTab(targetTab.tabId);
                  setContextMenu(null);
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#721c24')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ff6b6b',
                }}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
                <span>Close Tab</span>
              </div>

              {/* Close Other Tabs */}
              <div
                onClick={() => {
                  onCloseOtherTabs(targetTab.tabId);
                  setContextMenu(null);
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#721c24')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ff6b6b',
                }}
              >
                <span style={{ fontSize: '12px' }}>⨂</span>
                <span>Close Other Tabs</span>
              </div>
            </>
          )}
        </div>
      );
    })()}
    </>
  );
};

export default TabBar;
