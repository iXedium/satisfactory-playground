import React, { useState, useEffect, useRef, useCallback } from 'react';

interface WorkspaceMenuProps {
  activeWorkspaceName: string | null;
  dirtyMap: Record<string, boolean>;
  onSaveWorkspace: (name: string) => Promise<boolean>;
  onLoadWorkspace: (name: string) => Promise<boolean>;
  onDeleteWorkspace: (name: string) => Promise<boolean>;
  onNewWorkspace: () => void;
  getWorkspaceNames: () => Promise<string[]>;
}

const WorkspaceMenu: React.FC<WorkspaceMenuProps> = ({
  activeWorkspaceName,
  dirtyMap,
  onSaveWorkspace,
  onLoadWorkspace,
  onDeleteWorkspace,
  onNewWorkspace,
  getWorkspaceNames,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [workspaceNames, setWorkspaceNames] = useState<string[]>([]);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveInputName, setSaveInputName] = useState('');
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [confirmPendingLoadName, setConfirmPendingLoadName] = useState<string | null>(null);
  const [confirmNewWorkspace, setConfirmNewWorkspace] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  const isAnyTabDirty = Object.values(dirtyMap).some(Boolean);

  const refreshNames = useCallback(async () => {
    setIsLoadingNames(true);
    try {
      const names = await getWorkspaceNames();
      setWorkspaceNames(names);
    } finally {
      setIsLoadingNames(false);
    }
  }, [getWorkspaceNames]);

  useEffect(() => {
    if (isOpen) {
      refreshNames();
    }
  }, [isOpen, refreshNames]);

  // Click outside and ESC handling
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setConfirmDeleteName(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSaveDialog) {
          setShowSaveDialog(false);
        } else if (confirmPendingLoadName) {
          setConfirmPendingLoadName(null);
        } else if (confirmNewWorkspace) {
          setConfirmNewWorkspace(false);
        } else if (isOpen) {
          setIsOpen(false);
          setConfirmDeleteName(null);
        }
      }
    };

    if (isOpen || showSaveDialog || confirmPendingLoadName || confirmNewWorkspace) {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showSaveDialog, confirmPendingLoadName, confirmNewWorkspace]);

  // Auto focus input when save dialog opens
  useEffect(() => {
    if (showSaveDialog) {
      setTimeout(() => {
        saveInputRef.current?.focus();
        saveInputRef.current?.select();
      }, 50);
    }
  }, [showSaveDialog]);

  const handleOpenSaveDialog = () => {
    setSaveInputName(activeWorkspaceName || '');
    setShowSaveDialog(true);
    setIsOpen(false);
  };

  const handleDirectSave = async () => {
    if (activeWorkspaceName) {
      const success = await onSaveWorkspace(activeWorkspaceName);
      if (success) {
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(null), 2000);
        refreshNames();
      } else {
        setSaveStatus('Failed');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } else {
      handleOpenSaveDialog();
    }
  };

  const handleConfirmSaveDialog = async () => {
    const trimmed = saveInputName.trim();
    if (!trimmed) return;

    const success = await onSaveWorkspace(trimmed);
    if (success) {
      setShowSaveDialog(false);
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(null), 2000);
      refreshNames();
    }
  };

  const handleSelectWorkspaceToLoad = async (name: string) => {
    if (isAnyTabDirty) {
      setConfirmPendingLoadName(name);
      setIsOpen(false);
      return;
    }

    await onLoadWorkspace(name);
    setIsOpen(false);
  };

  const handleConfirmLoad = async () => {
    if (confirmPendingLoadName) {
      await onLoadWorkspace(confirmPendingLoadName);
      setConfirmPendingLoadName(null);
    }
  };

  const handleNewWorkspaceClick = () => {
    if (isAnyTabDirty) {
      setConfirmNewWorkspace(true);
      setIsOpen(false);
      return;
    }
    onNewWorkspace();
    setIsOpen(false);
  };

  const handleConfirmNewWorkspace = () => {
    onNewWorkspace();
    setConfirmNewWorkspace(false);
  };

  const handleDeleteClick = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteName(name);
  };

  const handleConfirmDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDeleteWorkspace(name);
    setConfirmDeleteName(null);
    refreshNames();
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteName(null);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Workspace Menu Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isOpen ? '#2d2d2d' : '#222',
          border: '1px solid #444',
          borderRadius: '4px',
          padding: '4px 10px',
          color: isAnyTabDirty ? '#ffc107' : '#ccc',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#2e2e2e';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = '#666';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isOpen ? '#2d2d2d' : '#222';
          e.currentTarget.style.color = isAnyTabDirty ? '#ffc107' : '#ccc';
          e.currentTarget.style.borderColor = '#444';
        }}
        title={activeWorkspaceName ? `Active Workspace: ${activeWorkspaceName}${isAnyTabDirty ? ' (Modified)' : ''}` : 'Manage Workspaces'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeWorkspaceName ? activeWorkspaceName : 'Workspaces'}
        </span>
        {isAnyTabDirty && (
          <span style={{ color: '#ffc107', fontWeight: 'bold' }} title="Workspace has unsaved changes">●</span>
        )}
        {saveStatus && (
          <span style={{
            fontSize: '11px',
            color: saveStatus === 'Saved!' ? '#4caf50' : '#f44336',
            marginLeft: '2px',
            fontWeight: 'bold',
          }}>
            {saveStatus}
          </span>
        )}
        <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.7 }}>▾</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            background: '#252526',
            border: '1px solid #454545',
            borderRadius: '5px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            minWidth: '240px',
            maxWidth: '320px',
            color: '#ccc',
            fontSize: '12px',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '8px 12px',
            background: '#1f1f1f',
            borderBottom: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888' }}>
              Current Workspace
            </div>
            <div style={{
              fontWeight: 600,
              color: '#fff',
              fontSize: '13px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {activeWorkspaceName || 'Unsaved Workspace'}
              {isAnyTabDirty && <span style={{ color: '#ffc107', marginLeft: '4px' }}>*</span>}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '4px 0' }}>
            <div
              onClick={() => {
                handleDirectSave();
                if (activeWorkspaceName) setIsOpen(false);
              }}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#094771')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '13px' }}>💾</span>
              <span>{activeWorkspaceName ? `Save "${activeWorkspaceName}"` : 'Save Workspace...'}</span>
            </div>

            <div
              onClick={handleOpenSaveDialog}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#094771')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '13px' }}>💾</span>
              <span>Save Workspace As...</span>
            </div>

            <div
              onClick={handleNewWorkspaceClick}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#094771')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '13px' }}>➕</span>
              <span>New Blank Workspace</span>
            </div>
          </div>

          <div style={{ height: '1px', background: '#383838', margin: '2px 0' }} />

          {/* Saved Workspaces List */}
          <div style={{ padding: '4px 0', maxHeight: '220px', overflowY: 'auto' }}>
            <div style={{
              padding: '4px 12px 2px',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#888',
            }}>
              Saved Workspaces ({workspaceNames.length})
            </div>

            {isLoadingNames ? (
              <div style={{ padding: '8px 12px', color: '#666', fontStyle: 'italic' }}>
                Loading...
              </div>
            ) : workspaceNames.length === 0 ? (
              <div style={{ padding: '8px 12px', color: '#666', fontStyle: 'italic' }}>
                No saved workspaces yet
              </div>
            ) : (
              workspaceNames.map(name => {
                const isActive = name === activeWorkspaceName;
                const isConfirmingDelete = confirmDeleteName === name;

                return (
                  <div
                    key={name}
                    onClick={() => handleSelectWorkspaceToLoad(name)}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isActive ? '#1c364e' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#2f2f30';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                    title={`Load workspace "${name}"`}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      <span style={{ fontSize: '13px' }}>📁</span>
                      <span style={{
                        color: isActive ? '#fff' : '#ccc',
                        fontWeight: isActive ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {name}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize: '10px',
                          background: '#094771',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          color: '#fff',
                        }}>
                          current
                        </span>
                      )}
                    </div>

                    {/* Delete action */}
                    {isConfirmingDelete ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: '8px',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#ff6b6b' }}>Delete?</span>
                        <button
                          onClick={(e) => handleConfirmDelete(name, e)}
                          style={{
                            background: '#e74c3c',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '2px',
                            padding: '1px 5px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          style={{
                            background: '#555',
                            border: 'none',
                            color: '#ccc',
                            borderRadius: '2px',
                            padding: '1px 5px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteClick(name, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#777',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ff6b6b';
                          e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#777';
                          e.currentTarget.style.background = 'none';
                        }}
                        title={`Delete workspace "${name}"`}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Save Workspace Dialog Modal */}
      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#252526',
              border: '1px solid #454545',
              borderRadius: '6px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
              width: '380px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#fff',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 600 }}>
              Save Workspace
            </div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>
              Save all open tabs, their configurations, and compare snapshots under this workspace name:
            </div>

            <input
              ref={saveInputRef}
              type="text"
              value={saveInputName}
              onChange={(e) => setSaveInputName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmSaveDialog();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              placeholder="e.g. My Mega Factory"
              style={{
                background: '#1e1e1e',
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '8px 10px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
            />

            {workspaceNames.includes(saveInputName.trim()) && (
              <div style={{ color: '#ff9f43', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>⚠</span>
                <span>Workspace "{saveInputName.trim()}" already exists and will be overwritten.</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  background: '#3a3a3a',
                  border: '1px solid #555',
                  color: '#ccc',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveDialog}
                disabled={!saveInputName.trim()}
                style={{
                  background: saveInputName.trim() ? '#007acc' : '#334455',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: saveInputName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Loading Workspace with unsaved changes */}
      {confirmPendingLoadName && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setConfirmPendingLoadName(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#252526',
              border: '1px solid #454545',
              borderRadius: '6px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
              width: '380px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#fff',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffc107', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠</span>
              <span>Unsaved Changes Warning</span>
            </div>
            <div style={{ fontSize: '12px', color: '#ccc', lineHeight: 1.5 }}>
              You have unsaved changes in your currently open tabs. Loading workspace <strong>"{confirmPendingLoadName}"</strong> will replace all open tabs.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => setConfirmPendingLoadName(null)}
                style={{
                  background: '#3a3a3a',
                  border: '1px solid #555',
                  color: '#ccc',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLoad}
                style={{
                  background: '#e74c3c',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Load Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: New Workspace with unsaved changes */}
      {confirmNewWorkspace && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setConfirmNewWorkspace(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#252526',
              border: '1px solid #454545',
              borderRadius: '6px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
              width: '380px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#fff',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffc107', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠</span>
              <span>New Blank Workspace</span>
            </div>
            <div style={{ fontSize: '12px', color: '#ccc', lineHeight: 1.5 }}>
              You have unsaved changes in your currently open tabs. Resetting to a blank workspace will close all open tabs.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => setConfirmNewWorkspace(false)}
                style={{
                  background: '#3a3a3a',
                  border: '1px solid #555',
                  color: '#ccc',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewWorkspace}
                style={{
                  background: '#e74c3c',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceMenu;
