import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store';
import { addTab, removeTab, setActiveTab, renameTab } from '../../../../store/workspaceSlice';

interface TabBarProps {
  dirtyMap: Record<string, boolean>;
}

const TabBar: React.FC<TabBarProps> = ({ dirtyMap }) => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((state: RootState) => state.workspace.tabs);
  const activeTabId = useSelector((state: RootState) => state.workspace.activeTabId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    setEditingTabId(tabId);
    setEditName(currentName);
  };

  const handleRenameSubmit = () => {
    if (editingTabId && editName.trim()) {
      dispatch(renameTab({ tabId: editingTabId, name: editName.trim() }));
    }
    setEditingTabId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') setEditingTabId(null);
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
      {tabs.map(tab => (
        <div
          key={tab.tabId}
          onClick={() => handleSelectTab(tab.tabId)}
          onDoubleClick={() => handleDoubleClick(tab.tabId, tab.name)}
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
          {editingTabId === tab.tabId ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              autoFocus
              style={{
                background: '#3d3d3d',
                border: '1px solid #555',
                color: '#fff',
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '13px',
                width: '100px',
              }}
              onClick={e => e.stopPropagation()}
            />
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
      ))}
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
