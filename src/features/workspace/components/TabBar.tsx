import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { setActiveTab, removeTab, renameTab, addTab, TabDescriptor } from '../store/workspaceSlice';
import { theme } from '../../../styles/theme';
import { sizes } from '../../../styles/constants';

const TabBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useSelector((s: RootState) => s.workspace.tabs);
  const activeTabId = useSelector((s: RootState) => s.workspace.activeTabId);
  const planners = useSelector((s: RootState) => s.planners);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddTab = useCallback(() => {
    const tabId = `tab-${Date.now()}`;
    const name = `Planner ${tabs.length + 1}`;
    dispatch(addTab({ tabId, name }));
    dispatch(setActiveTab(tabId));
  }, [dispatch, tabs.length]);

  const handleCloseTab = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    dispatch(removeTab(tabId));
  }, [dispatch]);

  const handleDoubleClick = useCallback((tabId: string, name: string) => {
    setEditingTabId(tabId);
    setEditName(name);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (editingTabId && editName.trim()) {
      dispatch(renameTab({ tabId: editingTabId, name: editName.trim() }));
    }
    setEditingTabId(null);
  }, [dispatch, editingTabId, editName]);

  return (
    <div style={containerStyle}>
      {tabs.map((tab: TabDescriptor) => {
        const isActive = tab.tabId === activeTabId;
        const isBusy = Object.keys(planners[tab.tabId]?.activeOperations ?? {}).length > 0;

        return (
          <div
            key={tab.tabId}
            onClick={() => dispatch(setActiveTab(tab.tabId))}
            onDoubleClick={() => handleDoubleClick(tab.tabId, tab.name)}
            style={{
              ...tabStyle,
              borderBottomColor: isActive ? theme.colors.primary : 'transparent',
              background: isActive ? theme.colors.dark : theme.colors.darker,
            }}
          >
            {editingTabId === tab.tabId ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setEditingTabId(null); }}
                style={inputStyle}
              />
            ) : (
              <span style={{ ...nameStyle, opacity: isBusy ? 0.6 : 1 }}>
                {isBusy ? '⟳ ' : ''}{tab.name}
              </span>
            )}
            <button
              onClick={(e) => handleCloseTab(e, tab.tabId)}
              disabled={isBusy}
              title={isBusy ? 'Calculation in progress' : 'Close tab'}
              style={{
                ...closeBtnStyle,
                opacity: isBusy ? 0.3 : 0.6,
                cursor: isBusy ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <button onClick={handleAddTab} title="New tab" style={addBtnStyle}>
        +
      </button>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  borderBottom: `1px solid ${theme.colors.border}`,
  background: theme.colors.darker,
  padding: `0 ${sizes.spacing.small}`,
  gap: '1px',
  minHeight: '36px',
};

const tabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: `4px 10px`,
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
  fontSize: sizes.fontSize.small,
  userSelect: 'none',
  color: theme.colors.text,
  borderRadius: `${theme.border.radius} ${theme.border.radius} 0 0`,
};

const nameStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
  maxWidth: '120px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '14px',
  lineHeight: 1,
  padding: 0,
  color: theme.colors.textSecondary,
};

const addBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '18px',
  lineHeight: 1,
  cursor: 'pointer',
  color: theme.colors.textSecondary,
  padding: '0 8px',
  marginLeft: '4px',
};

const inputStyle: React.CSSProperties = {
  background: theme.colors.dark,
  border: `1px solid ${theme.colors.primary}`,
  color: theme.colors.text,
  fontSize: sizes.fontSize.small,
  padding: '1px 4px',
  borderRadius: theme.border.radius,
  width: '90px',
};

export default TabBar;
