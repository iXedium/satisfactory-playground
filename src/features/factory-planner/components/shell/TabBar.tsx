import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store';
import { addTab, removeTab, setActiveTab, renameTab } from '../../../../store/workspaceSlice';

interface TabBarProps {
  dirtyMap: Record<string, boolean>;
  linkedMap: Record<string, string | null>;
  saveNames: string[];
  onUnlinkTab: (tabId: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ dirtyMap, linkedMap, saveNames, onUnlinkTab }) => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((state: RootState) => state.workspace.tabs);
  const activeTabId = useSelector((state: RootState) => state.workspace.activeTabId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [nameConflict, setNameConflict] = useState(false);
  const [unlinkClickTimers, setUnlinkClickTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleAddTab = () => {
    dispatch(addTab());
  };

  const handleCloseTab = (tabId: string) => {
    dispatch(removeTab(tabId));
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#1e1e1e',
      borderBottom: '1px solid #333',
      padding: '4px 8px 0',
      gap: '2px',
      flexWrap: 'wrap',
    }}>
      {tabs.map(tab => {
        const isLinked = linkedMap[tab.tabId] !== null && linkedMap[tab.tabId] !== undefined;
        return (
          <div
            key={tab.tabId}
            onClick={() => handleSelectTab(tab.tabId)}
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
              background: tab.tabId === activeTabId ? '#2d2d2d' : 'transparent',
              borderTop: tab.tabId === activeTabId ? '1px solid #444' : '1px solid transparent',
              borderLeft: tab.tabId === activeTabId ? '1px solid #444' : '1px solid transparent',
              borderRight: tab.tabId === activeTabId ? '1px solid #444' : '1px solid transparent',
              borderBottom: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              color: '#ccc',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              userSelect: 'none',
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
            {tabs.length > 1 && (
              <span
                onClick={e => {
                  e.stopPropagation();
                  handleCloseTab(tab.tabId);
                }}
                style={{
                  marginLeft: '4px',
                  fontSize: '14px',
                  color: '#666',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                title="Close tab"
              >×</span>
            )}
          </div>
        );
      })}
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
  );
};

export default TabBar;
